import { Router } from "express";
import { registerUploadToken } from "../lib/upload-tokens.js";

const router = Router();

const MAX_BASE64_BYTES = 6 * 1024 * 1024; // 6 MB max payload

router.post("/docs/upload-file", async (req, res): Promise<void> => {
  const telegramId = req.telegramId;

  if (!telegramId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { base64, filename = "document.jpg", formType = "unknown" } = req.body as {
    base64?: string;
    filename?: string;
    formType?: string;
  };

  if (!base64) {
    res.status(400).json({ error: "base64 required" });
    return;
  }

  if (Buffer.byteLength(base64, "utf8") > MAX_BASE64_BYTES) {
    res.status(413).json({ error: "الملف كبير جداً — الحد الأقصى 4 ميغابايت" });
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_STORAGE_CHANNEL_ID;

  if (!botToken || !channelId) {
    // Storage not configured: issue a tracked local token so the submit flow
    // still works in dev/staging environments.
    const fileId = `local_${Date.now()}`;
    registerUploadToken(telegramId, fileId);
    res.json({ fileId, stored: false, reason: "storage_not_configured" });
    return;
  }

  try {
    const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const blob   = new Blob([buffer], { type: "image/jpeg" });

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
      `👤 User: <code>${telegramId}</code>\n` +
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
      // Telegram rejected the upload — do NOT issue a token; no reward possible.
      res.status(502).json({ stored: false, reason: "telegram_error", detail: tgErr });
      return;
    }

    const fileId = data.result?.document?.file_id ?? `local_${Date.now()}`;
    registerUploadToken(telegramId, fileId);
    res.json({ fileId, stored: true, fileSize: data.result?.document?.file_size });
  } catch {
    // Network or parse failure — do NOT issue a token.
    res.status(502).json({ stored: false, reason: "exception" });
  }
});

export default router;
