import { createHmac, timingSafeEqual } from "crypto";
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
export async function verifyTelegram(req: Request, res: Response, next: NextFunction): Promise<void> {
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

        const secretKey    = createHmac("sha256", "WebAppData").update(token).digest();
        const computedBuf  = createHmac("sha256", secretKey).update(dataCheckString).digest();
        // Use timing-safe comparison to prevent HMAC oracle / timing attacks
        let hashBuf: Buffer;
        try { hashBuf = Buffer.from(hash, "hex"); } catch { next(); return; }
        const sigValid = computedBuf.length === hashBuf.length && timingSafeEqual(computedBuf, hashBuf);

        if (sigValid) {
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

  // ── 2. Native-app fallback: Bearer JWT ───────────────────────────────────────
  // When the request comes from the Capacitor native wrapper (Android/iOS), there
  // is no Telegram initData. The native app authenticates via a JWT issued by
  // POST /api/auth/verify-code after a one-time code exchange with the Telegram bot.
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      // Lazy import to keep the main auth path free of JWT overhead on every request
      const { verifyNativeJwt } = await import("../lib/jwt.js");
      const payload = verifyNativeJwt(token);
      if (payload) {
        req.telegramId = payload.telegramId;
        next();
        return;
      } else {
        logger.warn({ url: req.url }, "native JWT invalid or expired");
      }
    } catch (err) {
      logger.warn({ err }, "native JWT verification error");
    }
  }

  // ── 3. No trusted identity found ─────────────────────────────────────────────
  // Protected routes that check req.telegramId will return 401 to unauthenticated
  // callers. This is the correct behaviour for both Telegram and native contexts.
  next();
}
