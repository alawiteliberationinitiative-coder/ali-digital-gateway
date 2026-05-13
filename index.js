const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const domains = (process.env.REPLIT_DOMAINS || '').split(',').map(d => d.trim()).filter(Boolean);
const webAppUrl = domains.length > 0 ? `https://${domains[0]}` : null;
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID ? Number(process.env.ADMIN_TELEGRAM_ID) : null;

const bot = new TelegramBot(token, {
  polling: {
    interval: 2000,
    autoStart: true,
    params: { timeout: 60 }
  },
  request: { timeout: 60000 }
});

bot.on('message', async (msg) => {
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

  // /createwallet — admin only, one-time TON treasury wallet creation
  if (text === '/createwallet') {
    if (!ADMIN_ID || chatId !== ADMIN_ID) {
      bot.sendMessage(chatId, '⛔ هذا الأمر مخصص للمسؤول فقط.');
      return;
    }

    bot.sendMessage(chatId, '⏳ جارٍ إنشاء محفظة خزينة المبادرة على شبكة TON...');

    try {
      // Dynamic ESM import (works inside CJS)
      const { mnemonicNew, mnemonicToPrivateKey } = await import('@ton/crypto');
      const { WalletContractV4 } = await import('@ton/ton');

      // Generate 24-word mnemonic
      const mnemonic = await mnemonicNew(24);
      const keyPair = await mnemonicToPrivateKey(mnemonic);

      // Create wallet contract (v4R2, workchain 0 = basechain)
      const wallet = WalletContractV4.create({
        publicKey: keyPair.publicKey,
        workchain: 0,
      });

      const address = wallet.address.toString({ urlSafe: true, bounceable: false });
      const privateKeyHex = Buffer.from(keyPair.secretKey).toString('hex');
      const seedPhrase = mnemonic.join(' ');

      // Send sensitive data to admin — private message, one-time
      await bot.sendMessage(chatId,
`🔐 *خزينة مبادرة A.L.I — TON*

⚠️ *هذه الرسالة تُرسَل مرة واحدة فقط. احفظ البيانات فوراً في مكان آمن خارج الإنترنت ثم احذف هذه الرسالة.*

📍 *العنوان العام (Public Address):*
\`${address}\`

🌱 *عبارة الاسترداد (Seed Phrase):*
\`${seedPhrase}\`

🔑 *المفتاح الخاص (Private Key HEX):*
\`${privateKeyHex}\`

---
✅ *الخطوة التالية:*
أضف العنوان العام في متغير البيئة:
\`TON_TREASURY_ADDRESS=${address}\``,
        { parse_mode: 'Markdown' }
      );

      // Immediately clear sensitive data from memory
      mnemonic.fill('');
      mnemonic.length = 0;
      privateKeyHex.replace(/./g, '0');
      seedPhrase.replace(/./g, '0');
      keyPair.secretKey.fill(0);

      bot.sendMessage(chatId,
        '✅ تم إنشاء المحفظة وإرسال البيانات. تم مسح المفاتيح من الذاكرة.\n\n⚙️ لا تنسَ إضافة `TON_TREASURY_ADDRESS` في متغيرات البيئة.',
        { parse_mode: 'Markdown' }
      );

    } catch (err) {
      console.error('Wallet creation error:', err.message);
      bot.sendMessage(chatId, `❌ فشل إنشاء المحفظة: ${err.message}`);
    }
  }
});

bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

console.log('ALI Digital Gateway bot started. WebApp URL:', webAppUrl || '(not configured)');
