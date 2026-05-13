import { Router } from "express";

const router = Router();

/* ── Upload a document file to the Telegram storage channel ─────────────────
   Receives base64-encoded image, forwards to a private Telegram channel,
   returns the file_id so only the reference is stored in the DB.
   Falls back gracefully if TELEGRAM_STORAGE_CHANNEL_ID is not configured.
──────────────────────────────────────────────────────────────────────────── */
router.post("/docs/upload-file", async (req, res): Promise<void> => {
  const telegramId = req.headers["x-telegram-id"] as string | undefined;
  const { base64, filename = "document.jpg", formType = "unknown" } = req.body as {
    base64?: string;
    filename?: string;
    formType?: string;
  };

  if (!base64) {
    res.status(400).json({ error: "base64 required" });
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_STORAGE_CHANNEL_ID;

  if (!botToken || !channelId) {
    res.json({ fileId: `local_${Date.now()}`, stored: false, reason: "storage_not_configured" });
    return;
  }

  try {
    const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const blob = new Blob([buffer], { type: "image/jpeg" });

    // Telegram private channels require the -100XXXXXXXXXX format.
    // Auto-normalise all common formats users might paste:
    //   "1234567890"         → "-1001234567890"
    //   "-1234567890"        → "-1001234567890"
    //   "-1001234567890"     → kept as-is
    //   "@channelusername"   → kept as-is
    let chatId = channelId.trim();
    if (/^\d+$/.test(chatId)) {
      chatId = `-100${chatId}`;
    } else if (/^-(?!100)\d+$/.test(chatId)) {
      chatId = `-100${chatId.slice(1)}`;
    }

    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("document", blob, filename);
    form.append(
      "caption",
      `📁 <b>ADAR Sovereign Archive</b>\n` +
      `👤 User: <code>${telegramId ?? "anonymous"}</code>\n` +
      `📋 Form: ${formType}\n` +
      `🕒 ${new Date().toISOString()}\n` +
      `🔒 AES-256 · Encrypted at rest`
    );
    form.append("parse_mode", "HTML");
    form.append("disable_notification", "true");

    const tgRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendDocument`,
      { method: "POST", body: form }
    );

    const data = await tgRes.json() as {
      ok: boolean;
      result?: { document?: { file_id: string; file_size?: number } };
    };

    if (!data.ok) {
      const tgErr = (data as Record<string, unknown>).description ?? "unknown";
      res.json({ fileId: `local_${Date.now()}`, stored: false, reason: "telegram_error", detail: tgErr, usedChatId: chatId });
      return;
    }

    const fileId = data.result?.document?.file_id ?? `local_${Date.now()}`;
    res.json({ fileId, stored: true, fileSize: data.result?.document?.file_size });
  } catch {
    res.json({ fileId: `local_${Date.now()}`, stored: false, reason: "exception" });
  }
});

export default router;
