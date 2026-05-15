import { Router } from "express";
import { createHmac } from "crypto";
import type { Response } from "express";
import {
  db, eq, and, or, isNull, inArray, desc,
  usersTable, messagesTable, blocksTable,
} from "@workspace/db";

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

// ── Validate initData from query param (for EventSource SSE connections) ─────
function extractTelegramIdFromQuery(initDataRaw: string): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !initDataRaw) return null;
  try {
    const params    = new URLSearchParams(decodeURIComponent(initDataRaw));
    const hash      = params.get("hash");
    if (!hash) return null;
    params.delete("hash");
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
    const computed  = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    if (computed !== hash) return null;
    const ageSecs = Date.now() / 1000 - Number(params.get("auth_date") ?? 0);
    if (ageSecs > 3600) return null;
    const userStr = params.get("user");
    if (!userStr) return null;
    return String((JSON.parse(userStr) as { id: number }).id);
  } catch { return null; }
}

// ── Telegram notification helper ──────────────────────────────────────────────
function sendTelegramNotification(toTelegramId: string, senderName: string, preview: string) {
  const token   = process.env.TELEGRAM_BOT_TOKEN;
  const domains = (process.env.REPLIT_DOMAINS ?? "").split(",").map(d => d.trim()).filter(Boolean);
  const webApp  = domains[0] ? `https://${domains[0]}` : null;
  if (!token || !webApp) return;

  const text = `💬 *رسالة جديدة*\n\nوصلتك رسالة من *${senderName}*\n_"${preview.slice(0, 60)}${preview.length > 60 ? "…" : ""}"_`;

  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id:      toTelegramId,
      text,
      parse_mode:   "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "📨 فتح البوابة", web_app: { url: webApp } }]],
      },
    }),
  }).catch(() => {});
}

/* ── SSE: real-time message stream ────────────────────────────────────────── */
router.get("/messages/events", async (req, res): Promise<void> => {
  let telegramId = req.telegramId;

  if (!telegramId) {
    const q = req.query.initData as string | undefined;
    if (q) telegramId = extractTelegramIdFromQuery(q) ?? undefined;
  }

  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

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
    if (telegramId) removeSSEClient(telegramId, res);
  });
});

/* ── Unread count ────────────────────────────────────────────────────────── */
router.get("/messages/unread-count", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const rows = await db
    .select({ id: messagesTable.id })
    .from(messagesTable)
    .where(and(eq(messagesTable.toTelegramId, myId), isNull(messagesTable.readAt)));

  res.json({ count: rows.length });
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

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(
      or(
        and(eq(messagesTable.fromTelegramId, myId),      eq(messagesTable.toTelegramId, partnerId)),
        and(eq(messagesTable.fromTelegramId, partnerId), eq(messagesTable.toTelegramId, myId))
      )
    )
    .orderBy(messagesTable.createdAt);

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

  // Async: send Telegram bot notification to recipient
  const [sender] = await db
    .select({ pseudonym: usersTable.pseudonym })
    .from(usersTable)
    .where(eq(usersTable.telegramId, myId));
  sendTelegramNotification(toTelegramId, sender?.pseudonym ?? "عضو", trimmed);

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
