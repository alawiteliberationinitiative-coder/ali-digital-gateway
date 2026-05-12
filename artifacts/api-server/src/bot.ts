import TelegramBot from "node-telegram-bot-api";
import { logger } from "./lib/logger";

const token = process.env["TELEGRAM_BOT_TOKEN"];

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN environment variable is required but was not provided.");
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name ?? "there";

  const welcomeMessage = [
    `👋 Welcome, ${firstName}!`,
    "",
    "You've reached the *ALI Initiative* bot.",
    "",
    "The ALI Initiative is here to support and connect you. We're glad you're here.",
    "",
    "Stay tuned for updates, resources, and more.",
  ].join("\n");

  bot.sendMessage(chatId, welcomeMessage, { parse_mode: "Markdown" }).catch((err) => {
    logger.error({ err, chatId }, "Failed to send /start message");
  });
});

bot.on("polling_error", (err) => {
  logger.error({ err }, "Telegram polling error");
});

bot.on("error", (err) => {
  logger.error({ err }, "Telegram bot error");
});

logger.info("Telegram bot started (polling)");

export default bot;
