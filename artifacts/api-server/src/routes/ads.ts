import { Router }   from "express";
import { db, eq, and, or, lt, isNull, sql, usersTable, adsRevenueTable } from "@workspace/db";
import { issueChallenge, validateAndConsume, MIN_AGE_MS } from "../lib/ad-challenges.js";

const router = Router();

const AD_POINTS_REWARD = 10;
const COOLDOWN_MS      = 25_000;

/**
 * POST /api/ads/challenge
 *
 * Issues a single-use, time-stamped challenge token that the client must
 * obtain *before* showing the ad.  The token is later presented to
 * /api/ads/reward where its age is verified (≥ MIN_AGE_MS) to prove the
 * user actually waited through the ad duration.
 */
router.post("/ads/challenge", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Pre-flight cooldown check so the client can surface a friendly message
  // before it even starts the ad.
  const [user] = await db
    .select({ lastAdRewardAt: usersTable.lastAdRewardAt })
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const now  = Date.now();
  const last = user.lastAdRewardAt?.getTime() ?? 0;

  if (now - last < COOLDOWN_MS) {
    const waitSecs = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
    res.status(429).json({ error: `انتظر ${waitSecs} ثانية قبل المشاهدة التالية` });
    return;
  }

  const token = issueChallenge(telegramId);
  req.log.info({ telegramId, minAgeMs: MIN_AGE_MS }, "ad challenge issued");
  res.json({ challengeToken: token, minAgeMs: MIN_AGE_MS });
});

/**
 * POST /api/ads/reward
 *
 * Awards points only when a valid challenge token is presented and the token
 * is at least MIN_AGE_MS old (enforcing that the client waited through the
 * ad).  The cooldown is enforced atomically in the DB UPDATE WHERE clause to
 * prevent concurrent-request race amplification.
 */
router.post("/ads/reward", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { challengeToken } = req.body as { challengeToken?: string };
  if (!challengeToken || typeof challengeToken !== "string") {
    res.status(400).json({ error: "challengeToken required" });
    return;
  }

  // Validate and immediately consume the challenge (single-use).
  const ageMs = validateAndConsume(telegramId, challengeToken);
  if (ageMs === null) {
    req.log.warn({ telegramId }, "ads/reward: invalid, expired, or too-young challenge token");
    res.status(403).json({ error: "Invalid or expired challenge token" });
    return;
  }

  // Atomically apply cooldown + point increment in a single conditional UPDATE.
  // The WHERE clause re-checks the cooldown window at write time, preventing
  // two concurrent reward requests from both succeeding.
  const cooldownThreshold = new Date(Date.now() - COOLDOWN_MS);

  const [user] = await db
    .update(usersTable)
    .set({
      loyaltyPoints:  sql`${usersTable.loyaltyPoints} + ${AD_POINTS_REWARD}`,
      lastAdRewardAt: new Date(),
    })
    .where(
      and(
        eq(usersTable.telegramId, telegramId),
        or(
          isNull(usersTable.lastAdRewardAt),
          lt(usersTable.lastAdRewardAt, cooldownThreshold)
        )
      )
    )
    .returning({ loyaltyPoints: usersTable.loyaltyPoints });

  if (!user) {
    // Either the user doesn't exist or the cooldown has not yet elapsed.
    const [exists] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId));

    if (!exists) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Cooldown won (concurrent request or client sent reward too fast).
    const [cur] = await db
      .select({ lastAdRewardAt: usersTable.lastAdRewardAt })
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId));

    const waitSecs = cur?.lastAdRewardAt
      ? Math.ceil((COOLDOWN_MS - (Date.now() - cur.lastAdRewardAt.getTime())) / 1000)
      : 0;

    res.status(429).json({ error: `انتظر ${Math.max(0, waitSecs)} ثانية قبل المشاهدة التالية` });
    return;
  }

  req.log.info({ telegramId, pointsAwarded: AD_POINTS_REWARD, challengeAgeMs: ageMs }, "ad reward granted");

  // Track ad revenue per user in ads_revenue table (fire-and-forget, non-critical)
  const numericId = parseInt(telegramId, 10);
  if (!isNaN(numericId)) {
    db.insert(adsRevenueTable)
      .values({
        telegramId:         numericId,
        totalRevenuePoints: AD_POINTS_REWARD,
        adCount:            1,
        lastAdAt:           new Date(),
      })
      .onConflictDoUpdate({
        target: adsRevenueTable.telegramId,
        set: {
          totalRevenuePoints: sql`${adsRevenueTable.totalRevenuePoints} + ${AD_POINTS_REWARD}`,
          adCount:            sql`${adsRevenueTable.adCount} + 1`,
          lastAdAt:           new Date(),
        },
      })
      .catch(() => { /* non-critical — don't fail the reward response */ });
  }

  res.json({ loyaltyPoints: user.loyaltyPoints, pointsAwarded: AD_POINTS_REWARD });
});

export default router;
