/**
 * Telegram webhook endpoint — only active in production (autoscale).
 * Validates the X-Telegram-Bot-Api-Secret-Token header and forwards the
 * update to the bot process listening on 127.0.0.1:22728.
 */
import { Router } from "express";
import { createHash } from "crypto";

const router = Router();

function expectedSecret(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  return createHash("sha256").update(token + "webhook").digest("hex").slice(0, 64);
}

router.post("/telegram/webhook", async (req, res): Promise<void> => {
  const incoming = req.headers["x-telegram-bot-api-secret-token"] as string | undefined;

  if (!incoming || incoming !== expectedSecret()) {
    res.sendStatus(403);
    return;
  }

  try {
    await fetch("http://127.0.0.1:22728/", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(req.body),
    });
  } catch {
    // Bot process may be starting up — Telegram will retry; still return 200
  }

  res.sendStatus(200);
});

export default router;
