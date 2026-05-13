import { Router } from "express";
import { db, eq, sql, usersTable } from "@workspace/db";

const router = Router();

const POINTS_PER_LEVEL = 10;

/**
 * POST /api/quiz/complete-level
 * Called after the user watches a rewarded ad at the end of a quiz level.
 * Validates sequential progression: levelCompleted must equal the user's
 * current DB level, preventing skips or replays from awarding extra points.
 */
router.post("/quiz/complete-level", async (req, res): Promise<void> => {
  const telegramId = req.headers["x-telegram-id"] as string | undefined;
  const { levelCompleted } = req.body as { levelCompleted?: number };

  if (!telegramId) {
    res.status(400).json({ error: "x-telegram-id header required" });
    return;
  }

  if (typeof levelCompleted !== "number" || levelCompleted < 1) {
    res.status(400).json({ error: "levelCompleted must be a positive integer" });
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

  // Sequential guard: levelCompleted must match user's current unlocked level
  if (levelCompleted !== user.level) {
    res.status(409).json({
      error: "Level out of sequence",
      expected: user.level,
      received: levelCompleted,
    });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({
      level: user.level + 1,
      loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${POINTS_PER_LEVEL}`,
    })
    .where(eq(usersTable.telegramId, telegramId))
    .returning({
      level: usersTable.level,
      loyaltyPoints: usersTable.loyaltyPoints,
    });

  req.log.info({ telegramId, levelCompleted, newLevel: updated!.level }, "quiz level completed");

  res.json({
    level: updated!.level,
    loyaltyPoints: updated!.loyaltyPoints,
    pointsAwarded: POINTS_PER_LEVEL,
  });
});

export default router;
