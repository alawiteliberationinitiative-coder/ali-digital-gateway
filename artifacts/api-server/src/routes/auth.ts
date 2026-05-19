/**
 * Native-app authentication routes.
 *
 * POST /api/auth/generate-code  — called by the Telegram bot to create a one-time code
 * POST /api/auth/verify-code    — called by the native app to exchange a code for a JWT
 * POST /api/auth/refresh        — called by the native app to extend a valid JWT
 */
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { createCode, consumeCode } from "../lib/auth-codes.js";
import { signNativeJwt, verifyNativeJwt } from "../lib/jwt.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts — حاول لاحقاً" },
});

/**
 * POST /api/auth/generate-code
 *
 * Called by the Telegram bot with the user's telegramId and a shared botSecret.
 * Returns a one-time 8-char code that the bot sends to the user.
 *
 * Body: { telegramId: string, botSecret: string }
 * Auth: botSecret must equal TELEGRAM_BOT_TOKEN
 */
router.post("/auth/generate-code", authLimiter, (req, res): void => {
  const { telegramId, botSecret } = req.body as {
    telegramId?: unknown;
    botSecret?:  unknown;
  };

  if (
    typeof botSecret !== "string" ||
    botSecret !== process.env.TELEGRAM_BOT_TOKEN
  ) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (
    typeof telegramId !== "string" ||
    !/^\d{5,15}$/.test(telegramId)
  ) {
    res.status(400).json({ error: "Invalid telegramId" });
    return;
  }

  const code = createCode(telegramId);
  req.log.info({ telegramId }, "native login code generated");
  res.json({ code });
});

/**
 * POST /api/auth/verify-code
 *
 * Called by the native app. Validates the one-time code and returns a JWT.
 *
 * Body: { code: string }
 * Returns: { token: string, telegramId: string }
 */
router.post("/auth/verify-code", authLimiter, (req, res): void => {
  const { code } = req.body as { code?: unknown };

  if (typeof code !== "string" || code.length < 4 || code.length > 12) {
    res.status(400).json({ error: "رمز غير صالح" });
    return;
  }

  const telegramId = consumeCode(code);
  if (!telegramId) {
    res.status(401).json({ error: "الرمز غير صحيح أو انتهت صلاحيته" });
    return;
  }

  const token = signNativeJwt(telegramId);
  req.log.info({ telegramId }, "native JWT issued");
  res.json({ token, telegramId });
});

/**
 * POST /api/auth/refresh
 *
 * Refreshes a valid native JWT. Requires a valid Bearer token in the Authorization header.
 * Returns a new token with a fresh 30-day expiry.
 */
router.post("/auth/refresh", (req, res): void => {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization header required" });
    return;
  }

  const existing = verifyNativeJwt(authHeader.slice(7));
  if (!existing) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const token = signNativeJwt(existing.telegramId);
  req.log.info({ telegramId: existing.telegramId }, "native JWT refreshed");
  res.json({ token, telegramId: existing.telegramId });
});

export default router;
