import { Router } from "express";
import { db, eq, and, or, lt, isNull, sql, usersTable, usersActivityTable } from "@workspace/db";
import { issueQuizChallenge, validateAndConsumeQuiz, MIN_QUIZ_AGE_MS } from "../lib/quiz-challenges.js";

const router = Router();

const POINTS_PER_LEVEL = 10;
// Minimum time between consecutive level completions (DB-backed, atomic).
const QUIZ_COOLDOWN_MS = 3_000; // 3 seconds — prevents double-submission only; token age enforces real quiz duration

/**
 * POST /api/quiz/start-level
 *
 * Issues a single-use, time-stamped quiz session token that the client must
 * obtain *before* displaying the quiz questions. The token is later presented
 * to /api/quiz/complete-level where its age is verified (≥ MIN_QUIZ_AGE_MS)
 * to prove that a quiz session was actually open for a realistic duration.
 */
router.post("/quiz/start-level", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db
    .select({ level: usersTable.level })
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const token = issueQuizChallenge(telegramId, user.level);
  req.log.info({ telegramId, level: user.level, minAgeMs: MIN_QUIZ_AGE_MS }, "quiz session token issued");
  res.json({ quizToken: token, level: user.level, minAgeMs: MIN_QUIZ_AGE_MS });
});

/**
 * POST /api/quiz/complete-level
 *
 * Awards points for completing a quiz level. Requires a valid quiz session
 * token (from /api/quiz/start-level) that is level-bound, single-use, and
 * at least MIN_QUIZ_AGE_MS old — proving a quiz session was open before the
 * reward was claimed. Also enforces sequential progression, a per-user
 * cooldown, and a hard MAX_LEVEL cap.
 */
router.post("/quiz/complete-level", async (req, res): Promise<void> => {
  const telegramId     = req.telegramId;
  const { levelCompleted, quizToken } = req.body as { levelCompleted?: number; quizToken?: string };

  if (!telegramId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (typeof levelCompleted !== "number" || !Number.isInteger(levelCompleted) || levelCompleted < 1) {
    res.status(400).json({ error: "levelCompleted must be a positive integer" });
    return;
  }

  if (!quizToken || typeof quizToken !== "string") {
    res.status(400).json({ error: "quizToken required" });
    return;
  }

  // Validate and immediately consume the quiz session token (single-use).
  // This proves the caller went through /api/quiz/start-level and waited
  // at least MIN_QUIZ_AGE_MS before claiming the reward.
  const ageMs = validateAndConsumeQuiz(telegramId, quizToken, levelCompleted);
  if (ageMs === null) {
    req.log.warn({ telegramId, levelCompleted }, "quiz/complete-level: invalid, expired, or too-young quiz token");
    res.status(403).json({ error: "Invalid or expired quiz session token" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (levelCompleted !== user.level) {
    res.status(409).json({
      error: "Level out of sequence",
      expected: user.level,
      received: levelCompleted,
    });
    return;
  }

  // Pre-flight cooldown check (informational — atomically re-checked below).
  const now  = Date.now();
  const last = user.lastQuizCompletedAt?.getTime() ?? 0;
  if (now - last < QUIZ_COOLDOWN_MS) {
    const waitSecs = Math.ceil((QUIZ_COOLDOWN_MS - (now - last)) / 1000);
    res.status(429).json({ error: `انتظر ${waitSecs} ثانية قبل إكمال المرحلة التالية` });
    return;
  }

  // Atomically update: re-check cooldown and level inside WHERE to prevent
  // concurrent requests from both succeeding.
  const cooldownThreshold = new Date(now - QUIZ_COOLDOWN_MS);

  const [updated] = await db
    .update(usersTable)
    .set({
      level: user.level + 1,
      loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${POINTS_PER_LEVEL}`,
      lastQuizCompletedAt: new Date(),
    })
    .where(
      and(
        eq(usersTable.telegramId, telegramId),
        eq(usersTable.level, levelCompleted),
        or(
          isNull(usersTable.lastQuizCompletedAt),
          lt(usersTable.lastQuizCompletedAt, cooldownThreshold)
        )
      )
    )
    .returning({ level: usersTable.level, loyaltyPoints: usersTable.loyaltyPoints });

  if (!updated) {
    const [cur] = await db
      .select({ lastQuizCompletedAt: usersTable.lastQuizCompletedAt, level: usersTable.level })
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId));

    if (cur && cur.level !== levelCompleted) {
      res.status(409).json({ error: "Level out of sequence", expected: cur.level, received: levelCompleted });
      return;
    }

    const waitSecs = cur?.lastQuizCompletedAt
      ? Math.ceil((QUIZ_COOLDOWN_MS - (Date.now() - cur.lastQuizCompletedAt.getTime())) / 1000)
      : 0;
    res.status(429).json({ error: `انتظر ${Math.max(0, waitSecs)} ثانية قبل إكمال المرحلة التالية` });
    return;
  }

  req.log.info({ telegramId, levelCompleted, newLevel: updated.level, quizAgeMs: ageMs }, "quiz level completed");

  // Sync current_quiz_level in users_activity (fire-and-forget, non-critical)
  const numericId = parseInt(telegramId, 10);
  if (!isNaN(numericId)) {
    db.insert(usersActivityTable)
      .values({
        telegramId:       numericId,
        username:         null,
        currentQuizLevel: updated.level,
        lastSeen:         new Date(),
      })
      .onConflictDoUpdate({
        target: usersActivityTable.telegramId,
        set: {
          currentQuizLevel: updated.level,
          lastSeen:         new Date(),
        },
      })
      .catch(() => { /* non-critical */ });
  }

  res.json({
    level: updated.level,
    loyaltyPoints: updated.loyaltyPoints,
    pointsAwarded: POINTS_PER_LEVEL,
  });
});

export default router;
