import { createHmac } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

declare global {
  namespace Express {
    interface Request {
      telegramId?: string;
      isPremium?:  boolean;
    }
  }
}

/**
 * Validates Telegram Mini App initData (HMAC-SHA256) when present and sets
 * req.telegramId from the verified payload. If initData is absent, invalid,
 * expired, or unparseable, req.telegramId remains undefined; protected routes
 * that check for it will return 401. No header fallback is trusted.
 */
export function verifyTelegram(req: Request, res: Response, next: NextFunction): void {
  const token    = process.env.TELEGRAM_BOT_TOKEN;
  const initData = req.headers["x-telegram-init-data"] as string | undefined;

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
          if (ageSecs < 86400) {
            const userStr = params.get("user");
            if (userStr) {
              const user = JSON.parse(userStr) as {
                id: number;
                is_bot?: boolean;
                is_premium?: boolean;
              };
              if (user.is_bot) {
                logger.warn({ telegramId: String(user.id) }, "bot account blocked at auth");
                // Leave req.telegramId undefined → protected routes return 401
                next();
                return;
              }
              req.telegramId  = String(user.id);
              req.isPremium   = user.is_premium ?? false;
              next();
              return;
            }
          } else {
            logger.warn({ ageSecs }, "telegram initData expired");
          }
        } else {
          logger.warn({ url: req.url }, "telegram initData signature mismatch");
        }
      }
    } catch (err) {
      logger.warn({ err }, "telegram initData parse error");
    }
  }

  // ── 2. No fallback ────────────────────────────────────────────────────────────
  // x-telegram-id is a caller-controlled header — any HTTP client can forge it.
  // The API is publicly reachable behind a reverse proxy, so socket-address checks
  // are not a reliable trust boundary. Identity is only set from a verified
  // initData payload above; protected routes that require req.telegramId will
  // return 401 to unauthenticated callers.
  next();
}
