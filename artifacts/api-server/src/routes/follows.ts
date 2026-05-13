import { Router } from "express";
import { db, eq, and, sql, usersTable, followsTable, spaceInvitesTable, spacesTable, spaceParticipantsTable } from "@workspace/db";

const router = Router();

async function getUser(telegramId: string) {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId));
  return u;
}

/* ── Follow a user ───────────────────────────────────────────────────────── */
router.post("/users/follow/:targetTelegramId", async (req, res): Promise<void> => {
  const myId = req.headers["x-telegram-id"] as string | undefined;
  const targetId = req.params.targetTelegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (myId === targetId) { res.status(400).json({ error: "لا يمكنك متابعة نفسك" }); return; }

  try {
    await db.insert(followsTable).values({ followerTelegramId: myId, followingTelegramId: targetId });
    res.status(201).json({ ok: true, following: true });
  } catch {
    res.status(409).json({ ok: true, following: true });
  }
});

/* ── Unfollow a user ─────────────────────────────────────────────────────── */
router.delete("/users/follow/:targetTelegramId", async (req, res): Promise<void> => {
  const myId = req.headers["x-telegram-id"] as string | undefined;
  const targetId = req.params.targetTelegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  await db.delete(followsTable).where(
    and(eq(followsTable.followerTelegramId, myId), eq(followsTable.followingTelegramId, targetId))
  );
  res.json({ ok: true, following: false });
});

/* ── Check follow status for a list of telegramIds ───────────────────────── */
router.post("/users/follow-check", async (req, res): Promise<void> => {
  const myId = req.headers["x-telegram-id"] as string | undefined;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { telegramIds } = req.body as { telegramIds?: string[] };
  if (!Array.isArray(telegramIds) || telegramIds.length === 0) {
    res.json({}); return;
  }

  const follows = await db.select({ followingTelegramId: followsTable.followingTelegramId })
    .from(followsTable)
    .where(eq(followsTable.followerTelegramId, myId));

  const map: Record<string, boolean> = {};
  const followingSet = new Set(follows.map(f => f.followingTelegramId));
  for (const id of telegramIds) { map[id] = followingSet.has(id); }
  res.json(map);
});

/* ── Get my following list ───────────────────────────────────────────────── */
router.get("/users/me/following", async (req, res): Promise<void> => {
  const myId = req.headers["x-telegram-id"] as string | undefined;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const rows = await db
    .select({
      telegramId: usersTable.telegramId,
      aliId: usersTable.aliId,
      pseudonym: usersTable.pseudonym,
      rank: usersTable.rank,
      level: usersTable.level,
      followedAt: followsTable.createdAt,
    })
    .from(followsTable)
    .innerJoin(usersTable, eq(followsTable.followingTelegramId, usersTable.telegramId))
    .where(eq(followsTable.followerTelegramId, myId))
    .orderBy(followsTable.createdAt);

  res.json(rows);
});

/* ── Get my followers list ───────────────────────────────────────────────── */
router.get("/users/me/followers", async (req, res): Promise<void> => {
  const myId = req.headers["x-telegram-id"] as string | undefined;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const rows = await db
    .select({
      telegramId: usersTable.telegramId,
      aliId: usersTable.aliId,
      pseudonym: usersTable.pseudonym,
      rank: usersTable.rank,
      level: usersTable.level,
      followedAt: followsTable.createdAt,
    })
    .from(followsTable)
    .innerJoin(usersTable, eq(followsTable.followerTelegramId, usersTable.telegramId))
    .where(eq(followsTable.followingTelegramId, myId))
    .orderBy(followsTable.createdAt);

  res.json(rows);
});

/* ── Follow counts for current user ──────────────────────────────────────── */
router.get("/users/me/network-stats", async (req, res): Promise<void> => {
  const myId = req.headers["x-telegram-id"] as string | undefined;
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
  const myId = req.headers["x-telegram-id"] as string | undefined;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const q = (req.query.q as string | undefined)?.trim();
  if (!q || q.length < 2) { res.json([]); return; }

  const users = await db
    .select({
      telegramId: usersTable.telegramId,
      aliId: usersTable.aliId,
      pseudonym: usersTable.pseudonym,
      rank: usersTable.rank,
      level: usersTable.level,
    })
    .from(usersTable)
    .where(
      sql`(lower(${usersTable.pseudonym}) LIKE ${`%${q.toLowerCase()}%`} OR lower(${usersTable.aliId}) LIKE ${`%${q.toLowerCase()}%`})`
    )
    .limit(20);

  const filtered = users.filter(u => u.telegramId !== myId);
  res.json(filtered);
});

/* ── Invite user to a space ──────────────────────────────────────────────── */
router.post("/spaces/:id/invite", async (req, res): Promise<void> => {
  const myId = req.headers["x-telegram-id"] as string | undefined;
  const spaceId = parseInt(req.params.id, 10);
  if (!myId || isNaN(spaceId)) { res.status(400).json({ error: "Bad request" }); return; }

  const { inviteeTelegramId, role = "listener" } = req.body as {
    inviteeTelegramId?: string;
    role?: string;
  };
  if (!inviteeTelegramId) { res.status(400).json({ error: "inviteeTelegramId required" }); return; }

  const [space] = await db.select().from(spacesTable).where(eq(spacesTable.id, spaceId));
  if (!space || space.status === "ended") { res.status(404).json({ error: "Space not found" }); return; }

  const isHost = space.hostTelegramId === myId;
  if (role === "speaker" && !isHost) {
    res.status(403).json({ error: "فقط المضيف يمكنه تعيين الضيوف" }); return;
  }

  try {
    const [invite] = await db.insert(spaceInvitesTable).values({
      spaceId,
      inviterTelegramId: myId,
      inviteeTelegramId,
      role,
      seen: false,
    }).onConflictDoUpdate({
      target: [spaceInvitesTable.spaceId, spaceInvitesTable.inviteeTelegramId],
      set: { role, seen: false, inviterTelegramId: myId },
    }).returning();
    res.status(201).json(invite);
  } catch {
    res.status(500).json({ error: "Error sending invite" });
  }
});

/* ── Get my pending space invites ────────────────────────────────────────── */
router.get("/spaces/my-invites", async (req, res): Promise<void> => {
  const myId = req.headers["x-telegram-id"] as string | undefined;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const invites = await db
    .select({
      id: spaceInvitesTable.id,
      spaceId: spaceInvitesTable.spaceId,
      role: spaceInvitesTable.role,
      seen: spaceInvitesTable.seen,
      createdAt: spaceInvitesTable.createdAt,
      inviterTelegramId: spaceInvitesTable.inviterTelegramId,
      spaceTitle: spacesTable.title,
      spaceStatus: spacesTable.status,
      hostPseudonym: spacesTable.hostPseudonym,
    })
    .from(spaceInvitesTable)
    .innerJoin(spacesTable, eq(spaceInvitesTable.spaceId, spacesTable.id))
    .where(
      and(
        eq(spaceInvitesTable.inviteeTelegramId, myId),
        eq(spaceInvitesTable.seen, false)
      )
    )
    .orderBy(spaceInvitesTable.createdAt);

  const active = invites.filter(i => i.spaceStatus === "live" || i.spaceStatus === "scheduled");
  res.json(active);
});

/* ── Mark invite as seen and handle join ─────────────────────────────────── */
router.post("/spaces/invites/:inviteId/accept", async (req, res): Promise<void> => {
  const myId = req.headers["x-telegram-id"] as string | undefined;
  const inviteId = parseInt(req.params.inviteId, 10);
  if (!myId || isNaN(inviteId)) { res.status(400).json({ error: "Bad request" }); return; }

  const [invite] = await db.select().from(spaceInvitesTable)
    .where(and(eq(spaceInvitesTable.id, inviteId), eq(spaceInvitesTable.inviteeTelegramId, myId)));

  if (!invite) { res.status(404).json({ error: "Invite not found" }); return; }

  await db.update(spaceInvitesTable).set({ seen: true }).where(eq(spaceInvitesTable.id, inviteId));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, myId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [existing] = await db.select().from(spaceParticipantsTable).where(
    and(eq(spaceParticipantsTable.spaceId, invite.spaceId), eq(spaceParticipantsTable.telegramId, myId))
  );

  if (!existing) {
    await db.insert(spaceParticipantsTable).values({
      spaceId: invite.spaceId,
      telegramId: myId,
      pseudonym: user.pseudonym,
      aliId: user.aliId,
      role: invite.role as "listener" | "speaker",
      isMuted: invite.role === "speaker" ? false : true,
      raisedHand: false,
    });
  } else if (invite.role === "speaker" && existing.role === "listener") {
    await db.update(spaceParticipantsTable)
      .set({ role: "speaker", isMuted: false })
      .where(eq(spaceParticipantsTable.id, existing.id));
  }

  res.json({ ok: true, spaceId: invite.spaceId, role: invite.role });
});

/* ── Dismiss invite ──────────────────────────────────────────────────────── */
router.post("/spaces/invites/:inviteId/dismiss", async (req, res): Promise<void> => {
  const myId = req.headers["x-telegram-id"] as string | undefined;
  const inviteId = parseInt(req.params.inviteId, 10);
  if (!myId || isNaN(inviteId)) { res.status(400).json({ error: "Bad request" }); return; }

  await db.update(spaceInvitesTable).set({ seen: true })
    .where(and(eq(spaceInvitesTable.id, inviteId), eq(spaceInvitesTable.inviteeTelegramId, myId)));

  res.json({ ok: true });
});

export default router;
