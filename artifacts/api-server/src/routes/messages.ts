import { Router } from "express";
import { db, eq, and, or, isNull, inArray, desc, usersTable, messagesTable } from "@workspace/db";

const router = Router();

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
    const pid = msg.fromTelegramId === myId ? msg.toTelegramId : msg.fromTelegramId;
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
      aliId:       p?.aliId ?? "",
      civicRole:   p?.civicRole ?? null,
      rank:        p?.rank ?? "Initiate",
      level:       p?.level ?? 1,
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
  if (!toTelegramId || typeof toTelegramId !== "string")       { res.status(400).json({ error: "toTelegramId required" }); return; }
  if (!content || typeof content !== "string" || !content.trim()) { res.status(400).json({ error: "content required" }); return; }
  if (myId === toTelegramId)                                    { res.status(400).json({ error: "لا يمكنك مراسلة نفسك" }); return; }
  const trimmed = content.trim();
  if (trimmed.length > 1000)                                    { res.status(400).json({ error: "الرسالة طويلة جداً (1000 حرف كحد أقصى)" }); return; }

  const [recipient] = await db
    .select({ telegramId: usersTable.telegramId })
    .from(usersTable)
    .where(eq(usersTable.telegramId, toTelegramId));
  if (!recipient) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }

  const [msg] = await db
    .insert(messagesTable)
    .values({ fromTelegramId: myId, toTelegramId, content: trimmed })
    .returning();

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

export default router;
