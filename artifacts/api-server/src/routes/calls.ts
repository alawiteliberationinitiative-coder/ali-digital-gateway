import { Router } from "express";
import type { Response } from "express";
import {
  db, eq, and, sql,
  usersTable, presenceTable, callsTable, callSignalsTable, blocksTable,
} from "@workspace/db";
import { issueTicket, consumeTicket } from "../lib/sse-ticket.js";

const router = Router();
const PRESENCE_TTL_MS = 35_000;

// ── SSE client registry ───────────────────────────────────────────────────────
const callClients = new Map<string, Set<Response>>();

function addCallClient(id: string, res: Response) {
  if (!callClients.has(id)) callClients.set(id, new Set());
  callClients.get(id)!.add(res);
}
function removeCallClient(id: string, res: Response) {
  callClients.get(id)?.delete(res);
  if ((callClients.get(id)?.size ?? 0) === 0) callClients.delete(id);
}
function pushCallSSE(id: string, event: string, data: object): boolean {
  const clients = callClients.get(id);
  if (!clients?.size) return false;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of [...clients]) {
    try { res.write(payload); } catch { removeCallClient(id, res); }
  }
  return true;
}
function isOnline(updatedAt: Date) {
  return Date.now() - updatedAt.getTime() < PRESENCE_TTL_MS;
}

/* ── Presence heartbeat ──────────────────────────────────────────────────── */
router.post("/calls/presence", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rawCtx = (req.body as { context?: string }).context ?? "app";
  const context = String(rawCtx).slice(0, 32); // guard against oversized strings
  try {
    await db.insert(presenceTable)
      .values({ telegramId: myId, context, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: presenceTable.telegramId,
        set: { context, updatedAt: new Date() },
      });
  } catch { /* table may not exist yet */ }
  res.json({ ok: true });
});

/* ── SSE ticket ──────────────────────────────────────────────────────────── */
router.post("/calls/events-ticket", (req, res): void => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }
  res.json({ ticket: issueTicket(telegramId, -2) });
});

/* ── SSE stream ──────────────────────────────────────────────────────────── */
router.get("/calls/events", (req, res): void => {
  const ticketId = req.query.ticket as string | undefined;
  if (!ticketId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const telegramId = consumeTicket(ticketId, -2);
  if (!telegramId) { res.status(401).json({ error: "Invalid or expired ticket" }); return; }

  res.setHeader("Content-Type",       "text/event-stream");
  res.setHeader("Cache-Control",      "no-cache, no-transform");
  res.setHeader("Connection",         "keep-alive");
  res.setHeader("X-Accel-Buffering",  "no");
  res.flushHeaders();
  res.write(": connected\n\n");

  addCallClient(telegramId, res);
  const keepalive = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(keepalive); }
  }, 25_000);
  req.on("close", () => { clearInterval(keepalive); removeCallClient(telegramId, res); });
});

/* ── Missed call count (badge) ───────────────────────────────────────────── */
router.get("/calls/missed-count", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(callsTable)
      .where(and(
        eq(callsTable.calleeId, myId),
        eq(callsTable.status, "missed"),
        eq(callsTable.seenByCallee, false),
      ));
    res.json({ count: result?.count ?? 0 });
  } catch {
    res.json({ count: 0 });
  }
});

/* ── Mark missed calls as seen (clears badge) ────────────────────────────── */
router.post("/calls/missed-seen", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    await db
      .update(callsTable)
      .set({ seenByCallee: true })
      .where(and(
        eq(callsTable.calleeId, myId),
        eq(callsTable.status, "missed"),
        eq(callsTable.seenByCallee, false),
      ));
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

/* ── Initiate call ───────────────────────────────────────────────────────── */
router.post("/calls/initiate", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  if (!myId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { calleeId } = req.body as { calleeId?: string };
  if (!calleeId || calleeId === myId) { res.status(400).json({ error: "calleeId required" }); return; }

  try {
    const [caller] = await db
      .select({ pseudonym: usersTable.pseudonym, aliId: usersTable.aliId })
      .from(usersTable).where(eq(usersTable.telegramId, myId));
    if (!caller) { res.status(404).json({ error: "User not found" }); return; }

    // Block check: reject if callee has blocked caller OR caller has blocked callee
    try {
      const [block] = await db.select({ id: blocksTable.id })
        .from(blocksTable)
        .where(
          and(
            // callee blocked caller
            eq(blocksTable.blockerTelegramId, calleeId),
            eq(blocksTable.blockedTelegramId, myId),
          )
        )
        .limit(1);
      if (block) {
        // Do not reveal that the user is blocked — return 200 with reachable:false
        res.json({ callId: null, reachable: false });
        return;
      }
    } catch { /* blocks table may not exist yet */ }

    // Check presence
    let calleePresence: "chat" | "app" | "offline" = "offline";
    try {
      const [pres] = await db.select().from(presenceTable)
        .where(eq(presenceTable.telegramId, calleeId));
      if (pres && isOnline(pres.updatedAt)) {
        calleePresence = pres.context.startsWith("chat:") ? "chat" : "app";
      }
    } catch { /* table may not exist */ }

    // Also check SSE connection as fallback (in-memory)
    if (calleePresence === "offline" && callClients.has(calleeId)) {
      calleePresence = "app";
    }

    const [callRow] = await db.insert(callsTable)
      .values({ callerId: myId, calleeId, status: calleePresence === "offline" ? "missed" : "ringing" })
      .returning({ id: callsTable.id });

    const callId = callRow.id;

    if (calleePresence !== "offline") {
      pushCallSSE(calleeId, "call_incoming", {
        callId,
        callerId: myId,
        callerPseudonym: caller.pseudonym,
        callerAliId: caller.aliId,
      });
    }

    // Only expose whether callee is reachable (not their exact context)
    res.json({ callId, reachable: calleePresence !== "offline" });
  } catch {
    res.status(500).json({ error: "Failed to initiate call" });
  }
});

/* ── Answer call ─────────────────────────────────────────────────────────── */
router.post("/calls/:id/answer", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  const callId = parseInt(req.params.id, 10);
  if (!myId || isNaN(callId)) { res.status(400).json({ error: "Bad request" }); return; }
  try {
    const [call] = await db.select().from(callsTable).where(eq(callsTable.id, callId));
    if (!call || call.calleeId !== myId) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.update(callsTable)
      .set({ status: "active", answeredAt: new Date() })
      .where(eq(callsTable.id, callId));
    pushCallSSE(call.callerId, "call_accepted", { callId });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to answer" }); }
});

/* ── Reject call ─────────────────────────────────────────────────────────── */
router.post("/calls/:id/reject", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  const callId = parseInt(req.params.id, 10);
  if (!myId || isNaN(callId)) { res.status(400).json({ error: "Bad request" }); return; }
  try {
    const [call] = await db.select().from(callsTable).where(eq(callsTable.id, callId));
    if (!call || call.calleeId !== myId) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.update(callsTable)
      .set({ status: "rejected", endedAt: new Date() })
      .where(eq(callsTable.id, callId));
    pushCallSSE(call.callerId, "call_rejected", { callId });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to reject" }); }
});

/* ── Hangup call ─────────────────────────────────────────────────────────── */
router.post("/calls/:id/hangup", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  const callId = parseInt(req.params.id, 10);
  if (!myId || isNaN(callId)) { res.status(400).json({ error: "Bad request" }); return; }
  try {
    const [call] = await db.select().from(callsTable).where(eq(callsTable.id, callId));
    if (!call || (call.callerId !== myId && call.calleeId !== myId)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    await db.update(callsTable)
      .set({ status: "ended", endedAt: new Date() })
      .where(eq(callsTable.id, callId));
    const otherId = call.callerId === myId ? call.calleeId : call.callerId;
    pushCallSSE(otherId, "call_ended", { callId });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to hangup" }); }
});

/* ── Post WebRTC signal ──────────────────────────────────────────────────── */
router.post("/calls/:id/signal", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  const callId = parseInt(req.params.id, 10);
  if (!myId || isNaN(callId)) { res.status(400).json({ error: "Bad request" }); return; }
  const { type, payload } = req.body as { type?: string; payload?: string };
  if (!type || !payload) { res.status(400).json({ error: "type and payload required" }); return; }
  try {
    const [call] = await db.select().from(callsTable).where(eq(callsTable.id, callId));
    if (!call || (call.callerId !== myId && call.calleeId !== myId)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const toId = call.callerId === myId ? call.calleeId : call.callerId;
    await db.insert(callSignalsTable)
      .values({ callId: String(callId), fromId: myId, toId, type, payload });
    // Push via SSE (fast path) — fallback is polling
    pushCallSSE(toId, "call_signal", { callId, type, payload });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to post signal" }); }
});

/* ── Poll unprocessed signals (fallback when SSE misses a signal) ────────── */
router.get("/calls/:id/signals", async (req, res): Promise<void> => {
  const myId = req.telegramId;
  const callId = parseInt(req.params.id, 10);
  if (!myId || isNaN(callId)) { res.status(400).json({ error: "Bad request" }); return; }
  try {
    const signals = await db.select()
      .from(callSignalsTable)
      .where(and(
        eq(callSignalsTable.callId, String(callId)),
        eq(callSignalsTable.toId, myId),
        eq(callSignalsTable.processed, false),
      ));
    if (signals.length > 0) {
      for (const s of signals) {
        await db.update(callSignalsTable)
          .set({ processed: true })
          .where(eq(callSignalsTable.id, s.id));
      }
    }
    res.json(signals.map(s => ({ type: s.type, payload: s.payload })));
  } catch { res.json([]); }
});

export default router;
