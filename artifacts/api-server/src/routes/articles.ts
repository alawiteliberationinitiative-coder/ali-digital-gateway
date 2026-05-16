import { Router } from "express";
import { db, eq, usersTable, articlesTable } from "@workspace/db";
import { ADMIN_IDS } from "../lib/admin.js";
import { sendArticleToChannel, archiveMediaToTelegram } from "../lib/telegram-notify.js";

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
    .orderBy(articlesTable.createdAt);  // oldest → newest (top → bottom)
  res.json(rows);
});

// ── POST /api/articles/upload-token ──────────────────────────────────────────
// Returns a Supabase signed upload URL so the client can PUT the file
// directly to Supabase, completely bypassing the Replit proxy body-size limit.
router.post("/articles/upload-token", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;
  if (!telegramId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const user = await getUser(telegramId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (!canPublish(telegramId, user.role)) {
    res.status(403).json({ error: "غير مصرح بالرفع" }); return;
  }

  const { mimeType } = req.body as { mimeType?: string };
  if (!mimeType) { res.status(400).json({ error: "mimeType مطلوب" }); return; }

  const supabaseUrl = (process.env.SUPABASE_URL ?? "")
    .replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: "Storage not configured" }); return;
  }

  // Ensure bucket exists (idempotent — 409 is fine)
  await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ id: "articles-media", name: "articles-media", public: true }),
  }).catch(() => {});

  const ext  = (mimeType.split("/")[1] ?? "bin").split(";")[0];
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Request a signed upload URL from Supabase
  const signRes = await fetch(
    `${supabaseUrl}/storage/v1/object/sign/upload/articles-media/${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({}),
    },
  );

  if (!signRes.ok) {
    const txt = await signRes.text();
    res.status(500).json({ error: `فشل إنشاء رابط الرفع: ${txt}` }); return;
  }

  const { signedURL } = await signRes.json() as { signedURL: string };

  res.json({
    uploadUrl: `${supabaseUrl}${signedURL}`,
    publicUrl: `${supabaseUrl}/storage/v1/object/public/articles-media/${path}`,
  });
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

  const hasMedia = !!mediaUrl?.trim();
  if (!title?.trim() || (!hasMedia && !body?.trim())) {
    res.status(400).json({ error: "العنوان مطلوب، والمحتوى مطلوب إذا لم يكن هناك وسائط" });
    return;
  }
  if (title.length > 200)   { res.status(400).json({ error: "العنوان طويل جداً (200 حرف كحد أقصى)" }); return; }
  if (body && body.length > 20_000) { res.status(400).json({ error: "المحتوى طويل جداً (20,000 حرف كحد أقصى)" }); return; }

  // Validate media URL — must be an absolute https URL (Supabase upload result)
  let safeMediaUrl: string | null = null;
  if (hasMedia) {
    try {
      const u = new URL(mediaUrl!.trim());
      if (u.protocol === "https:" || u.protocol === "http:") {
        safeMediaUrl = u.toString();
      } else {
        res.status(400).json({ error: "رابط الوسائط غير صالح" }); return;
      }
    } catch {
      res.status(400).json({ error: "رابط الوسائط غير صالح" });
      return;
    }
  }

  const [article] = await db
    .insert(articlesTable)
    .values({
      title:            title.trim(),
      body:             body?.trim() ?? "",
      mediaUrl:         safeMediaUrl,
      authorTelegramId: telegramId,
      authorPseudonym:  user.pseudonym,
      authorAliId:      user.aliId,
    })
    .returning();

  const createdAt = article.createdAt instanceof Date
    ? article.createdAt.toISOString()
    : String(article.createdAt);

  if (safeMediaUrl) {
    // Transfer media from Supabase → Telegram storage channel, then update DB
    archiveMediaToTelegram({
      id:              article.id,
      title:           article.title,
      body:            article.body,
      authorPseudonym: article.authorPseudonym,
      authorAliId:     article.authorAliId,
      createdAt,
      supabaseUrl:     safeMediaUrl,
    }).then(async (fileId) => {
      if (!fileId) return;
      // Update mediaUrl to our lightweight proxy endpoint
      await db
        .update(articlesTable)
        .set({ mediaUrl: `/api/media/${fileId}` })
        .where(eq(articlesTable.id, article.id));
    }).catch(() => {});
  } else {
    // Text-only article — archive to channel as before
    sendArticleToChannel({
      id:              article.id,
      title:           article.title,
      body:            article.body,
      mediaUrl:        null,
      authorPseudonym: article.authorPseudonym,
      authorAliId:     article.authorAliId,
      createdAt,
    });
  }

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
