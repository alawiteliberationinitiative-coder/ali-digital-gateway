import { Router } from "express";
import { db, eq, sql, desc, count, usersTable, articlesTable } from "@workspace/db";

const router = Router();

function generateAliId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ALI-2026-${suffix}`;
}

const PSEUDONYMS = [
  "Cipher", "Nexus", "Vortex", "Spectre", "Phantom", "Oracle", "Axiom",
  "Zenith", "Prism", "Solaris", "Cobalt", "Vector", "Nyx", "Helios",
  "Quasar", "Lycan", "Titan", "Argon", "Ember", "Onyx",
];

function generatePseudonym(): string {
  const base = PSEUDONYMS[Math.floor(Math.random() * PSEUDONYMS.length)];
  const num  = Math.floor(Math.random() * 9000) + 1000;
  return `${base}-${num}`;
}

function generateKey(prefix: string): string {
  const hex = () =>
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .toUpperCase()
      .padStart(6, "0");
  return `${prefix}-${hex()}-${hex()}-${hex()}`;
}

/* ── Register ────────────────────────────────────────────────────────────── */
router.post("/users/register", async (req, res): Promise<void> => {
  const { telegramId, telegramUsername, firstName, lastName, referredBy } = req.body as {
    telegramId?: string;
    telegramUsername?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    referredBy?: string | null;
  };

  if (!telegramId || typeof telegramId !== "string") {
    res.status(400).json({ error: "telegramId is required" });
    return;
  }
  if (!/^\d+$/.test(telegramId)) {
    res.status(400).json({ error: "Invalid telegramId format" });
    return;
  }
  // Input length guards
  if (telegramUsername && telegramUsername.length > 64)  { res.status(400).json({ error: "Username too long" }); return; }
  if (firstName       && firstName.length > 64)          { res.status(400).json({ error: "First name too long" }); return; }
  if (lastName        && lastName.length > 64)           { res.status(400).json({ error: "Last name too long" }); return; }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId));
  if (existing) {
    res.status(200).json({ ...existing, mddBalance: Number(existing.mddBalance) });
    return;
  }

  let aliId = generateAliId();
  for (let i = 0; i < 10; i++) {
    const [conflict] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.aliId, aliId));
    if (!conflict) break;
    aliId = generateAliId();
  }

  let validReferredBy: string | null = null;
  if (referredBy && typeof referredBy === "string" && /^ALI-\d{4}-[A-Z0-9]{4}$/.test(referredBy)) {
    const [referrer] = await db.select({ aliId: usersTable.aliId }).from(usersTable).where(eq(usersTable.aliId, referredBy));
    if (referrer) validReferredBy = referrer.aliId;
  }

  const [created] = await db
    .insert(usersTable)
    .values({
      aliId,
      pseudonym:         generatePseudonym(),
      telegramId,
      telegramUsername:  telegramUsername?.slice(0, 64) ?? null,
      firstName:         firstName?.slice(0, 64) ?? null,
      lastName:          lastName?.slice(0, 64) ?? null,
      vaultKey:          generateKey("VLT"),
      identityKey:       generateKey("IDT"),
      masterKey:         generateKey("MST"),
      mddBalance:        "250",
      rank:              "Initiate",
      level:             1,
      keysConfirmed:     false,
      referredBy:        validReferredBy,
    })
    .returning();

  res.status(201).json({ ...created!, mddBalance: Number(created!.mddBalance) });
});

/* ── Get my profile ──────────────────────────────────────────────────────── */
router.get("/users/me", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  res.json({ ...user, mddBalance: Number(user.mddBalance) });
});

/* ── Update pseudonym ────────────────────────────────────────────────────── */
router.patch("/users/me/pseudonym", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { pseudonym } = req.body as { pseudonym?: string };
  if (!pseudonym || typeof pseudonym !== "string") {
    res.status(400).json({ error: "pseudonym is required" }); return;
  }

  const trimmed = pseudonym.trim();
  if (trimmed.length < 3 || trimmed.length > 30) {
    res.status(400).json({ error: "الاسم المستعار يجب أن يكون بين 3 و 30 حرفاً" }); return;
  }
  if (!/^[\w\u0600-\u06FF\- ]+$/.test(trimmed)) {
    res.status(400).json({ error: "الاسم المستعار يحتوي على رموز غير مسموح بها" }); return;
  }

  const [conflict] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.pseudonym, trimmed));
  if (conflict) { res.status(409).json({ error: "هذا الاسم المستعار محجوز، جرب اسماً آخر" }); return; }

  const [updated] = await db
    .update(usersTable)
    .set({ pseudonym: trimmed })
    .where(eq(usersTable.telegramId, telegramId))
    .returning();

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ ...updated, mddBalance: Number(updated.mddBalance) });
});

/* ── Award 200 points for documentation form ─────────────────────────────── */
router.post("/docs/submit", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [user] = await db
    .update(usersTable)
    .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} + 200` })
    .where(eq(usersTable.telegramId, telegramId))
    .returning({ loyaltyPoints: usersTable.loyaltyPoints });

  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ loyaltyPoints: user.loyaltyPoints, pointsAwarded: 200 });
});

/* ── Referral count ──────────────────────────────────────────────────────── */
router.get("/users/me/referrals", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [me] = await db.select({ aliId: usersTable.aliId }).from(usersTable).where(eq(usersTable.telegramId, telegramId));
  if (!me) { res.status(404).json({ error: "User not found" }); return; }

  const [result] = await db.select({ total: count(usersTable.id) }).from(usersTable).where(eq(usersTable.referredBy, me.aliId));
  res.json({ count: result?.total ?? 0 });
});

/* ── Leaderboard ─────────────────────────────────────────────────────────── */
router.get("/leaderboard", async (req, res): Promise<void> => {
  const limit = Math.min(parseInt((req.query.limit as string) || "20", 10), 100);
  if (isNaN(limit)) { res.status(400).json({ error: "Invalid limit" }); return; }

  const leaders = await db
    .select({
      aliId:         usersTable.aliId,
      pseudonym:     usersTable.pseudonym,
      loyaltyPoints: usersTable.loyaltyPoints,
      level:         usersTable.level,
      rank:          usersTable.rank,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.loyaltyPoints), desc(usersTable.level))
    .limit(limit);

  res.json(leaders);
});

/* ── Platform stats ──────────────────────────────────────────────────────── */
router.get("/users/stats", async (_req, res): Promise<void> => {
  const [userStats] = await db
    .select({
      totalUsers:  count(usersTable.id),
      totalPoints: sql<string>`coalesce(sum(${usersTable.loyaltyPoints}), 0)`,
    })
    .from(usersTable);

  const [articleStats] = await db
    .select({ totalArticles: count(articlesTable.id) })
    .from(articlesTable);

  res.json({
    totalUsers:    userStats?.totalUsers    ?? 0,
    totalPoints:   Number(userStats?.totalPoints ?? 0),
    totalArticles: articleStats?.totalArticles ?? 0,
  });
});

/* ── Confirm keys saved ──────────────────────────────────────────────────── */
router.post("/users/confirm-keys", async (req, res): Promise<void> => {
  const { telegramId } = req.body as { telegramId?: string };
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    res.status(400).json({ error: "telegramId is required" }); return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ keysConfirmed: true })
    .where(eq(usersTable.telegramId, telegramId))
    .returning();

  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ ...user, mddBalance: Number(user.mddBalance) });
});

export default router;
