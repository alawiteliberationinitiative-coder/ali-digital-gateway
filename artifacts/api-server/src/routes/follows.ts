import { Router } from "express";
import { db, eq, and, sql, usersTable, followsTable } from "@workspace/db";

const router = Router();

async function getUser(telegramId: string) {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId));
  return u;
}

/* ── Follow a user ───────────────────────────────────────────────────────── */
router.post("/users/follow/:targetTelegramId", async (req, res): Promise<void> => {
  const myId     = req.telegramId;
  const targetId = req.params.targetTelegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (myId === targetId) { res.status(400).json({ error: "لا يمكنك متابعة نفسك" }); return; }

  try {
    await db.insert(followsTable).values({ followerTelegramId: myId, followingTelegramId: targetId });
    res.status(201).json({ ok: true, following: true });
  } catch {
    res.status(200).json({ ok: true, following: true }); // already following
  }
});

/* ── Unfollow a user ─────────────────────────────────────────────────────── */
router.delete("/users/follow/:targetTelegramId", async (req, res): Promise<void> => {
  const myId     = req.telegramId;
  const targetId = req.params.targetTelegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  await db.delete(followsTable).where(
    and(eq(followsTable.followerTelegramId, myId), eq(followsTable.followingTelegramId, targetId))
  );
  res.json({ ok: true, following: false });
});

/* ── Check follow status ─────────────────────────────────────────────────── */
router.post("/users/follow-check", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { telegramIds } = req.body as { telegramIds?: string[] };
  if (!Array.isArray(telegramIds) || telegramIds.length === 0) { res.json({}); return; }
  if (telegramIds.length > 50) { res.status(400).json({ error: "Too many ids (max 50)" }); return; }

  const follows = await db
    .select({ followingTelegramId: followsTable.followingTelegramId })
    .from(followsTable)
    .where(eq(followsTable.followerTelegramId, myId));

  const map: Record<string, boolean> = {};
  const followingSet = new Set(follows.map(f => f.followingTelegramId));
  for (const id of telegramIds) { map[id] = followingSet.has(id); }
  res.json(map);
});

/* ── My following list ───────────────────────────────────────────────────── */
router.get("/users/me/following", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const rows = await db
    .select({
      telegramId: usersTable.telegramId,
      aliId: usersTable.aliId,
      pseudonym: usersTable.pseudonym,
      rank: usersTable.rank,
      level: usersTable.level,
      civicRole: usersTable.civicRole,
      followedAt: followsTable.createdAt,
    })
    .from(followsTable)
    .innerJoin(usersTable, eq(followsTable.followingTelegramId, usersTable.telegramId))
    .where(eq(followsTable.followerTelegramId, myId))
    .orderBy(followsTable.createdAt);

  res.json(rows);
});

/* ── My followers list ───────────────────────────────────────────────────── */
router.get("/users/me/followers", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const rows = await db
    .select({
      telegramId: usersTable.telegramId,
      aliId: usersTable.aliId,
      pseudonym: usersTable.pseudonym,
      rank: usersTable.rank,
      level: usersTable.level,
      civicRole: usersTable.civicRole,
      followedAt: followsTable.createdAt,
    })
    .from(followsTable)
    .innerJoin(usersTable, eq(followsTable.followerTelegramId, usersTable.telegramId))
    .where(eq(followsTable.followingTelegramId, myId))
    .orderBy(followsTable.createdAt);

  res.json(rows);
});

/* ── Friends (merged followers + following, mutual sorted first) ─────────── */
router.get("/users/me/friends", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const cols = {
    telegramId: usersTable.telegramId,
    aliId:      usersTable.aliId,
    pseudonym:  usersTable.pseudonym,
    rank:       usersTable.rank,
    level:      usersTable.level,
    civicRole:  usersTable.civicRole,
  };

  const [following, followers] = await Promise.all([
    db.select(cols).from(followsTable)
      .innerJoin(usersTable, eq(followsTable.followingTelegramId, usersTable.telegramId))
      .where(eq(followsTable.followerTelegramId, myId)),
    db.select(cols).from(followsTable)
      .innerJoin(usersTable, eq(followsTable.followerTelegramId, usersTable.telegramId))
      .where(eq(followsTable.followingTelegramId, myId)),
  ]);

  const followingIds = new Set(following.map(u => u.telegramId));
  const followerIds  = new Set(followers.map(u => u.telegramId));

  const map = new Map<string, typeof following[0] & { isMutual: boolean }>();
  for (const u of [...following, ...followers]) {
    if (!map.has(u.telegramId)) {
      map.set(u.telegramId, {
        ...u,
        isMutual: followingIds.has(u.telegramId) && followerIds.has(u.telegramId),
      });
    }
  }

  const result = [...map.values()].sort((a, b) => Number(b.isMutual) - Number(a.isMutual));
  res.json(result);
});

/* ── Network stats ───────────────────────────────────────────────────────── */
router.get("/users/me/network-stats", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [{ followingCount }] = await db
    .select({ followingCount: sql<number>`count(*)::int` })
    .from(followsTable)
    .where(eq(followsTable.followerTelegramId, myId));

  const [{ followersCount }] = await db
    .select({ followersCount: sql<number>`count(*)::int` })
    .from(followsTable)
    .where(eq(followsTable.followingTelegramId, myId));

  res.json({ followingCount, followersCount });
});

/* ── Search users ────────────────────────────────────────────────────────── */
router.get("/users/search", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const q = (req.query.q as string | undefined)?.trim();
  if (!q || q.length < 2) { res.json([]); return; }
  if (q.length > 100) { res.json([]); return; }

  const safe = q.toLowerCase().replace(/[%_\\]/g, "\\$&");
  const users = await db
    .select({
      telegramId: usersTable.telegramId,
      aliId: usersTable.aliId,
      pseudonym: usersTable.pseudonym,
      rank: usersTable.rank,
      level: usersTable.level,
      civicRole: usersTable.civicRole,
    })
    .from(usersTable)
    .where(
      sql`(lower(${usersTable.pseudonym}) LIKE ${`%${safe}%`} OR lower(${usersTable.aliId}) LIKE ${`%${safe}%`})`
    )
    .limit(20);

  res.json(users.filter(u => u.telegramId !== myId));
});


export default router;
