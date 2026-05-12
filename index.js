const TelegramBot = require("node-telegram-bot-api");

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN environment variable is required.");
}

const bot = new TelegramBot(token, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 60 },
  },
  request: {
    timeout: 60000,
  },
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from && msg.from.first_name ? msg.from.first_name : "there";
  bot.sendMessage(chatId, `Hello, ${firstName}! Welcome to the bot.`);
});

bot.on("polling_error", (err) => {
  console.error("Polling error:", err.message);
});

console.log("Telegram bot started (polling).");
