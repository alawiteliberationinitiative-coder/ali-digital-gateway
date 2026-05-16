import { Router } from "express";
import { db, eq, desc, usersTable, articlesTable } from "@workspace/db";
import { ADMIN_IDS } from "../lib/admin.js";
import { sendArticleToChannel } from "../lib/telegram-notify.js";

const router = Router();

async function getUser(telegramId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId));
  return user;
}

/** التحقق من صلاحية النشر */
function canPublish(telegramId: string, role: string | null | undefined): boolean {
  return ADMIN_IDS.includes(telegramId) || role === "staff" || role === "admin";
}

// ── GET /api/articles ─────────────────────────────────────────────────────────
router.get("/articles", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id:              articlesTable.id,
      title:           articlesTable.title,
      body:            articlesTable.body,
      mediaUrl:        articlesTable.mediaUrl,
      authorPseudonym: articlesTable.authorPseudonym,
      authorAliId:     articlesTable.authorAliId,
      createdAt:       articlesTable.createdAt,
      updatedAt:       articlesTable.updatedAt,
    })
    .from(articlesTable)
    .orderBy(desc(articlesTable.createdAt));
  res.json(rows);
});

// ── POST /api/articles ────────────────────────────────────────────────────────
router.post("/articles", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const user = await getUser(telegramId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (!canPublish(telegramId, user.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية النشر — هذه الميزة مخصصة لفريق العمل فقط" });
    return;
  }

  const { title, body, mediaUrl } = req.body as {
    title?: string;
    body?: string;
    mediaUrl?: string;
  };

  if (!title?.trim() || !body?.trim()) {
    res.status(400).json({ error: "العنوان والمحتوى مطلوبان" });
    return;
  }
  if (title.length > 200)   { res.status(400).json({ error: "العنوان طويل جداً (200 حرف كحد أقصى)" }); return; }
  if (body.length > 20_000) { res.status(400).json({ error: "المحتوى طويل جداً (20,000 حرف كحد أقصى)" }); return; }

  // التحقق البسيط من URL الصورة إذا وُجد
  let safeMediaUrl: string | null = null;
  if (mediaUrl?.trim()) {
    try {
      const u = new URL(mediaUrl.trim());
      if (u.protocol === "https:" || u.protocol === "http:") {
        safeMediaUrl = u.toString();
      }
    } catch {
      res.status(400).json({ error: "رابط الصورة غير صالح" });
      return;
    }
  }

  const [article] = await db
    .insert(articlesTable)
    .values({
      title:           title.trim(),
      body:            body.trim(),
      mediaUrl:        safeMediaUrl,
      authorTelegramId: telegramId,
      authorPseudonym: user.pseudonym,
      authorAliId:     user.aliId,
    })
    .returning();

  // Archive to Telegram storage channel — fire-and-forget, never blocks the response
  sendArticleToChannel({
    id:              article.id,
    title:           article.title,
    body:            article.body,
    mediaUrl:        article.mediaUrl,
    authorPseudonym: article.authorPseudonym,
    authorAliId:     article.authorAliId,
    createdAt:       article.createdAt instanceof Date
                       ? article.createdAt.toISOString()
                       : String(article.createdAt),
  });

  res.status(201).json(article);
});

// ── DELETE /api/articles/:id ──────────────────────────────────────────────────
router.delete("/articles/:id", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid article id" }); return; }

  const [article] = await db.select().from(articlesTable).where(eq(articlesTable.id, id));
  if (!article) { res.status(404).json({ error: "Article not found" }); return; }

  const user = await getUser(telegramId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const isAdmin  = ADMIN_IDS.includes(telegramId) || user.role === "admin";
  const isAuthor = article.authorTelegramId === telegramId;

  if (!isAdmin && !isAuthor) {
    res.status(403).json({ error: "ليس لديك صلاحية حذف هذا المقال" });
    return;
  }

  await db.delete(articlesTable).where(eq(articlesTable.id, id));
  res.json({ success: true });
});

export default router;
