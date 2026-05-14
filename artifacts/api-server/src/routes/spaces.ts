import { Router } from "express";
import {
  db, eq, and, or, gte, usersTable,
  spacesTable, spaceParticipantsTable, spaceSignalsTable, spaceInvitesTable,
} from "@workspace/db";
import { ADMIN_IDS } from "../lib/admin";

const router = Router();

async function getUser(telegramId: string) {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId));
  return u;
}

function canHost(user: Awaited<ReturnType<typeof getUser>>, telegramId: string) {
  if (!user) return false;
  return ADMIN_IDS.includes(telegramId) || user.role === "staff" || user.role === "admin";
}

/* ── List spaces ─────────────────────────────────────────────────────────── */
router.get("/spaces", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const all = await db
    .select()
    .from(spacesTable)
    .where(
      or(
        eq(spacesTable.status, "live"),
        eq(spacesTable.status, "scheduled"),
        and(eq(spacesTable.status, "ended"), gte(spacesTable.endedAt, cutoff))
      )
    )
    .orderBy(spacesTable.createdAt);

  // Determine which private spaces the caller is a member of (or has an invite for)
  let memberSpaceIds = new Set<number>();
  if (telegramId) {
    const participations = await db
      .select({ spaceId: spaceParticipantsTable.spaceId })
      .from(spaceParticipantsTable)
      .where(eq(spaceParticipantsTable.telegramId, telegramId));
    const invites = await db
      .select({ spaceId: spaceInvitesTable.spaceId })
      .from(spaceInvitesTable)
      .where(eq(spaceInvitesTable.inviteeTelegramId, telegramId));
    memberSpaceIds = new Set([
      ...participations.map(p => p.spaceId),
      ...invites.map(i => i.spaceId),
    ]);
  }

  const visible = all.filter(s =>
    !s.isPrivate ||
    (telegramId && (s.hostTelegramId === telegramId || memberSpaceIds.has(s.id))) ||
    (telegramId && ADMIN_IDS.includes(telegramId))
  );

  const withCounts = await Promise.all(
    visible.map(async (s) => {
      const participants = await db
        .select()
        .from(spaceParticipantsTable)
        .where(eq(spaceParticipantsTable.spaceId, s.id));
      return { ...s, participantCount: participants.length };
    })
  );

  res.json(withCounts);
});

/* ── Create space ────────────────────────────────────────────────────────── */
router.post("/spaces", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const user = await getUser(telegramId);
  if (!canHost(user, telegramId)) {
    res.status(403).json({ error: "صلاحية إنشاء المجالس للفريق المنتخب فقط" }); return;
  }

  const { title, description, scheduledAt, isPrivate } = req.body as {
    title?: string;
    description?: string;
    scheduledAt?: string;
    isPrivate?: boolean;
  };

  if (!title?.trim()) { res.status(400).json({ error: "العنوان مطلوب" }); return; }
  if (title.length > 100) { res.status(400).json({ error: "العنوان طويل جداً" }); return; }

  let parsedAt: Date | null = null;
  if (scheduledAt) {
    parsedAt = new Date(scheduledAt);
    if (isNaN(parsedAt.getTime())) { res.status(400).json({ error: "scheduledAt غير صالح" }); return; }
  }

  const [space] = await db.insert(spacesTable).values({
    title: title.trim(),
    description: description?.trim().slice(0, 500) ?? null,
    hostTelegramId: telegramId,
    hostPseudonym:  user!.pseudonym,
    hostAliId:      user!.aliId,
    status:         parsedAt ? "scheduled" : "live",
    isPrivate:      isPrivate === true,
    scheduledAt:    parsedAt,
    startedAt:      parsedAt ? null : new Date(),
  }).returning();

  await db.insert(spaceParticipantsTable).values({
    spaceId: space.id, telegramId,
    pseudonym: user!.pseudonym, aliId: user!.aliId,
    role: "host", isMuted: false, raisedHand: false,
  });

  res.status(201).json(space);
});

/* ── Get space details ───────────────────────────────────────────────────── */
router.get("/spaces/:id", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [space] = await db.select().from(spacesTable).where(eq(spacesTable.id, id));
  if (!space) { res.status(404).json({ error: "Space not found" }); return; }

  if (space.isPrivate) {
    const canAccess = telegramId && (
      ADMIN_IDS.includes(telegramId) ||
      space.hostTelegramId === telegramId ||
      await db.select().from(spaceParticipantsTable)
        .where(and(eq(spaceParticipantsTable.spaceId, id), eq(spaceParticipantsTable.telegramId, telegramId)))
        .then(rows => rows.length > 0) ||
      await db.select().from(spaceInvitesTable)
        .where(and(eq(spaceInvitesTable.spaceId, id), eq(spaceInvitesTable.inviteeTelegramId, telegramId)))
        .then(rows => rows.length > 0)
    );
    if (!canAccess) { res.status(404).json({ error: "Space not found" }); return; }
  }

  const participants = await db
    .select()
    .from(spaceParticipantsTable)
    .where(eq(spaceParticipantsTable.spaceId, id))
    .orderBy(spaceParticipantsTable.joinedAt);

  res.json({ ...space, participants });
});

/* ── Start scheduled space ───────────────────────────────────────────────── */
router.post("/spaces/:id/start", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  const id = parseInt(req.params.id, 10);
  if (!telegramId || isNaN(id)) { res.status(400).json({ error: "Bad request" }); return; }

  const [space] = await db.select().from(spacesTable).where(eq(spacesTable.id, id));
  if (!space) { res.status(404).json({ error: "Not found" }); return; }
  if (space.hostTelegramId !== telegramId && !ADMIN_IDS.includes(telegramId)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const [updated] = await db.update(spacesTable)
    .set({ status: "live", startedAt: new Date() })
    .where(eq(spacesTable.id, id))
    .returning();

  res.json(updated);
});

/* ── Join space ──────────────────────────────────────────────────────────── */
router.post("/spaces/:id/join", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const user = await getUser(telegramId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [space] = await db.select().from(spacesTable).where(eq(spacesTable.id, id));
  if (!space || space.status === "ended") { res.status(404).json({ error: "المجلس غير متاح" }); return; }

  const [existing] = await db.select().from(spaceParticipantsTable).where(
    and(eq(spaceParticipantsTable.spaceId, id), eq(spaceParticipantsTable.telegramId, telegramId))
  );

  if (existing) {
    const [updated] = await db.update(spaceParticipantsTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(spaceParticipantsTable.id, existing.id))
      .returning();
    const participants = await db.select().from(spaceParticipantsTable).where(eq(spaceParticipantsTable.spaceId, id));
    res.json({ participant: updated, space, participants });
    return;
  }

  if (space.isPrivate && space.hostTelegramId !== telegramId) {
    const [invite] = await db.select().from(spaceInvitesTable).where(
      and(eq(spaceInvitesTable.spaceId, id), eq(spaceInvitesTable.inviteeTelegramId, telegramId))
    );
    if (!invite) { res.status(403).json({ error: "هذه الجلسة خاصة — تحتاج دعوة للانضمام" }); return; }
  }

  const [participant] = await db.insert(spaceParticipantsTable).values({
    spaceId: id, telegramId,
    pseudonym: user.pseudonym, aliId: user.aliId,
    role: "listener", isMuted: true, raisedHand: false,
  }).returning();

  const participants = await db.select().from(spaceParticipantsTable).where(eq(spaceParticipantsTable.spaceId, id));
  res.json({ participant, space, participants });
});

/* ── Heartbeat ───────────────────────────────────────────────────────────── */
router.post("/spaces/:id/heartbeat", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  const id = parseInt(req.params.id, 10);
  if (!telegramId || isNaN(id)) { res.status(400).json({ error: "Bad request" }); return; }

  await db.update(spaceParticipantsTable)
    .set({ lastSeenAt: new Date() })
    .where(and(eq(spaceParticipantsTable.spaceId, id), eq(spaceParticipantsTable.telegramId, telegramId)));

  res.json({ ok: true });
});

/* ── Leave space ─────────────────────────────────────────────────────────── */
router.post("/spaces/:id/leave", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  const id = parseInt(req.params.id, 10);
  if (!telegramId || isNaN(id)) { res.status(400).json({ error: "Bad request" }); return; }

  await db.delete(spaceParticipantsTable).where(
    and(eq(spaceParticipantsTable.spaceId, id), eq(spaceParticipantsTable.telegramId, telegramId))
  );

  const [space] = await db.select().from(spacesTable).where(eq(spacesTable.id, id));
  if (space?.hostTelegramId === telegramId) {
    await db.update(spacesTable).set({ status: "ended", endedAt: new Date() }).where(eq(spacesTable.id, id));
    await db.delete(spaceParticipantsTable).where(eq(spaceParticipantsTable.spaceId, id));
  }

  res.json({ ok: true });
});

/* ── Raise / lower hand ──────────────────────────────────────────────────── */
router.post("/spaces/:id/raise-hand", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
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

/* ── Update participant (host only) ──────────────────────────────────────── */
router.patch("/spaces/:id/participants/:tgId", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  const id       = parseInt(req.params.id, 10);
  const targetId = req.params.tgId;
  if (!telegramId || isNaN(id)) { res.status(400).json({ error: "Bad request" }); return; }

  const [space] = await db.select().from(spacesTable).where(eq(spacesTable.id, id));
  if (!space) { res.status(404).json({ error: "Not found" }); return; }

  if (space.hostTelegramId !== telegramId && !ADMIN_IDS.includes(telegramId)) {
    res.status(403).json({ error: "ليس لديك صلاحية إدارة المشاركين" }); return;
  }

  const { role, isMuted, raisedHand } = req.body as { role?: string; isMuted?: boolean; raisedHand?: boolean };
  const updates: Record<string, unknown> = {};
  if (role      !== undefined) updates.role      = role;
  if (isMuted   !== undefined) updates.isMuted   = isMuted;
  if (raisedHand !== undefined) updates.raisedHand = raisedHand;

  const [updated] = await db.update(spaceParticipantsTable)
    .set(updates)
    .where(and(eq(spaceParticipantsTable.spaceId, id), eq(spaceParticipantsTable.telegramId, targetId)))
    .returning();

  res.json(updated);
});

/* ── End space (host) ────────────────────────────────────────────────────── */
router.delete("/spaces/:id", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  const id = parseInt(req.params.id, 10);
  if (!telegramId || isNaN(id)) { res.status(400).json({ error: "Bad request" }); return; }

  const [space] = await db.select().from(spacesTable).where(eq(spacesTable.id, id));
  if (!space) { res.status(404).json({ error: "Not found" }); return; }

  if (space.hostTelegramId !== telegramId && !ADMIN_IDS.includes(telegramId)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  await db.update(spacesTable).set({ status: "ended", endedAt: new Date() }).where(eq(spacesTable.id, id));
  res.json({ ok: true });
});

/* ── WebRTC: get signals ─────────────────────────────────────────────────── */
router.get("/spaces/:id/signals", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  const id = parseInt(req.params.id, 10);
  if (!telegramId || isNaN(id)) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [participant] = await db.select().from(spaceParticipantsTable).where(
    and(eq(spaceParticipantsTable.spaceId, id), eq(spaceParticipantsTable.telegramId, telegramId))
  );
  if (!participant) { res.status(403).json({ error: "Not a participant in this space" }); return; }

  const signals = await db
    .select()
    .from(spaceSignalsTable)
    .where(and(
      eq(spaceSignalsTable.spaceId, id),
      eq(spaceSignalsTable.toTelegramId, telegramId),
      eq(spaceSignalsTable.processed, false)
    ))
    .orderBy(spaceSignalsTable.createdAt);

  if (signals.length > 0) {
    await db.update(spaceSignalsTable)
      .set({ processed: true })
      .where(and(
        eq(spaceSignalsTable.spaceId, id),
        eq(spaceSignalsTable.toTelegramId, telegramId),
        eq(spaceSignalsTable.processed, false)
      ));
  }

  res.json(signals);
});

/* ── WebRTC: post signal ─────────────────────────────────────────────────── */
router.post("/spaces/:id/signals", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  const id = parseInt(req.params.id, 10);
  if (!telegramId || isNaN(id)) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { toPeerId, type, payload } = req.body as { toPeerId?: string; type?: string; payload?: string };
  if (!toPeerId || !type || !payload) { res.status(400).json({ error: "Missing fields" }); return; }
  if (payload.length > 65535) { res.status(413).json({ error: "Signal payload too large" }); return; }

  const [senderParticipant] = await db.select().from(spaceParticipantsTable).where(
    and(eq(spaceParticipantsTable.spaceId, id), eq(spaceParticipantsTable.telegramId, telegramId))
  );
  if (!senderParticipant) { res.status(403).json({ error: "Not a participant in this space" }); return; }

  const [recipientParticipant] = await db.select().from(spaceParticipantsTable).where(
    and(eq(spaceParticipantsTable.spaceId, id), eq(spaceParticipantsTable.telegramId, toPeerId))
  );
  if (!recipientParticipant) { res.status(403).json({ error: "Recipient is not a participant in this space" }); return; }

  const [signal] = await db.insert(spaceSignalsTable).values({
    spaceId: id, fromTelegramId: telegramId,
    toTelegramId: toPeerId, type, payload, processed: false,
  }).returning();

  res.status(201).json(signal);
});

export default router;
