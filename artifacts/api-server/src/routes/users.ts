import { Router } from "express";
import { db, eq, and, sql, desc, count, usersTable, articlesTable, usersActivityTable, blocksTable } from "@workspace/db";
import { consumeUploadToken } from "../lib/upload-tokens.js";

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
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { telegramUsername, firstName, lastName, referredBy } = req.body as {
    telegramUsername?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    referredBy?: string | null;
  };

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

  // Require a server-issued upload token from a prior /api/docs/upload-file
  // call.  Without this a caller could farm 200 points by hitting this
  // endpoint directly, with no file ever uploaded.
  const { fileId } = req.body as { fileId?: string };
  if (!fileId || typeof fileId !== "string") {
    res.status(400).json({ error: "fileId required" });
    return;
  }

  if (!consumeUploadToken(telegramId, fileId)) {
    req.log.warn({ telegramId, fileId }, "docs/submit: invalid or already-used upload token");
    res.status(403).json({ error: "Invalid or expired upload token" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} + 200` })
    .where(eq(usersTable.telegramId, telegramId))
    .returning({ loyaltyPoints: usersTable.loyaltyPoints });

  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  req.log.info({ telegramId, fileId, pointsAwarded: 200 }, "docs submit reward granted");
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

/* ── Ping: update last_seen + current_quiz_level in users_activity ───────── */
router.post("/users/ping", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const numericId = parseInt(telegramId, 10);
  if (isNaN(numericId)) { res.status(400).json({ error: "Invalid telegram id" }); return; }

  // Read current level + username from the main users table
  const [user] = await db
    .select({ level: usersTable.level, telegramUsername: usersTable.telegramUsername })
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId));

  const now = new Date();

  // Upsert into users_activity: insert on first visit, update last_seen + level on subsequent ones
  await db
    .insert(usersActivityTable)
    .values({
      telegramId:       numericId,
      username:         user?.telegramUsername ?? null,
      currentQuizLevel: user?.level ?? 1,
      lastSeen:         now,
    })
    .onConflictDoUpdate({
      target: usersActivityTable.telegramId,
      set: {
        username:         user?.telegramUsername ?? null,
        currentQuizLevel: user?.level ?? 1,
        lastSeen:         now,
      },
    });

  req.log.info({ telegramId, level: user?.level }, "user ping recorded");
  res.json({ ok: true, lastSeen: now.toISOString() });
});

/* ── Update profile photo ────────────────────────────────────────────────── */
router.patch("/users/me/photo", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { photoUrl } = req.body as { photoUrl?: string | null };

  if (photoUrl !== null && photoUrl !== undefined) {
    if (typeof photoUrl !== "string") {
      res.status(400).json({ error: "photoUrl must be a string or null" }); return;
    }
    if (!photoUrl.startsWith("data:image/")) {
      res.status(400).json({ error: "photoUrl must be a data URL" }); return;
    }
    // Limit base64 payload to ~150 KB (≈ 112 KB raw after JPEG compression)
    if (photoUrl.length > 200_000) {
      res.status(400).json({ error: "الصورة كبيرة جداً، يرجى اختيار صورة أصغر" }); return;
    }
  }

  const [updated] = await db
    .update(usersTable)
    .set({ photoUrl: photoUrl ?? null })
    .where(eq(usersTable.telegramId, telegramId))
    .returning({ photoUrl: usersTable.photoUrl });

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ photoUrl: updated.photoUrl });
});

/* ── Update civic role ───────────────────────────────────────────────────── */
router.patch("/users/me/civic-role", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { civicRole } = req.body as { civicRole?: string | null };
  const allowed = ["guardian", "ambassador", null, undefined];
  if (!allowed.includes(civicRole)) {
    res.status(400).json({ error: "civicRole must be 'guardian', 'ambassador', or null" }); return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ civicRole: civicRole ?? null })
    .where(eq(usersTable.telegramId, telegramId))
    .returning({ civicRole: usersTable.civicRole });

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ civicRole: updated.civicRole });
});

/* ── Confirm keys saved ──────────────────────────────────────────────────── */
router.post("/users/confirm-keys", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [user] = await db
    .update(usersTable)
    .set({ keysConfirmed: true })
    .where(eq(usersTable.telegramId, telegramId))
    .returning();

  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ ...user, mddBalance: Number(user.mddBalance) });
});

/* ── Block a user ────────────────────────────────────────────────────────── */
router.post("/users/block/:targetId", async (req, res): Promise<void> => {
  const myId     = req.telegramId;
  const targetId = req.params.targetId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (myId === targetId) { res.status(400).json({ error: "لا يمكنك حظر نفسك" }); return; }

  await db
    .insert(blocksTable)
    .values({ blockerTelegramId: myId, blockedTelegramId: targetId })
    .onConflictDoNothing();

  res.json({ ok: true });
});

/* ── Unblock a user ──────────────────────────────────────────────────────── */
router.delete("/users/block/:targetId", async (req, res): Promise<void> => {
  const myId     = req.telegramId;
  const targetId = req.params.targetId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  await db
    .delete(blocksTable)
    .where(
      and(
        eq(blocksTable.blockerTelegramId, myId),
        eq(blocksTable.blockedTelegramId, targetId),
      )
    );

  res.json({ ok: true });
});

/* ── Get my blocked users ────────────────────────────────────────────────── */
router.get("/users/blocks", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const rows = await db
    .select({ blockedTelegramId: blocksTable.blockedTelegramId, createdAt: blocksTable.createdAt })
    .from(blocksTable)
    .where(eq(blocksTable.blockerTelegramId, myId));

  res.json(rows);
});

export default router;
