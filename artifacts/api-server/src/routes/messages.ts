import { Router } from "express";
import type { Response } from "express";
import {
  db, eq, and, or, isNull, inArray, desc, sql,
  usersTable, messagesTable, blocksTable,
} from "@workspace/db";
import { issueTicket, consumeTicket } from "../lib/sse-ticket.js";
const router = Router();

// ── SSE client registry ───────────────────────────────────────────────────────
const sseClients = new Map<string, Set<Response>>();

function addSSEClient(telegramId: string, res: Response) {
  if (!sseClients.has(telegramId)) sseClients.set(telegramId, new Set());
  sseClients.get(telegramId)!.add(res);
}

function removeSSEClient(telegramId: string, res: Response) {
  sseClients.get(telegramId)?.delete(res);
  if ((sseClients.get(telegramId)?.size ?? 0) === 0) sseClients.delete(telegramId);
}

function pushSSE(telegramId: string, event: string, data: object) {
  const clients = sseClients.get(telegramId);
  if (!clients || clients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of [...clients]) {
    try { res.write(payload); } catch { removeSSEClient(telegramId, res); }
  }
}

/* ── SSE ticket for messages ─────────────────────────────────────────────── */
router.post("/messages/sse-ticket", (req, res): void => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const ticket = issueTicket(telegramId, 0);
  res.json({ ticket });
});

/* ── SSE: real-time message stream ────────────────────────────────────────── */
router.get("/messages/events", async (req, res): Promise<void> => {
  const ticketId = req.query.ticket as string | undefined;
  if (!ticketId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const telegramId = consumeTicket(ticketId, 0);
  if (!telegramId) { res.status(401).json({ error: "Invalid or expired ticket" }); return; }

  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write(": connected\n\n");

  addSSEClient(telegramId, res);

  const keepalive = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(keepalive); }
  }, 25_000);

  req.on("close", () => {
    clearInterval(keepalive);
    removeSSEClient(telegramId, res);
  });
});

/* ── Unread count ────────────────────────────────────────────────────────── */
router.get("/messages/unread-count", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(and(eq(messagesTable.toTelegramId, myId), isNull(messagesTable.readAt)));

  res.json({ count: result?.count ?? 0 });
});

/* ── Conversation list ───────────────────────────────────────────────────── */
router.get("/messages/conversations", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(or(eq(messagesTable.fromTelegramId, myId), eq(messagesTable.toTelegramId, myId)))
    .orderBy(desc(messagesTable.createdAt));

  type ConvEntry = { lastMsg: (typeof msgs)[0]; unread: number };
  const convMap = new Map<string, ConvEntry>();
  for (const msg of msgs) {
    const pid   = msg.fromTelegramId === myId ? msg.toTelegramId : msg.fromTelegramId;
    const entry = convMap.get(pid);
    if (!entry) {
      convMap.set(pid, { lastMsg: msg, unread: msg.toTelegramId === myId && !msg.readAt ? 1 : 0 });
    } else if (msg.toTelegramId === myId && !msg.readAt) {
      entry.unread++;
    }
  }

  const partnerIds = [...convMap.keys()];
  if (partnerIds.length === 0) { res.json([]); return; }

  const partners = await db
    .select({
      telegramId: usersTable.telegramId,
      pseudonym:  usersTable.pseudonym,
      aliId:      usersTable.aliId,
      civicRole:  usersTable.civicRole,
      rank:       usersTable.rank,
      level:      usersTable.level,
    })
    .from(usersTable)
    .where(inArray(usersTable.telegramId, partnerIds));

  const pmap = new Map(partners.map(p => [p.telegramId, p]));

  const conversations = partnerIds.map(pid => {
    const { lastMsg, unread } = convMap.get(pid)!;
    const p = pmap.get(pid);
    return {
      partnerId:   pid,
      pseudonym:   p?.pseudonym ?? "Unknown",
      aliId:       p?.aliId    ?? "",
      civicRole:   p?.civicRole ?? null,
      rank:        p?.rank     ?? "Initiate",
      level:       p?.level    ?? 1,
      lastMessage: lastMsg.content,
      lastAt:      lastMsg.createdAt,
      unread,
      isMine:      lastMsg.fromTelegramId === myId,
    };
  });

  res.json(conversations);
});

/* ── Message thread ──────────────────────────────────────────────────────── */
router.get("/messages/thread/:partnerId", async (req, res): Promise<void> => {
  const myId      = req.telegramId;
  const partnerId = req.params.partnerId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const limit  = Math.min(parseInt((req.query.limit  as string) || "100", 10), 200);
  const offset = Math.max(parseInt((req.query.offset as string) || "0",   10), 0);

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(
      or(
        and(eq(messagesTable.fromTelegramId, myId),      eq(messagesTable.toTelegramId, partnerId)),
        and(eq(messagesTable.fromTelegramId, partnerId), eq(messagesTable.toTelegramId, myId))
      )
    )
    .orderBy(messagesTable.createdAt)
    .limit(limit)
    .offset(offset);

  res.json(msgs);
});

/* ── Send message ────────────────────────────────────────────────────────── */
router.post("/messages/send", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { toTelegramId, content } = req.body as { toTelegramId?: string; content?: string };
  if (!toTelegramId || typeof toTelegramId !== "string")
    { res.status(400).json({ error: "toTelegramId required" }); return; }
  if (!content || typeof content !== "string" || !content.trim())
    { res.status(400).json({ error: "content required" }); return; }
  if (myId === toTelegramId)
    { res.status(400).json({ error: "لا يمكنك مراسلة نفسك" }); return; }

  const trimmed = content.trim();
  if (trimmed.length > 1000)
    { res.status(400).json({ error: "الرسالة طويلة جداً (1000 حرف كحد أقصى)" }); return; }

  // Check if sender is blocked by recipient
  const [blocked] = await db
    .select({ id: blocksTable.id })
    .from(blocksTable)
    .where(
      and(
        eq(blocksTable.blockerTelegramId, toTelegramId),
        eq(blocksTable.blockedTelegramId, myId)
      )
    );
  if (blocked) { res.status(403).json({ error: "لا يمكن إرسال الرسالة" }); return; }

  // Verify recipient exists
  const [recipient] = await db
    .select({ telegramId: usersTable.telegramId })
    .from(usersTable)
    .where(eq(usersTable.telegramId, toTelegramId));
  if (!recipient) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }

  const [msg] = await db
    .insert(messagesTable)
    .values({ fromTelegramId: myId, toTelegramId, content: trimmed })
    .returning();

  // Real-time: push SSE event to recipient
  pushSSE(toTelegramId, "new_message", { fromTelegramId: myId });

  res.status(201).json(msg);
});

/* ── Mark thread as read ─────────────────────────────────────────────────── */
router.post("/messages/read/:partnerId", async (req, res): Promise<void> => {
  const myId      = req.telegramId;
  const partnerId = req.params.partnerId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  await db
    .update(messagesTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messagesTable.fromTelegramId, partnerId),
        eq(messagesTable.toTelegramId, myId),
        isNull(messagesTable.readAt)
      )
    );

  res.json({ ok: true });
});

/* ── Delete single message (sender only) ────────────────────────────────── */
router.delete("/messages/:id", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  const id   = parseInt(req.params.id, 10);
  if (!myId)   { res.status(401).json({ error: "Unauthorized" }); return; }
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [deleted] = await db
    .delete(messagesTable)
    .where(and(eq(messagesTable.id, id), eq(messagesTable.fromTelegramId, myId)))
    .returning({ id: messagesTable.id });

  if (!deleted) { res.status(404).json({ error: "Not found or not yours" }); return; }
  res.json({ ok: true });
});

/* ── Delete conversation ─────────────────────────────────────────────────── */
router.delete("/messages/thread/:partnerId", async (req, res): Promise<void> => {
  const myId      = req.telegramId;
  const partnerId = req.params.partnerId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  await db
    .delete(messagesTable)
    .where(
      or(
        and(eq(messagesTable.fromTelegramId, myId),      eq(messagesTable.toTelegramId, partnerId)),
        and(eq(messagesTable.fromTelegramId, partnerId), eq(messagesTable.toTelegramId, myId))
      )
    );

  res.json({ ok: true });
});

export default router;
