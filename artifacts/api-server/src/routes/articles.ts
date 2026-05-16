import { Router } from "express";
import { db, eq, sql, usersTable, articlesTable } from "@workspace/db";
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
  // Try with viewCount first; if migration not yet run, fall back gracefully
  try {
    const rows = await db
      .select({
        id:              articlesTable.id,
        title:           articlesTable.title,
        body:            articlesTable.body,
        mediaUrl:        articlesTable.mediaUrl,
        authorPseudonym: articlesTable.authorPseudonym,
        authorAliId:     articlesTable.authorAliId,
        viewCount:       articlesTable.viewCount,
        createdAt:       articlesTable.createdAt,
        updatedAt:       articlesTable.updatedAt,
      })
      .from(articlesTable)
      .orderBy(articlesTable.createdAt);
    res.json(rows);
  } catch {
    // view_count column may not exist yet — fall back without it
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
      .orderBy(articlesTable.createdAt);
    res.json(rows.map(r => ({ ...r, viewCount: 0 })));
  }
});

// ── POST /api/articles/:id/view ───────────────────────────────────────────────
// Called client-side when a card becomes visible (once per session per article).
// No auth required — view counts are public.
router.post("/articles/:id/view", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) { res.status(400).json({ error: "id غير صالح" }); return; }

  try {
    await db
      .update(articlesTable)
      .set({ viewCount: sql`${articlesTable.viewCount} + 1` })
      .where(eq(articlesTable.id, id));
  } catch {
    // Column may not exist yet — silently ignore
  }
  res.json({ ok: true });
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

  const { mimeType: rawMime, fileName } =
    req.body as { mimeType?: string; fileName?: string };

  // iOS returns empty file.type for many formats — fall back to extension lookup
  const EXT_MIME: Record<string, string> = {
    mp4: "video/mp4",  mov: "video/quicktime",  avi: "video/x-msvideo",
    webm: "video/webm", "3gp": "video/3gpp",   "3g2": "video/3gpp2",
    mkv: "video/x-matroska", mpeg: "video/mpeg", mpg: "video/mpeg",
    jpg: "image/jpeg",  jpeg: "image/jpeg",      png: "image/png",
    gif: "image/gif",   webp: "image/webp",      heic: "image/heic",
    heif: "image/heif", bmp: "image/bmp",        tiff: "image/tiff",
  };
  const fileExt = (fileName ?? "").split(".").pop()?.toLowerCase() ?? "";
  const mimeType =
    (rawMime && rawMime !== "application/octet-stream" ? rawMime : null) ??
    EXT_MIME[fileExt] ??
    rawMime ??
    "application/octet-stream";

  req.log.info({ mimeType, rawMime, fileName }, "upload-token requested");

  const supabaseUrl = (process.env.SUPABASE_URL ?? "")
    .replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: "Storage not configured" }); return;
  }

  const storageHeaders = {
    "Content-Type": "application/json",
    apikey:         supabaseKey,
    Authorization:  `Bearer ${supabaseKey}`,
  };

  // ── 1. Ensure bucket exists ──────────────────────────────────────────────
  // POST to create; 409 = already exists (ok). Use minimal body — Supabase
  // rejects wildcard allowed_mime_types so we omit that field entirely.
  const bucketRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method:  "POST",
    headers: storageHeaders,
    body:    JSON.stringify({ id: "articles-media", name: "articles-media", public: true }),
  }).catch(() => null);

  const bucketOk = bucketRes && (bucketRes.ok || bucketRes.status === 409);
  if (!bucketOk) {
    // Might already exist — verify before aborting
    const checkRes = await fetch(`${supabaseUrl}/storage/v1/bucket/articles-media`, {
      headers: storageHeaders,
    }).catch(() => null);
    if (!checkRes?.ok) {
      const detail = bucketRes ? await bucketRes.text().catch(() => "") : "network error";
      req.log.error({ detail }, "bucket creation failed");
      res.status(500).json({ error: `فشل إنشاء مستودع الملفات: ${detail}` }); return;
    }
  }

  // ── 2. Build a safe file extension ──────────────────────────────────────
  // Map common MIME types to canonical extensions mobile players accept
  const MIME_EXT: Record<string, string> = {
    "video/mp4": "mp4", "video/quicktime": "mov", "video/x-msvideo": "avi",
    "video/webm": "webm", "video/3gpp": "3gp", "video/3gpp2": "3g2",
    "video/x-matroska": "mkv", "video/mpeg": "mpeg",
    "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif",
    "image/webp": "webp", "image/heic": "heic", "image/heif": "heif",
  };
  const baseMime = mimeType.split(";")[0]?.trim() ?? "";
  const ext  = MIME_EXT[baseMime] ?? (baseMime.split("/")[1] ?? "bin").split("+")[0];
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // ── 3. Request a signed upload URL from Supabase ─────────────────────────
  // Body: Supabase cloud expects {} or { upsert: true }.
  // The response shape has changed between versions:
  //   newer: { url: "/storage/v1/object/sign/upload/…?token=…", token, path }
  //   older: { signedURL: "https://…", token, path }
  const signRes = await fetch(
    `${supabaseUrl}/storage/v1/object/upload/sign/articles-media/${path}`,
    {
      method:  "POST",
      headers: storageHeaders,
      body:    JSON.stringify({ expiresIn: 3600, upsert: true }),
    },
  );

  if (!signRes.ok) {
    const txt = await signRes.text();
    res.status(500).json({ error: `فشل إنشاء رابط الرفع: ${txt}` }); return;
  }

  const signData = await signRes.json() as { url?: string; signedURL?: string };
  const rawUrl   = signData.url ?? signData.signedURL ?? "";
  if (!rawUrl) {
    res.status(500).json({ error: "فشل إنشاء رابط الرفع: استجابة Supabase غير متوقعة" }); return;
  }

  // rawUrl may be absolute or relative — normalise to absolute
  const uploadUrl = rawUrl.startsWith("http") ? rawUrl : `${supabaseUrl}${rawUrl}`;

  res.json({
    uploadUrl,
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
      supabaseUrl:      safeMediaUrl,   // رابط Supabase الأصلي — احتياطي دائم
      authorTelegramId: telegramId,
      authorPseudonym:  user.pseudonym,
      authorAliId:      user.aliId,
    })
    .returning();

  const createdAt = article.createdAt instanceof Date
    ? article.createdAt.toISOString()
    : String(article.createdAt);

  if (safeMediaUrl) {
    // Archive media to Telegram storage channel; keep Supabase copy as fallback.
    // On success: store telegramFileId + switch mediaUrl to the proxy endpoint.
    // On failure: mediaUrl stays as the Supabase URL — still works directly.
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
      // Switch display URL to proxy (Telegram CDN) — Supabase copy is kept as fallback
      await db
        .update(articlesTable)
        .set({
          mediaUrl:       `/api/media/${fileId}`,
          telegramFileId: fileId,
        })
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
