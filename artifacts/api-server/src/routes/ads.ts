import { Router } from "express";
import { db, eq, sql, usersTable } from "@workspace/db";

const router = Router();

const AD_POINTS_REWARD = 10;

router.post("/ads/reward", async (req, res): Promise<void> => {
  const telegramId = req.headers["x-telegram-id"] as string | undefined;

  if (!telegramId) {
    res.status(400).json({ error: "x-telegram-id header required" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({
      loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${AD_POINTS_REWARD}`,
    })
    .where(eq(usersTable.telegramId, telegramId))
    .returning({ loyaltyPoints: usersTable.loyaltyPoints });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ loyaltyPoints: user.loyaltyPoints, pointsAwarded: AD_POINTS_REWARD });
});

export default router;
