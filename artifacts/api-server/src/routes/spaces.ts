import { Router } from "express";
import type { Response } from "express";
import {
  db, eq, and, or, gte, count, inArray, usersTable,
  spacesTable, spaceParticipantsTable, spaceSignalsTable, spaceInvitesTable,
} from "@workspace/db";
import { ADMIN_IDS } from "../lib/admin";
import { issueTicket, consumeTicket } from "../lib/sse-ticket";
import { sendBotNotification } from "../lib/telegram-notify";

const router = Router();

// ── SSE registries ──────────────────────────────────────────────────────────
// signalClients: spaceId → telegramId → SSE Response
const signalClients      = new Map<number, Map<string, Response>>();
// participantClients: spaceId → telegramId → SSE Response
const participantClients = new Map<number, Map<string, Response>>();

// Note: SSE authentication uses short-lived single-use tickets issued via
// POST /api/spaces/:id/sse-ticket (validated through the normal auth header).
// This avoids exposing Telegram initData in URLs, logs, and proxy access logs.

/** Push a single WebRTC signal to the recipient's SSE connection (if open). */
function pushSignalSSE(spaceId: number, toTelegramId: string, signal: object) {
  const res = signalClients.get(spaceId)?.get(toTelegramId);
  if (!res) return;
  try { res.write(`event: signal\ndata: ${JSON.stringify(signal)}\n\n`); } catch {}
}

/** Fetch participants (enriched with photoUrl + civicRole from users) and broadcast. */
async function broadcastParticipants(spaceId: number) {
  const clients = participantClients.get(spaceId);
  if (!clients || clients.size === 0) return;
  const rows = await db
    .select({
      id:          spaceParticipantsTable.id,
      spaceId:     spaceParticipantsTable.spaceId,
      telegramId:  spaceParticipantsTable.telegramId,
      pseudonym:   spaceParticipantsTable.pseudonym,
      aliId:       spaceParticipantsTable.aliId,
      role:        spaceParticipantsTable.role,
      isMuted:     spaceParticipantsTable.isMuted,
      raisedHand:  spaceParticipantsTable.raisedHand,
      joinedAt:    spaceParticipantsTable.joinedAt,
      lastSeenAt:  spaceParticipantsTable.lastSeenAt,
      photoUrl:    usersTable.photoUrl,
      civicRole:   usersTable.civicRole,
    })
    .from(spaceParticipantsTable)
    .leftJoin(usersTable, eq(spaceParticipantsTable.telegramId, usersTable.telegramId))
    .where(eq(spaceParticipantsTable.spaceId, spaceId))
    .orderBy(spaceParticipantsTable.joinedAt);
  const payload = `event: participants\ndata: ${JSON.stringify(rows)}\n\n`;
  for (const [, res] of clients) {
    try { res.write(payload); } catch {}
  }
}

/** Push a space-ended event to all participant SSE clients. */
function broadcastSpaceEnded(spaceId: number) {
  const clients = participantClients.get(spaceId);
  if (!clients || clients.size === 0) return;
  for (const [, res] of clients) {
    try { res.write(`event: ended\ndata: {}\n\n`); } catch {}
  }
}

// ── DB helpers ───────────────────────────────────────────────────────────────
async function getUser(telegramId: string) {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId));
  return u;
}

function canHost(user: Awaited<ReturnType<typeof getUser>>, telegramId: string) {
  if (!user) return false;
  return ADMIN_IDS.includes(telegramId) || user.role === "staff" || user.role === "admin";
}

/* ══ ICE server configuration ═══════════════════════════════════════════════ */
/**
 * GET /api/spaces/ice-servers
 * Returns STUN/TURN server list for WebRTC.
 * Includes Telegram's STUN server for compatibility + optional TURN from env.
 */
router.get("/spaces/ice-servers", (_req, res): void => {
  const servers: Array<{ urls: string; username?: string; credential?: string }> = [
    { urls: "stun:stun.telegram.org:443" },   // Telegram's STUN — same infra as TG voice
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" }, // Cloudflare STUN
  ];

  // Optional TURN server from environment (set TURN_URL, TURN_USERNAME, TURN_CREDENTIAL)
  const turnUrl  = process.env.TURN_URL;
  const turnUser = process.env.TURN_USERNAME;
  const turnCred = process.env.TURN_CREDENTIAL;
  if (turnUrl && turnUser && turnCred) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
    // Also add TCP variant for firewalled networks
    const tcpUrl = turnUrl.replace(/^turn:/, "turn:").replace(/:\d+$/, ":443");
    if (tcpUrl !== turnUrl) {
      servers.push({ urls: `${tcpUrl}?transport=tcp`, username: turnUser, credential: turnCred });
    }
  }

  res.json({ iceServers: servers });
});

/* ══ SSE ticket issuance ════════════════════════════════════════════════════ */
/**
 * POST /api/spaces/:id/sse-ticket
 * Issues a short-lived (30 s), single-use UUID ticket authenticated via the
 * standard x-telegram-init-data header.  The client presents this ticket as
 * ?ticket=<uuid> in the EventSource URL so that sensitive initData is never
 * written into URLs, logs, browser history, or proxy access logs.
 */
router.post("/spaces/:id/sse-ticket", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  const id = parseInt(req.params.id, 10);
  if (!telegramId || isNaN(id)) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [participant] = await db.select().from(spaceParticipantsTable).where(
    and(eq(spaceParticipantsTable.spaceId, id), eq(spaceParticipantsTable.telegramId, telegramId))
  );
  if (!participant) { res.status(403).json({ error: "Not a participant" }); return; }

  const ticket = issueTicket(telegramId, id);
  res.json({ ticket });
});

/* ══ SSE: real-time WebRTC signal stream ════════════════════════════════════ */
/**
 * GET /api/spaces/:id/signals/sse?ticket=<uuid>
 * Long-lived SSE connection that pushes WebRTC signals in real-time.
 * Auth: short-lived ticket from POST /api/spaces/:id/sse-ticket (single-use, 30 s TTL).
 * Flushes any pending DB signals on connect for reconnect resilience.
 */
router.get("/spaces/:id/signals/sse", async (req, res): Promise<void> => {
  const id     = parseInt(req.params.id, 10);
  const ticketId = req.query.ticket as string | undefined;
  if (!ticketId || isNaN(id)) { res.status(401).json({ error: "Unauthorized" }); return; }

  const telegramId = consumeTicket(ticketId, id);
  if (!telegramId) { res.status(401).json({ error: "Invalid or expired ticket" }); return; }

  const [participant] = await db.select().from(spaceParticipantsTable).where(
    and(eq(spaceParticipantsTable.spaceId, id), eq(spaceParticipantsTable.telegramId, telegramId))
  );
  if (!participant) { res.status(403).json({ error: "Not a participant" }); return; }

  res.setHeader("Content-Type",      "text/event-stream");
  res.setHeader("Cache-Control",     "no-cache, no-transform");
  res.setHeader("Connection",        "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write(": connected\n\n");

  if (!signalClients.has(id)) signalClients.set(id, new Map());
  signalClients.get(id)!.set(telegramId, res);

  // Flush any pending unprocessed signals from DB (handles reconnect after SSE drop)
  const pending = await db
    .select()
    .from(spaceSignalsTable)
    .where(and(
      eq(spaceSignalsTable.spaceId, id),
      eq(spaceSignalsTable.toTelegramId, telegramId),
      eq(spaceSignalsTable.processed, false),
    ))
    .orderBy(spaceSignalsTable.createdAt);
  if (pending.length > 0) {
    for (const sig of pending) {
      res.write(`event: signal\ndata: ${JSON.stringify(sig)}\n\n`);
    }
    await db.update(spaceSignalsTable)
      .set({ processed: true })
      .where(and(
        eq(spaceSignalsTable.spaceId, id),
        eq(spaceSignalsTable.toTelegramId, telegramId),
        eq(spaceSignalsTable.processed, false),
      ));
  }

  const ka = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(ka); }
  }, 25_000);

  req.on("close", () => {
    clearInterval(ka);
    signalClients.get(id)?.delete(telegramId);
    if ((signalClients.get(id)?.size ?? 0) === 0) signalClients.delete(id);
  });
});

/* ══ SSE: real-time participant updates ══════════════════════════════════════ */
/**
 * GET /api/spaces/:id/participants/sse?ticket=<uuid>
 * Replaces the 4-second participant polling. Pushes the full participant list
 * on join, leave, promote, mute, and raise-hand.
 * Auth: short-lived ticket from POST /api/spaces/:id/sse-ticket.
 */
router.get("/spaces/:id/participants/sse", async (req, res): Promise<void> => {
  const id       = parseInt(req.params.id, 10);
  const ticketId = req.query.ticket as string | undefined;
  if (!ticketId || isNaN(id)) { res.status(401).json({ error: "Unauthorized" }); return; }

  const telegramId = consumeTicket(ticketId, id);
  if (!telegramId) { res.status(401).json({ error: "Invalid or expired ticket" }); return; }

  res.setHeader("Content-Type",      "text/event-stream");
  res.setHeader("Cache-Control",     "no-cache, no-transform");
  res.setHeader("Connection",        "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write(": connected\n\n");

  if (!participantClients.has(id)) participantClients.set(id, new Map());
  participantClients.get(id)!.set(telegramId, res);

  // Send current participant list immediately (enriched with photoUrl + civicRole)
  const rows = await db
    .select({
      id:         spaceParticipantsTable.id,
      spaceId:    spaceParticipantsTable.spaceId,
      telegramId: spaceParticipantsTable.telegramId,
      pseudonym:  spaceParticipantsTable.pseudonym,
      aliId:      spaceParticipantsTable.aliId,
      role:       spaceParticipantsTable.role,
      isMuted:    spaceParticipantsTable.isMuted,
      raisedHand: spaceParticipantsTable.raisedHand,
      joinedAt:   spaceParticipantsTable.joinedAt,
      lastSeenAt: spaceParticipantsTable.lastSeenAt,
      photoUrl:   usersTable.photoUrl,
      civicRole:  usersTable.civicRole,
    })
    .from(spaceParticipantsTable)
    .leftJoin(usersTable, eq(spaceParticipantsTable.telegramId, usersTable.telegramId))
    .where(eq(spaceParticipantsTable.spaceId, id))
    .orderBy(spaceParticipantsTable.joinedAt);
  res.write(`event: participants\ndata: ${JSON.stringify(rows)}\n\n`);

  const ka = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(ka); }
  }, 25_000);

  req.on("close", () => {
    clearInterval(ka);
    participantClients.get(id)?.delete(telegramId!);
    if ((participantClients.get(id)?.size ?? 0) === 0) participantClients.delete(id);
  });
});

/* ══ List spaces ════════════════════════════════════════════════════════════ */
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

  // Single aggregation query — no N+1
  const visibleIds = visible.map(s => s.id);
  const countRows = visibleIds.length > 0
    ? await db
        .select({
          spaceId:          spaceParticipantsTable.spaceId,
          participantCount: count(spaceParticipantsTable.id),
        })
        .from(spaceParticipantsTable)
        .where(inArray(spaceParticipantsTable.spaceId, visibleIds))
        .groupBy(spaceParticipantsTable.spaceId)
    : [];

  const countMap = new Map(countRows.map(r => [r.spaceId, Number(r.participantCount)]));
  const withCounts = visible.map(s => ({ ...s, participantCount: countMap.get(s.id) ?? 0 }));

  res.json(withCounts);
});

/* ══ Create space ════════════════════════════════════════════════════════════ */
router.post("/spaces", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const user = await getUser(telegramId);
  if (!canHost(user, telegramId)) {
    res.status(403).json({ error: "صلاحية إنشاء المجالس للفريق المنتخب فقط" }); return;
  }

  const { title, description, scheduledAt, isPrivate } = req.body as {
    title?: string; description?: string; scheduledAt?: string; isPrivate?: boolean;
  };

  if (!title?.trim()) { res.status(400).json({ error: "العنوان مطلوب" }); return; }
  if (title.length > 100) { res.status(400).json({ error: "العنوان طويل جداً" }); return; }

  let parsedAt: Date | null = null;
  if (scheduledAt) {
    parsedAt = new Date(scheduledAt);
    if (isNaN(parsedAt.getTime())) { res.status(400).json({ error: "scheduledAt غير صالح" }); return; }
  }

  const [space] = await db.insert(spacesTable).values({
    title:          title.trim(),
    description:    description?.trim().slice(0, 500) ?? null,
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

/* ══ Get space details ═══════════════════════════════════════════════════════ */
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
    .select({
      id:         spaceParticipantsTable.id,
      spaceId:    spaceParticipantsTable.spaceId,
      telegramId: spaceParticipantsTable.telegramId,
      pseudonym:  spaceParticipantsTable.pseudonym,
      aliId:      spaceParticipantsTable.aliId,
      role:       spaceParticipantsTable.role,
      isMuted:    spaceParticipantsTable.isMuted,
      raisedHand: spaceParticipantsTable.raisedHand,
      joinedAt:   spaceParticipantsTable.joinedAt,
      lastSeenAt: spaceParticipantsTable.lastSeenAt,
      photoUrl:   usersTable.photoUrl,
      civicRole:  usersTable.civicRole,
    })
    .from(spaceParticipantsTable)
    .leftJoin(usersTable, eq(spaceParticipantsTable.telegramId, usersTable.telegramId))
    .where(eq(spaceParticipantsTable.spaceId, id))
    .orderBy(spaceParticipantsTable.joinedAt);

  res.json({ ...space, participants });
});

/* ══ Start scheduled space ═══════════════════════════════════════════════════ */
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

/* ══ Join space ═════════════════════════════════════════════════════════════ */
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

  // Check for a pending invite with a speaker role
  const [pendingInvite] = await db.select().from(spaceInvitesTable).where(
    and(eq(spaceInvitesTable.spaceId, id), eq(spaceInvitesTable.inviteeTelegramId, telegramId))
  );
  const assignedRole = pendingInvite?.role === "speaker" ? "speaker" : "listener";

  const [participant] = await db.insert(spaceParticipantsTable).values({
    spaceId: id, telegramId,
    pseudonym: user.pseudonym, aliId: user.aliId,
    role: assignedRole, isMuted: false, raisedHand: false,
  }).returning();

  const participants = await db.select().from(spaceParticipantsTable).where(eq(spaceParticipantsTable.spaceId, id));

  // Notify all SSE clients of new participant
  broadcastParticipants(id).catch(() => {});

  res.json({ participant, space, participants });
});

/* ══ Heartbeat ══════════════════════════════════════════════════════════════ */
router.post("/spaces/:id/heartbeat", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  const id = parseInt(req.params.id, 10);
  if (!telegramId || isNaN(id)) { res.status(400).json({ error: "Bad request" }); return; }

  await db.update(spaceParticipantsTable)
    .set({ lastSeenAt: new Date() })
    .where(and(eq(spaceParticipantsTable.spaceId, id), eq(spaceParticipantsTable.telegramId, telegramId)));

  res.json({ ok: true });
});

/* ══ Leave space ════════════════════════════════════════════════════════════ */
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
    // Notify all clients the space ended
    broadcastSpaceEnded(id);
  } else {
    // Notify remaining clients of updated participant list
    broadcastParticipants(id).catch(() => {});
  }

  res.json({ ok: true });
});

/* ══ Raise / lower hand ═════════════════════════════════════════════════════ */
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

  // Broadcast updated participant list
  broadcastParticipants(id).catch(() => {});

  res.json(updated);
});

/* ══ Update participant (host only) ═════════════════════════════════════════ */
router.patch("/spaces/:id/participants/:tgId", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  const id       = parseInt(req.params.id, 10);
  const targetId = req.params.tgId;
  if (!telegramId || isNaN(id)) { res.status(400).json({ error: "Bad request" }); return; }

  const [space] = await db.select().from(spacesTable).where(eq(spacesTable.id, id));
  if (!space) { res.status(404).json({ error: "Not found" }); return; }

  const { role, isMuted, raisedHand } = req.body as { role?: string; isMuted?: boolean; raisedHand?: boolean };

  const isSelf = telegramId === targetId;
  const isHost = space.hostTelegramId === telegramId;
  const isAdmin = ADMIN_IDS.includes(telegramId);

  // Participants may always update their own mute status
  const isSelfMuteOnly = isSelf && isMuted !== undefined && role === undefined && raisedHand === undefined;

  // Speakers may accept hand-raise requests (promote listener → speaker, clear raisedHand)
  const isCallerSpeaker = !isSelf && await db.select().from(spaceParticipantsTable)
    .where(and(eq(spaceParticipantsTable.spaceId, id), eq(spaceParticipantsTable.telegramId, telegramId!)))
    .then(rows => rows[0]?.role === "speaker");
  const isSpeakerPromotion = isCallerSpeaker && role === "speaker" && isMuted === undefined;

  if (!isHost && !isAdmin && !isSelfMuteOnly && !isSpeakerPromotion) {
    res.status(403).json({ error: "ليس لديك صلاحية إدارة المشاركين" }); return;
  }
  const updates: Record<string, unknown> = {};
  if (role       !== undefined) updates.role       = role;
  if (isMuted    !== undefined) updates.isMuted    = isMuted;
  if (raisedHand !== undefined) updates.raisedHand = raisedHand;

  const [updated] = await db.update(spaceParticipantsTable)
    .set(updates)
    .where(and(eq(spaceParticipantsTable.spaceId, id), eq(spaceParticipantsTable.telegramId, targetId)))
    .returning();

  // Broadcast updated participant list to all SSE clients
  broadcastParticipants(id).catch(() => {});

  res.json(updated);
});

/* ══ End space (host) ═══════════════════════════════════════════════════════ */
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
  broadcastSpaceEnded(id);
  res.json({ ok: true });
});

/* ══ WebRTC: get pending signals (fallback poll endpoint) ═══════════════════ */
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

/* ══ WebRTC: post signal ════════════════════════════════════════════════════ */
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

  // Push to recipient's SSE connection immediately (near-zero latency)
  pushSignalSSE(id, toPeerId, signal);

  res.status(201).json(signal);
});

/* ══ Invite management ══════════════════════════════════════════════════════ */
router.post("/spaces/:id/invite", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  const id = parseInt(req.params.id, 10);
  if (!telegramId || isNaN(id)) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [space] = await db.select().from(spacesTable).where(eq(spacesTable.id, id));
  if (!space) { res.status(404).json({ error: "Not found" }); return; }
  if (space.hostTelegramId !== telegramId && !ADMIN_IDS.includes(telegramId)) {
    res.status(403).json({ error: "Only the host can invite" }); return;
  }

  const { inviteeTelegramId, role = "listener" } = req.body as { inviteeTelegramId?: string; role?: string };
  if (!inviteeTelegramId) { res.status(400).json({ error: "inviteeTelegramId required" }); return; }

  const [invite] = await db.insert(spaceInvitesTable).values({
    spaceId: id, inviterTelegramId: telegramId, inviteeTelegramId, role,
  }).onConflictDoUpdate({
    target: [spaceInvitesTable.spaceId, spaceInvitesTable.inviteeTelegramId],
    set: { role, seen: false },
  }).returning();

  sendBotNotification({
    toTelegramId: inviteeTelegramId,
    text: `🎙 *دعوة إلى مجلس*\n\nدعاك *${space.hostPseudonym}* للانضمام إلى:\n_"${space.title}"_`,
    buttonText: "🚀 الانضمام للمجلس",
    navParam: `space_${id}`,
  });

  res.status(201).json(invite);
});

router.get("/spaces/my-invites", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const invites = await db
    .select()
    .from(spaceInvitesTable)
    .where(and(eq(spaceInvitesTable.inviteeTelegramId, telegramId), eq(spaceInvitesTable.seen, false)));

  if (invites.length === 0) { res.json([]); return; }

  const enriched = await Promise.all(invites.map(async inv => {
    const [space] = await db.select().from(spacesTable).where(eq(spacesTable.id, inv.spaceId));
    if (!space || space.status === "ended") return null;
    return {
      id:            inv.id,
      spaceId:       inv.spaceId,
      role:          inv.role,
      spaceTitle:    space.title,
      spaceStatus:   space.status,
      hostPseudonym: space.hostPseudonym,
    };
  }));

  res.json(enriched.filter(Boolean));
});

router.post("/spaces/invites/:inviteId/accept", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  const inviteId   = parseInt(req.params.inviteId, 10);
  if (!telegramId || isNaN(inviteId)) { res.status(400).json({ error: "Bad request" }); return; }

  const [invite] = await db.select().from(spaceInvitesTable).where(eq(spaceInvitesTable.id, inviteId));
  if (!invite || invite.inviteeTelegramId !== telegramId) {
    res.status(404).json({ error: "Invite not found" }); return;
  }

  await db.update(spaceInvitesTable).set({ seen: true }).where(eq(spaceInvitesTable.id, inviteId));
  res.json({ spaceId: invite.spaceId, role: invite.role });
});

router.post("/spaces/invites/:inviteId/dismiss", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  const inviteId   = parseInt(req.params.inviteId, 10);
  if (!telegramId || isNaN(inviteId)) { res.status(400).json({ error: "Bad request" }); return; }

  await db.update(spaceInvitesTable)
    .set({ seen: true })
    .where(and(eq(spaceInvitesTable.id, inviteId), eq(spaceInvitesTable.inviteeTelegramId, telegramId)));

  res.json({ ok: true });
});

export default router;
