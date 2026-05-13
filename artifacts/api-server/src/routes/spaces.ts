import { Router } from "express";
import {
  db, eq, and, usersTable,
  spacesTable, spaceParticipantsTable, spaceSignalsTable,
} from "@workspace/db";

const router = Router();
const ADMIN_IDS = ["6213952907"];

async function getUser(telegramId: string) {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId));
  return u;
}

function canHost(user: Awaited<ReturnType<typeof getUser>>, telegramId: string) {
  if (!user) return false;
  return ADMIN_IDS.includes(telegramId) || user.role === "staff" || user.role === "admin";
}

/* ── List spaces (live + upcoming) ─────────────────────────────────────────── */
router.get("/spaces", async (req, res): Promise<void> => {
  const spaces = await db
    .select()
    .from(spacesTable)
    .where(eq(spacesTable.status, "live"))
    .orderBy(spacesTable.createdAt);

  const scheduled = await db
    .select()
    .from(spacesTable)
    .where(eq(spacesTable.status, "scheduled"))
    .orderBy(spacesTable.scheduledAt);

  const all = [...spaces, ...scheduled];

  const withCounts = await Promise.all(
    all.map(async (s) => {
      const participants = await db
        .select()
        .from(spaceParticipantsTable)
        .where(eq(spaceParticipantsTable.spaceId, s.id));
      return { ...s, participantCount: participants.length };
    })
  );

  res.json(withCounts);
});

/* ── Create space ────────────────────────────────────────────────────────────── */
router.post("/spaces", async (req, res): Promise<void> => {
  const telegramId = req.headers["x-telegram-id"] as string | undefined;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const user = await getUser(telegramId);
  if (!canHost(user, telegramId)) {
    res.status(403).json({ error: "صلاحية إنشاء المجالس للفريق المنتخب فقط" });
    return;
  }

  const { title, description, scheduledAt } = req.body as {
    title?: string;
    description?: string;
    scheduledAt?: string;
  };

  if (!title?.trim()) { res.status(400).json({ error: "العنوان مطلوب" }); return; }

  const [space] = await db.insert(spacesTable).values({
    title: title.trim(),
    description: description?.trim() ?? null,
    hostTelegramId: telegramId,
    hostPseudonym: user.pseudonym,
    hostAliId: user.aliId,
    status: scheduledAt ? "scheduled" : "live",
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    startedAt: scheduledAt ? null : new Date(),
  }).returning();

  await db.insert(spaceParticipantsTable).values({
    spaceId: space.id,
    telegramId,
    pseudonym: user.pseudonym,
    aliId: user.aliId,
    role: "host",
    isMuted: false,
    raisedHand: false,
  });

  res.status(201).json(space);
});

/* ── Get space details + participants ──────────────────────────────────────── */
router.get("/spaces/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [space] = await db.select().from(spacesTable).where(eq(spacesTable.id, id));
  if (!space) { res.status(404).json({ error: "Space not found" }); return; }

  const participants = await db
    .select()
    .from(spaceParticipantsTable)
    .where(eq(spaceParticipantsTable.spaceId, id))
    .orderBy(spaceParticipantsTable.joinedAt);

  res.json({ ...space, participants });
});

/* ── Start a scheduled space ─────────────────────────────────────────────── */
router.post("/spaces/:id/start", async (req, res): Promise<void> => {
  const telegramId = req.headers["x-telegram-id"] as string | undefined;
  const id = parseInt(req.params.id, 10);
  if (!telegramId || isNaN(id)) { res.status(400).json({ error: "Bad request" }); return; }

  const [space] = await db.select().from(spacesTable).where(eq(spacesTable.id, id));
  if (!space) { res.status(404).json({ error: "Not found" }); return; }
  if (space.hostTelegramId !== telegramId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [updated] = await db.update(spacesTable)
    .set({ status: "live", startedAt: new Date() })
    .where(eq(spacesTable.id, id))
    .returning();

  res.json(updated);
});

/* ── Join space ──────────────────────────────────────────────────────────────── */
router.post("/spaces/:id/join", async (req, res): Promise<void> => {
  const telegramId = req.headers["x-telegram-id"] as string | undefined;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const user = await getUser(telegramId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [space] = await db.select().from(spacesTable).where(eq(spacesTable.id, id));
  if (!space || space.status === "ended") {
    res.status(404).json({ error: "المجلس غير متاح" }); return;
  }

  const [existing] = await db
    .select()
    .from(spaceParticipantsTable)
    .where(and(
      eq(spaceParticipantsTable.spaceId, id),
      eq(spaceParticipantsTable.telegramId, telegramId)
    ));

  if (existing) {
    const [updated] = await db.update(spaceParticipantsTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(spaceParticipantsTable.id, existing.id))
      .returning();
    const participants = await db.select().from(spaceParticipantsTable).where(eq(spaceParticipantsTable.spaceId, id));
    res.json({ participant: updated, space, participants });
    return;
  }

  const [participant] = await db.insert(spaceParticipantsTable).values({
    spaceId: id,
    telegramId,
    pseudonym: user.pseudonym,
    aliId: user.aliId,
    role: "listener",
    isMuted: true,
    raisedHand: false,
  }).returning();

  const participants = await db.select().from(spaceParticipantsTable).where(eq(spaceParticipantsTable.spaceId, id));
  res.json({ participant, space, participants });
});

/* ── Heartbeat (keep participant alive) ──────────────────────────────────── */
router.post("/spaces/:id/heartbeat", async (req, res): Promise<void> => {
  const telegramId = req.headers["x-telegram-id"] as string | undefined;
  const id = parseInt(req.params.id, 10);
  if (!telegramId || isNaN(id)) { res.status(400).json({ error: "Bad request" }); return; }

  await db.update(spaceParticipantsTable)
    .set({ lastSeenAt: new Date() })
    .where(and(
      eq(spaceParticipantsTable.spaceId, id),
      eq(spaceParticipantsTable.telegramId, telegramId)
    ));

  res.json({ ok: true });
});

/* ── Leave space ─────────────────────────────────────────────────────────── */
router.post("/spaces/:id/leave", async (req, res): Promise<void> => {
  const telegramId = req.headers["x-telegram-id"] as string | undefined;
  const id = parseInt(req.params.id, 10);
  if (!telegramId || isNaN(id)) { res.status(400).json({ error: "Bad request" }); return; }

  await db.delete(spaceParticipantsTable).where(
    and(
      eq(spaceParticipantsTable.spaceId, id),
      eq(spaceParticipantsTable.telegramId, telegramId)
    )
  );

  const [space] = await db.select().from(spacesTable).where(eq(spacesTable.id, id));
  if (space?.hostTelegramId === telegramId) {
    await db.update(spacesTable).set({ status: "ended", endedAt: new Date() }).where(eq(spacesTable.id, id));
  }

  res.json({ ok: true });
});

/* ── Raise / lower hand ──────────────────────────────────────────────────── */
router.post("/spaces/:id/raise-hand", async (req, res): Promise<void> => {
  const telegramId = req.headers["x-telegram-id"] as string | undefined;
  const id = parseInt(req.params.id, 10);
  if (!telegramId || isNaN(id)) { res.status(400).json({ error: "Bad request" }); return; }

  const [p] = await db.select().from(spaceParticipantsTable).where(
    and(eq(spaceParticipantsTable.spaceId, id), eq(spaceParticipantsTable.telegramId, telegramId))
  );
  if (!p) { res.status(404).json({ error: "Not in space" }); return; }

  const [updated] = await db.update(spaceParticipantsTable)
    .set({ raisedHand: !p.raisedHand })
    .where(eq(spaceParticipantsTable.id, p.id))
    .returning();

  res.json(updated);
});

/* ── Update participant (host: promote/demote/mute) ──────────────────────── */
router.patch("/spaces/:id/participants/:tgId", async (req, res): Promise<void> => {
  const telegramId = req.headers["x-telegram-id"] as string | undefined;
  const id = parseInt(req.params.id, 10);
  const targetId = req.params.tgId;
  if (!telegramId || isNaN(id)) { res.status(400).json({ error: "Bad request" }); return; }

  const [space] = await db.select().from(spacesTable).where(eq(spacesTable.id, id));
  if (!space) { res.status(404).json({ error: "Not found" }); return; }

  const isHost = space.hostTelegramId === telegramId || ADMIN_IDS.includes(telegramId);
  if (!isHost) { res.status(403).json({ error: "ليس لديك صلاحية إدارة المشاركين" }); return; }

  const { role, isMuted, raisedHand } = req.body as {
    role?: string;
    isMuted?: boolean;
    raisedHand?: boolean;
  };

  const updates: Record<string, unknown> = {};
  if (role !== undefined) updates.role = role;
  if (isMuted !== undefined) updates.isMuted = isMuted;
  if (raisedHand !== undefined) updates.raisedHand = raisedHand;

  const [updated] = await db.update(spaceParticipantsTable)
    .set(updates)
    .where(and(
      eq(spaceParticipantsTable.spaceId, id),
      eq(spaceParticipantsTable.telegramId, targetId)
    ))
    .returning();

  res.json(updated);
});

/* ── End space (host) ────────────────────────────────────────────────────── */
router.delete("/spaces/:id", async (req, res): Promise<void> => {
  const telegramId = req.headers["x-telegram-id"] as string | undefined;
  const id = parseInt(req.params.id, 10);
  if (!telegramId || isNaN(id)) { res.status(400).json({ error: "Bad request" }); return; }

  const [space] = await db.select().from(spacesTable).where(eq(spacesTable.id, id));
  if (!space) { res.status(404).json({ error: "Not found" }); return; }

  const isHost = space.hostTelegramId === telegramId || ADMIN_IDS.includes(telegramId);
  if (!isHost) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.update(spacesTable).set({ status: "ended", endedAt: new Date() }).where(eq(spacesTable.id, id));
  res.json({ ok: true });
});

/* ── WebRTC: get pending signals for me ─────────────────────────────────── */
router.get("/spaces/:id/signals", async (req, res): Promise<void> => {
  const telegramId = req.headers["x-telegram-id"] as string | undefined;
  const id = parseInt(req.params.id, 10);
  if (!telegramId || isNaN(id)) { res.status(400).json({ error: "Bad request" }); return; }

  const signals = await db
    .select()
    .from(spaceSignalsTable)
    .where(and(
      eq(spaceSignalsTable.spaceId, id),
      eq(spaceSignalsTable.toTelegramId, telegramId),
      eq(spaceSignalsTable.processed, false)
    ))
    .orderBy(spaceSignalsTable.createdAt);

  await db.update(spaceSignalsTable)
    .set({ processed: true })
    .where(and(
      eq(spaceSignalsTable.spaceId, id),
      eq(spaceSignalsTable.toTelegramId, telegramId),
      eq(spaceSignalsTable.processed, false)
    ));

  res.json(signals);
});

/* ── WebRTC: post a signal ───────────────────────────────────────────────── */
router.post("/spaces/:id/signals", async (req, res): Promise<void> => {
  const telegramId = req.headers["x-telegram-id"] as string | undefined;
  const id = parseInt(req.params.id, 10);
  if (!telegramId || isNaN(id)) { res.status(400).json({ error: "Bad request" }); return; }

  const { toPeerId, type, payload } = req.body as {
    toPeerId?: string;
    type?: string;
    payload?: string;
  };

  if (!toPeerId || !type || !payload) {
    res.status(400).json({ error: "Missing fields" }); return;
  }

  const [signal] = await db.insert(spaceSignalsTable).values({
    spaceId: id,
    fromTelegramId: telegramId,
    toTelegramId: toPeerId,
    type,
    payload,
    processed: false,
  }).returning();

  res.status(201).json(signal);
});

export default router;
