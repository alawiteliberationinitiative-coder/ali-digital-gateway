import TelegramBot from "node-telegram-bot-api";
import { logger } from "./lib/logger";
import { supabase } from "./lib/supabase";

const token = process.env["TELEGRAM_BOT_TOKEN"];

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN environment variable is required but was not provided.");
}

const bot = new TelegramBot(token, { polling: true });

// In-memory store: tracks which users are waiting to submit an incident description
const awaitingIncidentDescription = new Set<number>();

// ─── Supabase helpers ────────────────────────────────────────────────────────

async function saveUserActivity(telegramId: number, username: string | undefined): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase.from("users_activity").upsert(
    { telegram_id: telegramId, username: username ?? null, last_seen: now },
    { onConflict: "telegram_id" },
  );

  if (error) {
    if (error.code === "PGRST204" && error.message.includes("last_seen")) {
      logger.warn("last_seen column missing — falling back to insert without it.");
      const { error: fallbackError } = await supabase
        .from("users_activity")
        .upsert({ telegram_id: telegramId, username: username ?? null }, { onConflict: "telegram_id" });
      if (fallbackError) {
        throw new Error(`Supabase upsert failed — ${fallbackError.code}: ${fallbackError.message}`);
      }
      return;
    }
    throw new Error(`Supabase upsert failed — ${error.code}: ${error.message}`);
  }
}

async function saveIncident(userId: number, description: string): Promise<void> {
  const { error } = await supabase.from("incidents").insert({
    user_id: userId,
    description,
    status: "pending",
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Supabase insert failed — ${error.code}: ${error.message}`);
  }
}

// ─── /start ─────────────────────────────────────────────────────────────────

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id;
  const username = msg.from?.username;
  const firstName = msg.from?.first_name ?? "there";

  // Clear any pending state so /start always resets the flow
  if (telegramId) {
    awaitingIncidentDescription.delete(telegramId);
    try {
      await saveUserActivity(telegramId, username);
      logger.info({ telegramId, username }, "User activity saved");
    } catch (err) {
      logger.error({ err, telegramId }, "Failed to save user activity to Supabase");
    }
  }

  const welcomeMessage = [
    `👋 Welcome, ${firstName}!`,
    "",
    "You've reached the *ALI Initiative* bot.",
    "",
    "The ALI Initiative is here to support and connect you. We're glad you're here.",
    "",
    "What would you like to do today?",
  ].join("\n");

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: "🚨 Report Incident", callback_data: "report_incident" },
        { text: "ℹ️ About ALI Initiative", callback_data: "about_ali" },
      ],
    ],
  };

  bot
    .sendMessage(chatId, welcomeMessage, { parse_mode: "Markdown", reply_markup: keyboard })
    .catch((err) => logger.error({ err, chatId }, "Failed to send /start message"));
});

// ─── Inline button handlers ──────────────────────────────────────────────────

bot.on("callback_query", async (query) => {
  const chatId = query.message?.chat.id;
  const telegramId = query.from.id;
  const data = query.data;

  if (!chatId) return;

  await bot.answerCallbackQuery(query.id).catch(() => {});

  if (data === "report_incident") {
    awaitingIncidentDescription.add(telegramId);
    await bot
      .sendMessage(
        chatId,
        [
          "🚨 *Report an Incident*",
          "",
          "Please describe the incident in as much detail as possible:",
          "• What happened?",
          "• Where did it occur?",
          "• When did it happen?",
          "",
          "Type your description below and send it as a message.",
        ].join("\n"),
        { parse_mode: "Markdown" },
      )
      .catch((err) => logger.error({ err, chatId }, "Failed to send report_incident prompt"));
  } else if (data === "about_ali") {
    await bot
      .sendMessage(
        chatId,
        [
          "ℹ️ *About the ALI Initiative*",
          "",
          "The ALI Initiative is dedicated to supporting communities, promoting accountability, and connecting people with the resources they need.",
          "",
          "For more information, reach out to our team.",
        ].join("\n"),
        { parse_mode: "Markdown" },
      )
      .catch((err) => logger.error({ err, chatId }, "Failed to send about_ali message"));
  }
});

// ─── Incoming text messages ──────────────────────────────────────────────────

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id;
  const text = msg.text;

  // Ignore commands — they are handled by onText handlers
  if (!telegramId || !text || text.startsWith("/")) return;

  if (awaitingIncidentDescription.has(telegramId)) {
    awaitingIncidentDescription.delete(telegramId);

    try {
      await saveIncident(telegramId, text);
      logger.info({ telegramId }, "Incident saved to Supabase");

      await bot.sendMessage(
        chatId,
        [
          "✅ *Report Received*",
          "",
          "Your report has been received and archived securely.",
          "",
          "A member of the ALI Initiative team will review it and follow up with you.",
          "",
          "Thank you for reaching out.",
        ].join("\n"),
        { parse_mode: "Markdown" },
      );
    } catch (err) {
      logger.error({ err, telegramId }, "Failed to save incident to Supabase");
      await bot
        .sendMessage(
          chatId,
          "⚠️ We encountered an issue saving your report. Please try again in a moment.",
        )
        .catch(() => {});
    }
  }
});

// ─── Error handlers ──────────────────────────────────────────────────────────

bot.on("polling_error", (err) => logger.error({ err }, "Telegram polling error"));
bot.on("error", (err) => logger.error({ err }, "Telegram bot error"));

logger.info("Telegram bot started (polling)");

export default bot;
