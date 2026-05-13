const TelegramBot = require('node-telegram-bot-api');

const token     = process.env.TELEGRAM_BOT_TOKEN;
const domains   = (process.env.REPLIT_DOMAINS || '').split(',').map(d => d.trim()).filter(Boolean);
const webAppUrl = domains.length > 0 ? `https://${domains[0]}` : null;

// API server base URL (same process host, different port)
const API_BASE  = 'http://localhost:22729';

const bot = new TelegramBot(token, {
  polling: {
    interval: 2000,
    autoStart: true,
    params: { timeout: 60 }
  },
  request: { timeout: 60_000 }
});

// ── Human-verification state (in-memory cache, auto-restored from DB) ──────
// verified: chatIds that passed captcha this session OR are confirmed in DB
const verified   = new Set();
// pending: chatId → { answer, attempts, msgId }
const pending    = new Map();
// refCodes: chatId → aliId referral code (from /start REF_CODE)
const refCodes   = new Map();
const MAX_WRONG  = 3;
const COOLDOWN_MS = 60_000;          // 1 min after max wrong answers
const cooldowns  = new Map();        // chatId → unblockTimestamp

// ── DB check: is this Telegram user already registered? ────────────────────
async function isRegisteredUser(chatId) {
  try {
    const res = await fetch(`${API_BASE}/api/users/me`, {
      headers: { 'x-telegram-id': String(chatId) }
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Captcha helpers ─────────────────────────────────────────────────────────
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
  const a      = randInt(2, 15);
  const b      = randInt(2, 15);
  const answer = a + b;
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
      await bot.editMessageText(text, {
        chat_id: chatId, message_id: editMsgId,
        parse_mode: 'Markdown', reply_markup: keyboard
      });
      state.msgId = editMsgId;
      return;
    } catch (_) {}
  }

  const sent = await bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown', reply_markup: keyboard
  });
  state.msgId = sent.message_id;
  pending.set(chatId, state);
}

async function sendAppMessage(chatId, refCode = null) {
  if (!webAppUrl) {
    await bot.sendMessage(
      chatId,
      'جارٍ تهيئة بوابة A.L.I الرقمية. يرجى المحاولة مجدداً بعد لحظات.'
    ).catch(() => {});
    return;
  }
  const appUrl = refCode
    ? `${webAppUrl}?startapp=${encodeURIComponent(refCode)}`
    : webAppUrl;

  await bot.sendMessage(chatId,
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
  ).catch(() => {});
}

// ── /start handler ─────────────────────────────────────────────────────────
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const text   = msg.text;

    // Silently delete every user message immediately
    silentDelete(chatId, msg.message_id);

    if (!text?.startsWith('/start')) return;

    // Extract referral code if present: /start ALI-2026-XXXX
    const parts   = text.trim().split(/\s+/);
    const refCode = parts[1] || null;
    if (refCode) refCodes.set(chatId, refCode);

    // Check cooldown
    const unblock = cooldowns.get(chatId);
    if (unblock && Date.now() < unblock) {
      const secs = Math.ceil((unblock - Date.now()) / 1000);
      bot.sendMessage(chatId, `⏳ يرجى الانتظار ${secs} ثانية قبل المحاولة مجدداً.`).catch(() => {});
      return;
    }

    // ── Already verified in this session ─────────────────────────────────
    if (verified.has(chatId)) {
      await sendAppMessage(chatId, refCodes.get(chatId) || null);
      return;
    }

    // ── Check DB: if already registered, skip captcha ─────────────────────
    const alreadyRegistered = await isRegisteredUser(chatId);
    if (alreadyRegistered) {
      verified.add(chatId);            // cache for this session
      const storedRef = refCodes.get(chatId) || null;
      refCodes.delete(chatId);
      await sendAppMessage(chatId, storedRef);
      return;
    }

    // ── New user: show captcha ────────────────────────────────────────────
    pending.delete(chatId);
    pending.set(chatId, { answer: null, attempts: 0, msgId: null });
    await sendCaptcha(chatId);

  } catch (err) {
    console.error('Message handler error:', err?.message ?? err);
  }
});

// ── Captcha callback_query ─────────────────────────────────────────────────
bot.on('callback_query', async (query) => {
  try {
    const { data, from, message } = query;
    const chatId = from.id;

    if (!data.startsWith('captcha:')) {
      bot.answerCallbackQuery(query.id).catch(() => {});
      return;
    }

    const parts    = data.split(':');
    const targetId = Number(parts[1]);
    const chosen   = Number(parts[2]);

    // Only the original user can answer
    if (chatId !== targetId) {
      bot.answerCallbackQuery(query.id, { text: '❌ هذا السؤال ليس لك.', show_alert: true }).catch(() => {});
      return;
    }

    const state = pending.get(chatId);
    if (!state) {
      bot.answerCallbackQuery(query.id, {
        text: 'انتهت صلاحية السؤال. أرسل /start من جديد.', show_alert: true
      }).catch(() => {});
      return;
    }

    if (chosen === state.answer) {
      // ✅ Correct
      verified.add(chatId);
      pending.delete(chatId);
      cooldowns.delete(chatId);

      await bot.answerCallbackQuery(query.id, { text: '✅ إجابة صحيحة! مرحباً بك.' });
      try { await bot.deleteMessage(chatId, message.message_id); } catch (_) {}

      const storedRef = refCodes.get(chatId) || null;
      refCodes.delete(chatId);
      await sendAppMessage(chatId, storedRef);

    } else {
      // ❌ Wrong
      state.attempts += 1;

      if (state.attempts >= MAX_WRONG) {
        cooldowns.set(chatId, Date.now() + COOLDOWN_MS);
        pending.delete(chatId);
        await bot.answerCallbackQuery(query.id, { text: '❌ إجابات خاطئة متعددة.', show_alert: true });
        try { await bot.deleteMessage(chatId, message.message_id); } catch (_) {}
        bot.sendMessage(
          chatId,
          '🚫 تجاوزت عدد المحاولات المسموح بها.\nيرجى الانتظار دقيقة واحدة ثم أرسل /start مجدداً.'
        ).catch(() => {});
      } else {
        const left = MAX_WRONG - state.attempts;
        await bot.answerCallbackQuery(query.id, {
          text: `❌ إجابة خاطئة. تبقى لك ${left} محاولة.`,
          show_alert: true
        });
        await sendCaptcha(chatId, message.message_id);
      }
    }

  } catch (err) {
    console.error('Callback query error:', err?.message ?? err);
    bot.answerCallbackQuery(query.id).catch(() => {});
  }
});

let consecutiveConflicts = 0;

bot.on('polling_error', (err) => {
  const is409 = err.message?.includes('409');
  if (is409) {
    consecutiveConflicts++;
    if (consecutiveConflicts === 1) {
      console.warn('Polling conflict detected — another bot instance is running.');
    }
    // After 6 consecutive 409s, yield to the deployed instance and stop polling
    if (consecutiveConflicts >= 6) {
      console.warn('Yielding to deployed bot instance. Dev polling stopped. Restart this workflow to resume.');
      bot.stopPolling();
    }
  } else {
    consecutiveConflicts = 0;
    console.error('Polling error:', err.message);
  }
});

async function silentDelete(chatId, messageId) {
  try { await bot.deleteMessage(chatId, messageId); } catch (_) {}
}

// ── Bot startup setup ──────────────────────────────────────────────────────
async function setupBot() {
  await bot.setMyCommands([
    { command: 'start', description: 'فتح البوابة الرقمية A.L.I' },
  ]).catch(() => {});

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

// In production deployments the bot runs via start.sh.
// Prevent the dev workflow from competing with the deployed instance.
if (process.env.REPLIT_DEPLOYMENT === '1') {
  console.log('Deployed environment detected — bot disabled in dev workflow to avoid polling conflict.');
  process.exit(0);
}

setupBot();
console.log('ALI Digital Gateway bot started. WebApp URL:', webAppUrl || '(not configured)');
