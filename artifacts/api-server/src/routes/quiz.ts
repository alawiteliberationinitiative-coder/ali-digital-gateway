import { Router } from "express";
import {
  db, eq, and, or, lt, isNull, sql,
  usersTable, usersActivityTable, quizProgressTable,
} from "@workspace/db";
import { issueQuizChallenge, validateAndConsumeQuiz, MIN_QUIZ_AGE_MS } from "../lib/quiz-challenges.js";
import { QUESTION_BANK, generatePoolForStage } from "../data/questions.js";

const router = Router();

const POINTS_PER_LEVEL  = 10;
const QUIZ_COOLDOWN_MS  = 3_000;

// ── Tier system (5 stages per tier) ─────────────────────────────────────────
const TIERS = [
  { name:"مبتدئ",           icon:"🌱", color:"#9ca3af" },
  { name:"نحاسي",           icon:"⚙️",  color:"#b87333" },
  { name:"برونزي",          icon:"🛡️", color:"#cd7f32" },
  { name:"فضي",             icon:"⚔️",  color:"#a8a9ad" },
  { name:"ذهبي",            icon:"🌟", color:"#d4af37" },
  { name:"بلاتيني",         icon:"💫", color:"#e5e4e2" },
  { name:"ياقوتي",          icon:"💎", color:"#e0115f" },
  { name:"ألماسي",          icon:"✨", color:"#b9f2ff" },
  { name:"سيف البيان",      icon:"⚡", color:"#ff9500" },
  { name:"حارس الحكمة",     icon:"🔮", color:"#9b59b6" },
  { name:"لسان الحكماء",    icon:"🌊", color:"#3498db" },
  { name:"ظل الأنبياء",     icon:"🌿", color:"#27ae60" },
  { name:"نجم المعرفة",     icon:"⭐", color:"#f39c12" },
  { name:"رأس الحكماء",     icon:"🦁", color:"#e74c3c" },
  { name:"شعلة الفكر",      icon:"🔥", color:"#e67e22" },
  { name:"صوت البيان",      icon:"🎵", color:"#1abc9c" },
  { name:"ملك البيان",      icon:"👑", color:"#d4af37" },
  { name:"أمير الفلاسفة",   icon:"🦅", color:"#6c5ce7" },
  { name:"أسد البيان",      icon:"🦁", color:"#c0392b" },
  { name:"صقر الحكمة",      icon:"🦅", color:"#2c3e50" },
  { name:"ورثة الأنبياء",   icon:"🕊️", color:"#fdcb6e" },
  { name:"أصحاب الرأي",     icon:"🧠", color:"#00b894" },
  { name:"فرسان الكلمة",    icon:"⚔️",  color:"#fd79a8" },
  { name:"أساطير الأمم",    icon:"🏛️", color:"#636e72" },
  { name:"أبطال البيان",    icon:"⚔️",  color:"#d63031" },
  { name:"حكماء الدهر",     icon:"🌙", color:"#6c5ce7" },
  { name:"عقل الكون",       icon:"🌌", color:"#0984e3" },
  { name:"روح التاريخ",     icon:"📜", color:"#e17055" },
  { name:"نبضة الحضارة",    icon:"🌍", color:"#00cec9" },
  { name:"نجوم الأولين",    icon:"✨", color:"#fdcb6e" },
  { name:"خالد الزمان",     icon:"♾️",  color:"#a29bfe" },
  { name:"ساكن الخلود",     icon:"🌠", color:"#55efc4" },
  { name:"فارس الحقيقة",    icon:"⚡", color:"#fd79a8" },
  { name:"سلطان العقل",     icon:"👑", color:"#d4af37" },
  { name:"إمبراطور الحكمة", icon:"🏆", color:"#e17055" },
  { name:"أسطورة الأولين",  icon:"🌟", color:"#d4af37" },
  { name:"رب الفصاحة",      icon:"🔱", color:"#6c5ce7" },
  { name:"حجة العقلاء",     icon:"🎯", color:"#00b894" },
  { name:"قطب الحكماء",     icon:"♟️", color:"#2c3e50" },
  { name:"الأسطورة",        icon:"🌌", color:"#fdcb6e" },
];

function getTierInfo(stage: number) {
  const tierIndex   = Math.floor((stage - 1) / 5);
  const stageInTier = ((stage - 1) % 5) + 1;
  const tier        = TIERS[Math.min(tierIndex, TIERS.length - 1)];
  return { ...tier, index: tierIndex, stageInTier };
}

async function getOrCreateProgress(telegramId: string) {
  // استخدام INSERT ON CONFLICT DO NOTHING لتجنب race condition عند طلبين
  // متزامنين: الأول يُدرج، الثاني يتجاهل التعارض ثم يجلب الصف الموجود.
  await db
    .insert(quizProgressTable)
    .values({ telegramId })
    .onConflictDoNothing();
  const [row] = await db
    .select()
    .from(quizProgressTable)
    .where(eq(quizProgressTable.telegramId, telegramId));
  return row!;
}

// ════════════════════════════════════════════════════════════════════════════
// NEW ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/quiz/state
 * Returns the player's current quiz progress, tier info, and points.
 */
router.get("/quiz/state", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const progress = await getOrCreateProgress(telegramId);

  const [user] = await db
    .select({ loyaltyPoints: usersTable.loyaltyPoints })
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId));

  const tier = getTierInfo(progress.currentStage);

  res.json({
    stage:          progress.currentStage,
    tierName:       tier.name,
    tierIcon:       tier.icon,
    tierColor:      tier.color,
    tierIndex:      tier.index,
    stageInTier:    tier.stageInTier,
    correctCount:   progress.stageCorrectCount,
    totalCorrect:   progress.totalCorrect,
    totalAnswered:  progress.totalAnswered,
    accuracyScore:  progress.accuracyScore,
    loyaltyPoints:  user?.loyaltyPoints ?? 0,
  });
});

/**
 * GET /api/quiz/question
 * Returns the next pending question for the current stage.
 * Generates a new question pool if needed.
 */
router.get("/quiz/question", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const progress    = await getOrCreateProgress(telegramId);
  const pool        = (progress.questionPool  ?? []) as number[];
  const retryQueue  = (progress.retryQueue    ?? []) as number[];
  const correctIds  = (progress.correctIds    ?? []) as number[];

  let questionId: number;

  if (pool.length === 0 || (progress.poolIndex >= pool.length && retryQueue.length === 0)) {
    // Generate a fresh pool for the current stage, excluding globally-correct questions
    const newPool = generatePoolForStage(progress.currentStage, 10, correctIds);
    await db
      .update(quizProgressTable)
      .set({ questionPool: newPool, poolIndex: 0, updatedAt: new Date() })
      .where(eq(quizProgressTable.telegramId, telegramId));
    questionId = newPool[0] ?? QUESTION_BANK[0].id;
  } else if (progress.poolIndex < pool.length) {
    questionId = pool[progress.poolIndex];
  } else {
    // Retry queue (carries wrong answers across stages)
    questionId = retryQueue[0];
  }

  const q = QUESTION_BANK.find(q => q.id === questionId);
  if (!q) { res.status(500).json({ error: "No questions available" }); return; }

  res.json({
    id:           q.id,
    type:         q.type,
    q:            q.q,
    options:      q.options,
    words:        q.words ? [...q.words].sort(() => Math.random() - 0.5) : undefined,
    pts:          q.pts,
    source:       q.source,
    correctCount: progress.stageCorrectCount,
    totalInStage: 5,
  });
});

/**
 * POST /api/quiz/answer
 * Body: { questionId: number, answer: number | string }
 * - mc/fill: answer = option index (0-3)
 * - arrange: answer = words joined by space
 * Returns: correctness, points, stage completion status.
 */
router.post("/quiz/answer", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { questionId, answer } = req.body as { questionId: number; answer: number | string };

  const question = QUESTION_BANK.find(q => q.id === Number(questionId));
  if (!question) { res.status(400).json({ error: "Invalid question ID" }); return; }

  // ── Check correctness ──────────────────────────────────────────────────
  let correct = false;
  let correctAnswerDisplay: string;

  if (question.type === "arrange") {
    const userAnswer    = (Array.isArray(answer)
      ? (answer as string[]).join(" ")
      : String(answer)).trim();
    const correctAnswer = question.answer!.join(" ");
    correct             = userAnswer === correctAnswer;
    correctAnswerDisplay = correctAnswer;
  } else {
    correct              = Number(answer) === question.correct;
    correctAnswerDisplay = question.options![question.correct!];
  }

  const progress      = await getOrCreateProgress(telegramId);
  const pool          = (progress.questionPool ?? []) as number[];
  const retryQueue    = (progress.retryQueue   ?? []) as number[];
  const correctIds    = (progress.correctIds   ?? []) as number[];
  const isFromRetry   = retryQueue.length > 0 && retryQueue[0] === question.id;

  let newPoolIndex    = progress.poolIndex;
  let newRetryQueue   = [...retryQueue];
  let newCorrectIds   = [...correctIds];
  let newCorrectCount = progress.stageCorrectCount;
  let newTotalCorrect = progress.totalCorrect;
  const newTotalAnswered = progress.totalAnswered + 1;
  let newAccuracyScore   = progress.accuracyScore;
  let stageComplete      = false;

  if (correct) {
    newCorrectCount++;
    newTotalCorrect++;
    newAccuracyScore += question.pts;
    newCorrectIds     = [...correctIds, question.id];

    if (isFromRetry) {
      newRetryQueue = retryQueue.slice(1);
    } else {
      newPoolIndex++;
    }

    if (newCorrectCount >= 5) stageComplete = true;
  } else {
    if (isFromRetry) {
      newRetryQueue = retryQueue.slice(1); // one retry only — remove if wrong again
    } else {
      newPoolIndex++;
      newRetryQueue = [...retryQueue, question.id];
    }
  }

  // ── Loyalty points: 1 point per correct answer ────────────────────────
  const pointsAwarded = correct ? 1 : 0;

  if (correct) {
    db.update(usersTable)
      .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} + 1` })
      .where(eq(usersTable.telegramId, telegramId))
      .catch(() => {});
  }

  // ── Stage completion ───────────────────────────────────────────────────
  let newStage          = progress.currentStage;
  let tierAdvanced      = false;
  let newQuestionPool: number[] | null = null; // null = no change

  if (stageComplete) {
    const oldTierIdx = Math.floor((progress.currentStage - 1) / 5);
    newStage         = progress.currentStage + 1;
    const newTierIdx = Math.floor((newStage - 1) / 5);
    tierAdvanced     = newTierIdx > oldTierIdx;

    newPoolIndex    = 0;
    newCorrectCount = 0;
    // CLEAR the question pool so next GET /quiz/question generates fresh
    // questions for the NEW stage
    newQuestionPool = [];
    // KEEP retryQueue across stages — wrong answers must reappear later
    // KEEP correctIds permanently — never show an already-correct question again
    // (newRetryQueue and newCorrectIds already have the right values from above)
  }

  // ── Persist progress ───────────────────────────────────────────────────
  await db
    .update(quizProgressTable)
    .set({
      currentStage:      newStage,
      stageCorrectCount: newCorrectCount,
      totalCorrect:      newTotalCorrect,
      totalAnswered:     newTotalAnswered,
      accuracyScore:     newAccuracyScore,
      poolIndex:         newPoolIndex,
      retryQueue:        newRetryQueue,
      correctIds:        newCorrectIds,
      // Only update questionPool when completing a stage (clear it for next stage)
      ...(newQuestionPool !== null ? { questionPool: newQuestionPool } : {}),
      updatedAt:         new Date(),
    })
    .where(eq(quizProgressTable.telegramId, telegramId));

  const newTier = getTierInfo(newStage);

  res.json({
    correct,
    correctAnswer:       correctAnswerDisplay,
    explain:             question.explain,
    pts:                 correct ? question.pts : 0,
    correctCount:        newCorrectCount,
    stageComplete,
    tierAdvanced,
    newStage:            stageComplete ? newStage : undefined,
    loyaltyPointsAwarded: pointsAwarded,
    tierName:            newTier.name,
    tierIcon:            newTier.icon,
    tierColor:           newTier.color,
  });
});

// ════════════════════════════════════════════════════════════════════════════
// LEGACY ENDPOINTS (kept for backward compatibility)
// ════════════════════════════════════════════════════════════════════════════

router.post("/quiz/start-level", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [user] = await db
    .select({ level: usersTable.level })
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId));

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const token = issueQuizChallenge(telegramId, user.level);
  req.log.info({ telegramId, level: user.level }, "quiz session token issued");
  res.json({ quizToken: token, level: user.level, minAgeMs: MIN_QUIZ_AGE_MS });
});

router.post("/quiz/complete-level", async (req, res): Promise<void> => {
  const telegramId                            = req.telegramId;
  const { levelCompleted, quizToken }         = req.body as { levelCompleted?: number; quizToken?: string };

  if (!telegramId)                                   { res.status(401).json({ error: "Unauthorized" }); return; }
  if (typeof levelCompleted !== "number" || levelCompleted < 1) { res.status(400).json({ error: "levelCompleted required" }); return; }
  if (!quizToken || typeof quizToken !== "string")   { res.status(400).json({ error: "quizToken required" }); return; }

  const ageMs = validateAndConsumeQuiz(telegramId, quizToken, levelCompleted);
  if (ageMs === null) {
    res.status(403).json({ error: "Invalid or expired quiz session token" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId));
  if (!user)             { res.status(404).json({ error: "User not found" }); return; }
  if (levelCompleted !== user.level) {
    res.status(409).json({ error: "Level out of sequence", expected: user.level, received: levelCompleted });
    return;
  }

  const now  = Date.now();
  const last = user.lastQuizCompletedAt?.getTime() ?? 0;
  if (now - last < QUIZ_COOLDOWN_MS) {
    res.status(429).json({ error: `انتظر ${Math.ceil((QUIZ_COOLDOWN_MS - (now - last)) / 1000)} ثانية` });
    return;
  }

  const cooldownThreshold = new Date(now - QUIZ_COOLDOWN_MS);
  const [updated] = await db
    .update(usersTable)
    .set({ level: user.level + 1, loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${POINTS_PER_LEVEL}`, lastQuizCompletedAt: new Date() })
    .where(and(eq(usersTable.telegramId, telegramId), eq(usersTable.level, levelCompleted), or(isNull(usersTable.lastQuizCompletedAt), lt(usersTable.lastQuizCompletedAt, cooldownThreshold))))
    .returning({ level: usersTable.level, loyaltyPoints: usersTable.loyaltyPoints });

  if (!updated) { res.status(429).json({ error: "انتظر قبل إكمال المرحلة التالية" }); return; }

  const numericId = parseInt(telegramId, 10);
  if (!isNaN(numericId)) {
    db.insert(usersActivityTable).values({ telegramId: numericId, username: null, currentQuizLevel: updated.level, lastSeen: new Date() })
      .onConflictDoUpdate({ target: usersActivityTable.telegramId, set: { currentQuizLevel: updated.level, lastSeen: new Date() } })
      .catch(() => {});
  }

  res.json({ level: updated.level, loyaltyPoints: updated.loyaltyPoints, pointsAwarded: POINTS_PER_LEVEL });
});

export default router;
