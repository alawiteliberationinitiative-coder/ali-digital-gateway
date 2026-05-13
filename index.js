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

// ── Human verification state ──────────────────────────────────────────────
// verified: users who passed captcha (in-memory, resets on restart)
const verified   = new Set();
// pending: chatId → { answer, attempts, msgId }
const pending    = new Map();
// refCodes: chatId → aliId referral code (from /start REF_CODE)
const refCodes   = new Map();
const MAX_WRONG  = 3;
const COOLDOWN_MS = 60_000; // 1 min cooldown after max wrong answers
const cooldowns  = new Map(); // chatId → unblockTimestamp

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildCaptcha() {
  const a = randInt(2, 15);
  const b = randInt(2, 15);
  const answer = a + b;
  // Generate 3 unique wrong options
  const wrongs = new Set();
  while (wrongs.size < 3) {
    const w = answer + randInt(-5, 5);
    if (w !== answer && w > 0) wrongs.add(w);
  }
  const options = shuffle([answer, ...[...wrongs]]);
  return { a, b, answer, options };
}

function captchaKeyboard(options, chatId) {
  return options.map(opt => [{
    text: String(opt),
    callback_data: `captcha:${chatId}:${opt}`
  }]);
}

async function sendCaptcha(chatId, editMsgId = null) {
  const { a, b, answer, options } = buildCaptcha();

  const state = pending.get(chatId) || { attempts: 0, msgId: null };
  state.answer = answer;
  pending.set(chatId, state);

  const text =
`🔒 *التحقق من أنك إنسان*

للوصول إلى بوابة A.L.I يرجى حل هذه المسألة البسيطة:

*${a} + ${b} = ؟*

اختر الإجابة الصحيحة:`;

  const keyboard = { inline_keyboard: captchaKeyboard(options, chatId) };

  if (editMsgId) {
    try {
      const sent = await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: editMsgId,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      state.msgId = editMsgId;
      return;
    } catch (_) {}
  }

  const sent = await bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
  state.msgId = sent.message_id;
  pending.set(chatId, state);
}

async function sendAppMessage(chatId, refCode = null) {
  if (!webAppUrl) {
    bot.sendMessage(chatId, 'جارٍ تهيئة بوابة A.L.I الرقمية. يرجى المحاولة مجدداً بعد لحظات.');
    return;
  }
  // Append start_param so Mini App can read it via initDataUnsafe.start_param
  const appUrl = refCode ? `${webAppUrl}?startapp=${encodeURIComponent(refCode)}` : webAppUrl;
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
          { text: '🚀 إطلاق البوابة الآمنة', web_app: { url: appUrl } }
        ]]
      }
    }
  );
}

// ── /start ────────────────────────────────────────────────────────────────
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text   = msg.text;

  // Silently delete every user message immediately
  silentDelete(chatId, msg.message_id);

  if (text?.startsWith('/start')) {
    // Extract referral code if present: /start ALI-2026-XXXX
    const parts   = text.trim().split(/\s+/);
    const refCode = parts[1] || null;
    if (refCode) refCodes.set(chatId, refCode);

    // Check cooldown
    const unblock = cooldowns.get(chatId);
    if (unblock && Date.now() < unblock) {
      const secs = Math.ceil((unblock - Date.now()) / 1000);
      bot.sendMessage(chatId, `⏳ يرجى الانتظار ${secs} ثانية قبل المحاولة مجدداً.`);
      return;
    }

    if (verified.has(chatId)) {
      // Already verified — go straight to app (with any stored refCode)
      sendAppMessage(chatId, refCodes.get(chatId) || null);
      return;
    }

    // Reset attempts for fresh start
    pending.delete(chatId);
    pending.set(chatId, { answer: null, attempts: 0, msgId: null });
    await sendCaptcha(chatId);
    return;
  }

  // /createwallet — admin only
  if (text === '/createwallet') {
    if (!ADMIN_ID || chatId !== ADMIN_ID) {
      bot.sendMessage(chatId, '⛔ هذا الأمر مخصص للمسؤول فقط.');
      return;
    }

    bot.sendMessage(chatId, '⏳ جارٍ إنشاء محفظة خزينة المبادرة على شبكة TON...');

    try {
      const { mnemonicNew, mnemonicToPrivateKey } = await import('@ton/crypto');
      const { WalletContractV4 } = await import('@ton/ton');

      const mnemonic    = await mnemonicNew(24);
      const keyPair     = await mnemonicToPrivateKey(mnemonic);
      const wallet      = WalletContractV4.create({ publicKey: keyPair.publicKey, workchain: 0 });
      const address     = wallet.address.toString({ urlSafe: true, bounceable: false });
      const privateKeyHex = Buffer.from(keyPair.secretKey).toString('hex');
      const seedPhrase  = mnemonic.join(' ');

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

      mnemonic.fill('');
      mnemonic.length = 0;
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

// ── Captcha callback_query ─────────────────────────────────────────────────
bot.on('callback_query', async (query) => {
  const { data, from, message } = query;
  const chatId = from.id;

  if (!data.startsWith('captcha:')) {
    bot.answerCallbackQuery(query.id);
    return;
  }

  const parts    = data.split(':');
  const targetId = Number(parts[1]);
  const chosen   = Number(parts[2]);

  // Only the original user can answer
  if (chatId !== targetId) {
    bot.answerCallbackQuery(query.id, { text: '❌ هذا السؤال ليس لك.', show_alert: true });
    return;
  }

  const state = pending.get(chatId);
  if (!state) {
    bot.answerCallbackQuery(query.id, { text: 'انتهت صلاحية السؤال. أرسل /start من جديد.', show_alert: true });
    return;
  }

  if (chosen === state.answer) {
    // ✅ Correct
    verified.add(chatId);
    pending.delete(chatId);
    cooldowns.delete(chatId);

    await bot.answerCallbackQuery(query.id, { text: '✅ إجابة صحيحة! مرحباً بك.' });

    // Remove captcha message
    try { await bot.deleteMessage(chatId, message.message_id); } catch (_) {}

    // Pass stored referral code (if any) then clear it
    const storedRef = refCodes.get(chatId) || null;
    refCodes.delete(chatId);
    await sendAppMessage(chatId, storedRef);
  } else {
    // ❌ Wrong
    state.attempts += 1;

    if (state.attempts >= MAX_WRONG) {
      // Cooldown
      cooldowns.set(chatId, Date.now() + COOLDOWN_MS);
      pending.delete(chatId);
      await bot.answerCallbackQuery(query.id, { text: '❌ إجابات خاطئة متعددة.', show_alert: true });
      try { await bot.deleteMessage(chatId, message.message_id); } catch (_) {}
      bot.sendMessage(chatId,
        `🚫 تجاوزت عدد المحاولات المسموح بها.\nيرجى الانتظار دقيقة واحدة ثم أرسل /start مجدداً.`
      );
    } else {
      const left = MAX_WRONG - state.attempts;
      await bot.answerCallbackQuery(query.id, {
        text: `❌ إجابة خاطئة. تبقى لك ${left} محاولة.`,
        show_alert: true
      });
      // Send fresh captcha in same message
      await sendCaptcha(chatId, message.message_id);
    }
  }
});

bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

async function silentDelete(chatId, messageId) {
  try { await bot.deleteMessage(chatId, messageId); } catch (_) {}
}

// ── Bot startup setup ──────────────────────────────────────────────────────
async function setupBot() {
  // Set bot commands
  await bot.setMyCommands([
    { command: 'start', description: 'فتح البوابة الرقمية A.L.I' },
  ]).catch(() => {});

  // Set persistent menu button that opens the Mini App directly
  if (webAppUrl) {
    await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: '🚀 البوابة',
          web_app: { url: webAppUrl },
        },
      }),
    }).catch(() => {});
  }
}

setupBot();
console.log('ALI Digital Gateway bot started. WebApp URL:', webAppUrl || '(not configured)');
