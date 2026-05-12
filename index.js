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
      bot.sendMessage(chatId,
`🟢 *مبادرة التحرير العلوي — A.L.I*

أهلاً بك في البوابة الرقمية السيادية.

هذه المنصة حكر على أعضاء مبادرة التحرير العلوي المسجّلين.
ستحصل على هويّة رقمية فريدة ومفاتيح التشفير الثلاثة لحماية حسابك.

_"حق لا يموت"_

🔰 *Alawite Liberation Initiative — A.L.I*
_Management of Diversified Development · $MDD_`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              {
                text: '🚀 إطلاق البوابة الآمنة',
                web_app: { url: webAppUrl }
              }
            ]]
          }
        }
      );
    } else {
      bot.sendMessage(chatId, 'جارٍ تهيئة بوابة A.L.I الرقمية. يرجى المحاولة مجدداً بعد لحظات.');
    }
  }
});

bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

console.log('ALI Digital Gateway bot started. WebApp URL:', webAppUrl || '(not configured)');
