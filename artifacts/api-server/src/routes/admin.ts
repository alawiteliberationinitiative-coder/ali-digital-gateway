import { Router } from "express";
import {
  db, eq, sql, desc,
  usersTable, articlesTable, adminNotificationsTable,
} from "@workspace/db";
import { ADMIN_IDS } from "../lib/admin.js";

const router = Router();

/** يتحقق أن المستدعي مشرف — يُرجع 403 وينهي إذا لم يكن */
function requireAdmin(req: import("express").Request, res: import("express").Response): boolean {
  const id = req.telegramId;
  if (!id || !ADMIN_IDS.includes(id)) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

// ── GET /api/admin/users — قائمة المستخدمين مع بحث اختياري ──────────────────
router.get("/admin/users", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const q      = ((req.query.q as string) ?? "").trim().toLowerCase();
    const limit  = Math.min(Number(req.query.limit)  || 50, 100);
    const offset = Math.max(Number(req.query.offset) || 0,  0);

    const rows = await db
      .select({
        id:              usersTable.id,
        aliId:           usersTable.aliId,
        pseudonym:       usersTable.pseudonym,
        telegramId:      usersTable.telegramId,
        telegramUsername:usersTable.telegramUsername,
        firstName:       usersTable.firstName,
        role:            usersTable.role,
        civicRole:       usersTable.civicRole,
        loyaltyPoints:   usersTable.loyaltyPoints,
        level:           usersTable.level,
        isBanned:        usersTable.isBanned,
        banReason:       usersTable.banReason,
        createdAt:       usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(limit)
      .offset(offset);

    const filtered = q
      ? rows.filter(u =>
          u.aliId?.toLowerCase().includes(q) ||
          u.pseudonym?.toLowerCase().includes(q) ||
          u.telegramUsername?.toLowerCase().includes(q) ||
          u.firstName?.toLowerCase().includes(q) ||
          u.telegramId?.includes(q)
        )
      : rows;

    res.json(filtered);
  } catch (e) {
    res.status(500).json({ error: "DB error" });
  }
});

// ── PATCH /api/admin/users/:telegramId/role — تغيير دور المستخدم ─────────────
router.patch("/admin/users/:telegramId/role", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { telegramId } = req.params;
  const { role } = req.body as { role: string };

  const VALID_ROLES = ["member", "publisher", "moderator", "admin", "staff"];
  if (!VALID_ROLES.includes(role)) {
    res.status(400).json({ error: "دور غير صالح" });
    return;
  }
  if (telegramId === req.telegramId) {
    res.status(400).json({ error: "لا يمكنك تعديل دورك" });
    return;
  }
  try {
    await db.update(usersTable)
      .set({ role, updatedAt: new Date() })
      .where(eq(usersTable.telegramId, telegramId));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "DB error" });
  }
});

// ── PATCH /api/admin/users/:telegramId/ban — حظر / رفع حظر ──────────────────
router.patch("/admin/users/:telegramId/ban", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { telegramId } = req.params;
  const { banned, reason } = req.body as { banned: boolean; reason?: string };
  if (telegramId === req.telegramId) {
    res.status(400).json({ error: "لا يمكنك حظر نفسك" });
    return;
  }
  try {
    await db.update(usersTable)
      .set({
        isBanned:  banned,
        banReason: banned ? (reason?.slice(0, 300) ?? null) : null,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.telegramId, telegramId));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "DB error" });
  }
});

// ── PATCH /api/admin/articles/:id — تعديل عنوان / نص منشور ─────────────────
router.patch("/admin/articles/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  if (!id || isNaN(id)) { res.status(400).json({ error: "معرّف غير صالح" }); return; }

  const { title, body } = req.body as { title?: string; body?: string };
  if (!title?.trim() && !body?.trim()) {
    res.status(400).json({ error: "لا توجد حقول للتعديل" }); return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (title?.trim()) updates.title = title.trim().slice(0, 300);
  if (body  !== undefined) updates.body = body.trim().slice(0, 50000);

  try {
    await db.update(articlesTable).set(updates).where(eq(articlesTable.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "DB error" });
  }
});

// ── DELETE /api/admin/articles/:id — حذف أي منشور ───────────────────────────
router.delete("/admin/articles/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  if (!id || isNaN(id)) { res.status(400).json({ error: "معرّف غير صالح" }); return; }
  try {
    await db.delete(articlesTable).where(eq(articlesTable.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "DB error" });
  }
});

// ── GET /api/admin/content — قائمة المحتوى للإدارة ─────────────────────────
router.get("/admin/content", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const limit  = Math.min(Number(req.query.limit)  || 30, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const rows = await db
      .select({
        id:              articlesTable.id,
        title:           articlesTable.title,
        body:            articlesTable.body,
        mediaUrl:        articlesTable.mediaUrl,
        authorPseudonym: articlesTable.authorPseudonym,
        authorAliId:     articlesTable.authorAliId,
        authorTelegramId:articlesTable.authorTelegramId,
        viewCount:       articlesTable.viewCount,
        createdAt:       articlesTable.createdAt,
      })
      .from(articlesTable)
      .orderBy(desc(articlesTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(rows.map(r => ({
      ...r,
      isAdar: ADMIN_IDS.includes(r.authorTelegramId),
    })));
  } catch {
    res.status(500).json({ error: "DB error" });
  }
});

// ── GET /api/admin/notifications ─────────────────────────────────────────────
router.get("/admin/notifications", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const rows = await db
      .select()
      .from(adminNotificationsTable)
      .orderBy(desc(adminNotificationsTable.createdAt))
      .limit(50);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "DB error" });
  }
});

// ── POST /api/admin/notifications/seen — تعليم الكل مقروءاً ─────────────────
router.post("/admin/notifications/seen", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    await db.update(adminNotificationsTable)
      .set({ seen: true })
      .where(eq(adminNotificationsTable.seen, false));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "DB error" });
  }
});

// ── GET /api/admin/stats — إحصائيات سريعة ───────────────────────────────────
router.get("/admin/stats", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const [[users], [articles], [banned], [unseen]] = await Promise.all([
      db.select({ c: sql<number>`COUNT(*)::int` }).from(usersTable),
      db.select({ c: sql<number>`COUNT(*)::int` }).from(articlesTable),
      db.select({ c: sql<number>`COUNT(*)::int` }).from(usersTable).where(eq(usersTable.isBanned, true)),
      db.select({ c: sql<number>`COUNT(*)::int` }).from(adminNotificationsTable).where(eq(adminNotificationsTable.seen, false)),
    ]);
    res.json({
      totalUsers:    users?.c   ?? 0,
      totalArticles: articles?.c ?? 0,
      bannedUsers:   banned?.c  ?? 0,
      unseenNotifs:  unseen?.c  ?? 0,
    });
  } catch {
    res.status(500).json({ error: "DB error" });
  }
});

export default router;
