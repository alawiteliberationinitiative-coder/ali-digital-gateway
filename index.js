const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const domains = (process.env.REPLIT_DOMAINS || '').split(',').map(d => d.trim()).filter(Boolean);
const webAppUrl = domains.length > 0 ? `https://${domains[0]}` : null;

const bot = new TelegramBot(token, {
  polling: {
    interval: 2000,
    autoStart: true,
    params: { timeout: 60 }
  },
  request: { timeout: 60000 }
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === '/start') {
    if (webAppUrl) {
      bot.sendMessage(chatId, 'Welcome to the ALI Digital Gateway. Launch your secure portal below.', {
        reply_markup: {
          inline_keyboard: [[
            {
              text: 'Launch ALI Secure Portal 🚀',
              web_app: { url: webAppUrl }
            }
          ]]
        }
      });
    } else {
      bot.sendMessage(chatId, 'ALI Digital Gateway is initializing. Please try again shortly.');
    }
  }
});

bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

console.log('ALI Digital Gateway bot started. WebApp URL:', webAppUrl || '(not configured)');
