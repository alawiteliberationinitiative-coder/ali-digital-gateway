/**
 * GET /api/media/:fileId
 *
 * Proxy for Telegram-stored media with Supabase fallback.
 *
 * Flow:
 *  1. Resolve file_id → Telegram CDN URL via getFile API → 302 redirect.
 *  2. If Telegram fails (token changed, file expired, etc.) → look up the
 *     original supabase_url from DB by telegram_file_id → 302 redirect there.
 *  3. If neither works → 404.
 *
 * The browser fetches the file directly from the CDN after the redirect,
 * so no large bytes ever flow through this server.
 * Public — no Telegram auth required (article media is public content).
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { db, eq, articlesTable } from "@workspace/db";

const router = Router();

// Cache file_path per file_id for 55 min (Telegram CDN paths are stable for hours)
const pathCache = new Map<string, { path: string; cachedAt: number }>();
const CACHE_TTL = 55 * 60 * 1_000;

router.get("/media/:fileId", async (req: Request, res: Response): Promise<void> => {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const fileId = String(req.params["fileId"] ?? "");
  if (!fileId || !/^[\w-]+$/.test(fileId)) { res.status(400).end(); return; }

  // ── 1. Try Telegram CDN ────────────────────────────────────────────────────
  if (token) {
    try {
      let filePath: string | undefined;
      const cached = pathCache.get(fileId);

      if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
        filePath = cached.path;
      } else {
        const gfRes = await fetch(
          `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
        );
        if (gfRes.ok) {
          const gfJson = await gfRes.json() as { ok: boolean; result?: { file_path?: string } };
          if (gfJson.ok && gfJson.result?.file_path) {
            filePath = gfJson.result.file_path;
            pathCache.set(fileId, { path: filePath, cachedAt: Date.now() });
          }
        }
      }

      if (filePath) {
        const cdnUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.redirect(302, cdnUrl);
        return;
      }
    } catch {
      // Telegram unreachable — fall through to Supabase fallback
    }
  }

  // ── 2. Supabase fallback ───────────────────────────────────────────────────
  // Look up the original Supabase URL stored alongside the telegram_file_id.
  try {
    const [row] = await db
      .select({ supabaseUrl: articlesTable.supabaseUrl })
      .from(articlesTable)
      .where(eq(articlesTable.telegramFileId, fileId))
      .limit(1);

    if (row?.supabaseUrl) {
      res.setHeader("Cache-Control", "public, max-age=300");
      res.redirect(302, row.supabaseUrl);
      return;
    }
  } catch {
    // supabase_url or telegram_file_id columns may not exist yet (pre-migration)
  }

  // ── 3. Nothing worked ─────────────────────────────────────────────────────
  res.status(404).end();
});

export default router;
