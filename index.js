const http   = require('http');
const crypto = require('crypto');

const token          = process.env.TELEGRAM_BOT_TOKEN;
const domains        = (process.env.REPLIT_DOMAINS || '').split(',').map(d => d.trim()).filter(Boolean);
const webAppUrl      = domains.length > 0 ? `https://${domains[0]}` : null;
// BotFather short-name registered via /newapp — used for direct t.me deep links.
// When a user opens https://t.me/ALI_MDD_BOT/app?startapp=<code> Telegram
// opens the Mini App directly WITHOUT going through the bot chat.
const BOT_USERNAME   = "ALI_MDD_BOT";
const APP_SHORT_NAME = "app";

// ── Minimal Telegram Bot (native fetch, no external HTTP library) ─────────────
class TelegramBot {
  constructor(token) {
    this._token    = token;
    this._base     = `https://api.telegram.org/bot${token}`;
    this._handlers = {};
    this._polling  = false;
  }

  async _call(method, params = {}) {
    const res = await fetch(`${this._base}/${method}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.ok) {
      const err = new Error(data.description || `${method} failed (${res.status})`);
      err.code = data.error_code;
      throw err;
    }
    return data.result;
  }

  on(event, handler) {
    if (!this._handlers[event]) this._handlers[event] = [];
    this._handlers[event].push(handler);
    return this;
  }

  _emit(event, payload) {
    for (const h of (this._handlers[event] || [])) {
      try { h(payload); } catch (e) { console.error(`Handler error (${event}):`, e.message); }
    }
  }

  processUpdate(update) {
    if (update.message)        this._emit('message', update.message);
    if (update.callback_query) this._emit('callback_query', update.callback_query);
  }

  sendMessage(chatId, text, opts = {}) {
    return this._call('sendMessage', { chat_id: chatId, text, ...opts });
  }

  editMessageText(text, opts = {}) {
    return this._call('editMessageText', { text, ...opts });
  }

  deleteMessage(chatId, messageId) {
    return this._call('deleteMessage', { chat_id: chatId, message_id: messageId });
  }

  answerCallbackQuery(callbackQueryId, opts = {}) {
    return this._call('answerCallbackQuery', { callback_query_id: callbackQueryId, ...opts });
  }

  setMyCommands(commands) {
    return this._call('setMyCommands', { commands });
  }

  stopPolling() {
    this._polling = false;
  }

  startPolling() {
    this._polling = true;
    this._pollLoop().catch(e => console.error('Polling loop crashed:', e.message));
    return this;
  }

  async _pollLoop() {
    let offset = 0;
    while (this._polling) {
      try {
        const updates = await this._call('getUpdates', {
          offset,
          timeout: 60,
          allowed_updates: ['message', 'callback_query'],
        });
        for (const u of updates) {
          if (u.update_id >= offset) offset = u.update_id + 1;
          this.processUpdate(u);
        }
      } catch (err) {
        this._emit('polling_error', err);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
}

// ── Webhook secret (derived deterministically from the bot token) ─────────────
function webhookSecret() {
  return crypto.createHash('sha256').update(token + 'webhook').digest('hex').slice(0, 64);
}

// ── Human-verification state (in-memory per-session) ─────────────────────────
const verified   = new Set();    // chatIds that passed captcha this session
const pending    = new Map();    // chatId → { answer, attempts, msgId }
const refCodes   = new Map();    // chatId → aliId referral code
const cooldowns  = new Map();    // chatId → unblockTimestamp
const MAX_WRONG  = 3;
const COOLDOWN_MS = 60_000;

// Periodic cleanup: prevent memory accumulation for long-running instances
setInterval(() => {
  const now = Date.now();
  for (const [id, ts] of cooldowns) { if (now > ts) cooldowns.delete(id); }
  for (const id of pending.keys())  { if (verified.has(id)) pending.delete(id); }
  for (const id of refCodes.keys()) { if (verified.has(id)) refCodes.delete(id); }
}, 10 * 60 * 1000); // every 10 minutes

// ── Supabase registration check (skip captcha for known members) ──────────────
async function isUserRegistered(telegramId) {
  try {
    const supabaseUrl = (process.env.SUPABASE_URL || '')
      .replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceKey) return false;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/ali_users?telegram_id=eq.${encodeURIComponent(String(telegramId))}&select=id&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

// ── Captcha helpers ───────────────────────────────────────────────────────────
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

async function sendCaptcha(bot, chatId, editMsgId = null) {
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

async function sendAppMessage(bot, chatId, refCode = null) {
  if (!webAppUrl) {
    await bot.sendMessage(
      chatId,
      'جارٍ تهيئة بوابة A.L.I الرقمية. يرجى المحاولة مجدداً بعد لحظات.'
    ).catch(() => {});
    return;
  }

  // web_app button URL → opens Mini App directly inside Telegram
  const webAppBtnUrl = refCode
    ? `${webAppUrl}?startapp=${encodeURIComponent(refCode)}`
    : webAppUrl;

  // Direct deep link → https://t.me/BOT/app?startapp=code
  // Opens the Mini App without going through the bot chat (requires BotFather /newapp setup)
  const directLink = refCode
    ? `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}?startapp=${encodeURIComponent(refCode)}`
    : `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}`;

  await bot.sendMessage(chatId,
`🟢 *مبادرة التحرير العلوي — A.L.I*

أهلاً بك في البوابة الرقمية السيادية.

هذه المنصة حكر على أعضاء مبادرة التحرير العلوي المسجّلين.
ستحصل على هويّة رقمية فريدة ومفاتيح التشفير الثلاثة لحماية حسابك.

🔗 رابطك المباشر:
\`${directLink}\`

_"حق لا يموت"_

🔰 *Alawite Liberation Initiative — A.L.I*
_Management of Diversified Development · $MDD_`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🚀 إطلاق البوابة الآمنة', web_app: { url: webAppBtnUrl } }
        ]]
      }
    }
  ).catch(() => {});
}

function silentDelete(bot, chatId, messageId) {
  bot.deleteMessage(chatId, messageId).catch(() => {});
}

// ── Register all bot event handlers ──────────────────────────────────────────
function registerHandlers(bot, isPolling) {
  // /start handler
  bot.on('message', async (msg) => {
    try {
      const chatId = msg.chat.id;
      const text   = msg.text;

      silentDelete(bot, chatId, msg.message_id);

      if (!text?.startsWith('/start')) return;

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

      // Already verified this session → open app directly
      if (verified.has(chatId)) {
        await sendAppMessage(bot, chatId, refCodes.get(chatId) || null);
        return;
      }

      // Check if already registered in DB → skip captcha
      const registered = await isUserRegistered(chatId);
      if (registered) {
        verified.add(chatId);
        await sendAppMessage(bot, chatId, refCode || null);
        return;
      }

      // New user: show captcha
      pending.delete(chatId);
      pending.set(chatId, { answer: null, attempts: 0, msgId: null });
      await sendCaptcha(bot, chatId);

    } catch (err) {
      console.error('Message handler error:', err?.message ?? err);
    }
  });

  // Captcha callback_query handler
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
        await sendAppMessage(bot, chatId, storedRef);

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
          await sendCaptcha(bot, chatId, message.message_id);
        }
      }

    } catch (err) {
      console.error('Callback query error:', err?.message ?? err);
      bot.answerCallbackQuery(query.id).catch(() => {});
    }
  });

  // Polling error handler (dev only)
  if (isPolling) {
    let consecutiveConflicts = 0;
    bot.on('polling_error', (err) => {
      const is409 = err.message?.includes('409') || err.message?.includes('Conflict');
      if (is409) {
        consecutiveConflicts++;
        if (consecutiveConflicts === 1) {
          console.warn('Polling conflict — another bot instance is running.');
        }
        if (consecutiveConflicts >= 6) {
          console.warn('Yielding to deployed bot. Dev polling stopped. Restart workflow to resume.');
          bot.stopPolling();
        }
      } else {
        consecutiveConflicts = 0;
        console.error('Polling error:', err.message);
      }
    });
  }
}

// ── Bot setup (commands + menu button) ───────────────────────────────────────
async function setupBot(bot) {
  await bot.setMyCommands([
    { command: 'start', description: 'فتح البوابة الرقمية A.L.I' },
  ]).catch(() => {});

  if (webAppUrl) {
    await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: { type: 'web_app', text: '🚀 البوابة', web_app: { url: webAppUrl } },
      }),
    }).catch(() => {});
  }
}

// ── Production: Webhook mode ──────────────────────────────────────────────────
if (process.env.REPLIT_DEPLOYMENT === '1') {
  console.log('Production mode: starting bot in webhook mode…');

  const bot = new TelegramBot(token);
  registerHandlers(bot, false);

  // Register webhook with Telegram
  if (webAppUrl && domains[0]) {
    const webhookUrl = `https://${domains[0]}/api/telegram/webhook`;
    fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url:             webhookUrl,
        secret_token:    webhookSecret(),
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: false,
      }),
    })
      .then(r => r.json())
      .then(d => console.log('Webhook registered:', d.description))
      .catch(err => console.error('Webhook registration failed:', err.message));
  }

  // Local HTTP server that receives forwarded updates from the API server
  const server = http.createServer((req, res) => {
    if (req.method !== 'POST') { res.writeHead(405).end(); return; }
    let body = '';
    let tooLarge = false;
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) { // 1 MB guard against oversized payloads
        tooLarge = true;
        res.writeHead(413).end('Payload Too Large');
        req.destroy();
      }
    });
    req.on('end', () => {
      if (tooLarge) return;
      try {
        const update = JSON.parse(body);
        bot.processUpdate(update);
        res.writeHead(200).end('OK');
      } catch {
        res.writeHead(400).end('Bad Request');
      }
    });
  });

  server.listen(22728, '127.0.0.1', () => {
    console.log('Bot webhook server ready on 127.0.0.1:22728');
  });

  setupBot(bot);
  console.log('ALI bot started (webhook). WebApp URL:', webAppUrl || '(not configured)');

} else {
  // ── Development: Polling mode ─────────────────────────────────────────────
  const bot = new TelegramBot(token);
  registerHandlers(bot, true);
  bot.startPolling();
  setupBot(bot);
  console.log('ALI bot started (polling). WebApp URL:', webAppUrl || '(not configured)');
}
