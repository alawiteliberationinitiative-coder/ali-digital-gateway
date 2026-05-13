import { Router } from "express";
import { db, eq, sql, usersTable } from "@workspace/db";

const router = Router();

const AD_POINTS_REWARD = 10;
const COOLDOWN_MS      = 25_000;

const lastRewardAt = new Map<string, number>();

router.post("/ads/reward", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;

  if (!telegramId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const now  = Date.now();
  const last = lastRewardAt.get(telegramId) ?? 0;

  if (now - last < COOLDOWN_MS) {
    const waitSecs = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
    res.status(429).json({ error: `انتظر ${waitSecs} ثانية قبل المشاهدة التالية` });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${AD_POINTS_REWARD}` })
    .where(eq(usersTable.telegramId, telegramId))
    .returning({ loyaltyPoints: usersTable.loyaltyPoints });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  lastRewardAt.set(telegramId, now);
  req.log.info({ telegramId, pointsAwarded: AD_POINTS_REWARD }, "ad reward granted");

  res.json({ loyaltyPoints: user.loyaltyPoints, pointsAwarded: AD_POINTS_REWARD });
});

export default router;
