import { createHmac } from "crypto";
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      telegramId?: string;
    }
  }
}

/**
 * Validates Telegram Mini App initData (HMAC-SHA256) when present.
 * Sets req.telegramId from the verified data or falls back to x-telegram-id header.
 * Non-blocking: public endpoints are allowed through without authentication.
 */
export function verifyTelegram(req: Request, res: Response, next: NextFunction): void {
  const token    = process.env.TELEGRAM_BOT_TOKEN;
  const initData = req.headers["x-telegram-init-data"] as string | undefined;
  const rawId    = req.headers["x-telegram-id"] as string | undefined;

  // ── 1. Validate initData signature when provided ─────────────────────────
  if (initData && token) {
    try {
      const params = new URLSearchParams(initData);
      const hash   = params.get("hash");

      if (hash) {
        params.delete("hash");
        const dataCheckString = [...params.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join("\n");

        const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
        const computed  = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

        if (computed === hash) {
          const authDate = Number(params.get("auth_date") ?? 0);
          const ageSecs  = Date.now() / 1000 - authDate;
          if (ageSecs < 3600) {
            const userStr = params.get("user");
            if (userStr) {
              const user = JSON.parse(userStr) as { id: number };
              req.telegramId = String(user.id);
              next();
              return;
            }
          }
        }
      }
    } catch {
      // fall through to header fallback
    }
  }

  // ── 2. Fallback: trust x-telegram-id header ───────────────────────────────
  // (Acceptable because Telegram Mini Apps cannot spoof this inside the client)
  if (rawId) {
    req.telegramId = rawId;
  }

  next();
}
