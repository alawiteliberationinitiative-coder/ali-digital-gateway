import TelegramBot from "node-telegram-bot-api";
import { logger } from "./lib/logger";
import { supabase } from "./lib/supabase";

const token = process.env["TELEGRAM_BOT_TOKEN"];

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN environment variable is required but was not provided.");
}

const bot = new TelegramBot(token, { polling: true });

async function saveUserActivity(telegramId: number, username: string | undefined): Promise<void> {
  const { error } = await supabase.from("users_activity").upsert(
    {
      telegram_id: telegramId,
      username: username ?? null,
      last_seen: new Date().toISOString(),
    },
    { onConflict: "telegram_id" },
  );

  if (error) {
    throw new Error(
      `Supabase upsert failed — code: ${error.code}, message: ${error.message}, hint: ${error.hint ?? "none"}, details: ${error.details ?? "none"}`,
    );
  }
}

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id;
  const username = msg.from?.username;
  const firstName = msg.from?.first_name ?? "there";

  if (telegramId) {
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
    .sendMessage(chatId, welcomeMessage, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    })
    .catch((err) => {
      logger.error({ err, chatId }, "Failed to send /start message");
    });
});

bot.on("callback_query", async (query) => {
  const chatId = query.message?.chat.id;
  const data = query.data;

  if (!chatId) return;

  await bot.answerCallbackQuery(query.id).catch(() => {});

  if (data === "report_incident") {
    await bot
      .sendMessage(
        chatId,
        "🚨 *Report an Incident*\n\nPlease describe the incident you wish to report. Include as much detail as possible (location, time, what happened).\n\nA member of the ALI Initiative team will follow up with you.",
        { parse_mode: "Markdown" },
      )
      .catch((err) => {
        logger.error({ err, chatId }, "Failed to send report_incident message");
      });
  } else if (data === "about_ali") {
    await bot
      .sendMessage(
        chatId,
        "ℹ️ *About the ALI Initiative*\n\nThe ALI Initiative is dedicated to supporting communities, promoting accountability, and connecting people with the resources they need.\n\nFor more information, reach out to our team.",
        { parse_mode: "Markdown" },
      )
      .catch((err) => {
        logger.error({ err, chatId }, "Failed to send about_ali message");
      });
  }
});

bot.on("polling_error", (err) => {
  logger.error({ err }, "Telegram polling error");
});

bot.on("error", (err) => {
  logger.error({ err }, "Telegram bot error");
});

logger.info("Telegram bot started (polling)");

export default bot;
