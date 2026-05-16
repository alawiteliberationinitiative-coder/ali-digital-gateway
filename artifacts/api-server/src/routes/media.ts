/**
 * GET /api/media/:fileId
 *
 * Proxy endpoint for Telegram-stored media.
 * Resolves the file_id → current Telegram CDN URL → 302 redirect.
 * The browser fetches the file directly from Telegram's CDN,
 * so no large bytes flow through our server after this single redirect.
 * Public — no Telegram auth required (article media is public content).
 */

import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

// Cache file_path per file_id for 55 min (Telegram paths are stable for hours)
const pathCache = new Map<string, { path: string; cachedAt: number }>();
const CACHE_TTL = 55 * 60 * 1_000;

router.get("/media/:fileId", async (req: Request, res: Response): Promise<void> => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { res.status(503).end(); return; }

  const fileId = String(req.params["fileId"] ?? "");
  if (!fileId || !/^[\w-]+$/.test(fileId)) { res.status(400).end(); return; }

  try {
    let filePath: string | undefined;
    const cached = pathCache.get(fileId);

    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      filePath = cached.path;
    } else {
      const gfRes = await fetch(
        `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
      );
      if (!gfRes.ok) { res.status(502).end(); return; }

      const gfJson = await gfRes.json() as { ok: boolean; result?: { file_path?: string } };
      if (!gfJson.ok || !gfJson.result?.file_path) { res.status(404).end(); return; }

      filePath = gfJson.result.file_path;
      pathCache.set(fileId, { path: filePath, cachedAt: Date.now() });
    }

    const cdnUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.redirect(302, cdnUrl);
  } catch {
    res.status(502).end();
  }
});

export default router;
