import { createHmac } from "crypto";
import type { Request, Response, NextFunction } from "express";

/**
 * Verifies Telegram Mini App initData signature.
 * Attaches req.telegramId on success.
 * In development (no BOT_TOKEN), falls back to x-telegram-id header.
 */
export function verifyTelegram(req: Request, res: Response, next: NextFunction): void {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  // ── Development fallback ──────────────────────────────────────────────────
  if (!token) {
    const devId = req.headers["x-telegram-id"] as string | undefined;
    if (devId) { (req as any).telegramId = devId; }
    next();
    return;
  }

  const initData = req.headers["x-telegram-init-data"] as string | undefined;

  // Also accept plain x-telegram-id for backwards compat (dev only)
  if (!initData) {
    const rawId = req.headers["x-telegram-id"] as string | undefined;
    if (rawId) {
      // In prod without initData, reject (can be spoofed)
      if (process.env.NODE_ENV === "production") {
        res.status(401).json({ error: "Telegram authentication required" });
        return;
      }
      (req as any).telegramId = rawId;
      next();
      return;
    }
    // No auth at all — some endpoints are public, let route handle it
    next();
    return;
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) { res.status(401).json({ error: "Missing hash" }); return; }

    params.delete("hash");

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
    const computed  = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (computed !== hash) {
      res.status(401).json({ error: "Invalid Telegram signature" });
      return;
    }

    // Check freshness (5 minutes)
    const authDate = Number(params.get("auth_date") ?? 0);
    if (Date.now() / 1000 - authDate > 300) {
      res.status(401).json({ error: "initData expired" });
      return;
    }

    const userStr = params.get("user");
    if (userStr) {
      const user = JSON.parse(userStr) as { id: number };
      (req as any).telegramId = String(user.id);
    }

    next();
  } catch {
    res.status(401).json({ error: "Authentication error" });
  }
}
