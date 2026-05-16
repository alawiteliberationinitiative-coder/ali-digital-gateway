/**
 * Shared Telegram bot helpers.
 *
 * sendBotNotification  — inline-keyboard DM to a single user.
 * sendArticleToChannel — archive new article to the storage channel (fire-and-forget).
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise raw channel ID from env to the -100XXXXXXXXXX format Telegram expects. */
function normaliseChatId(raw: string): string {
  const s = raw.trim();
  if (/^\d+$/.test(s))            return `-100${s}`;       // bare digits
  if (/^-(?!100)\d+$/.test(s))    return `-100${s.slice(1)}`; // wrong-prefix negative
  return s;                                                 // already correct or @username
}

function isVideoExt(url: string): boolean {
  return /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(url);
}

function buildChannelText(article: {
  id: number;
  title: string;
  body: string;
  authorPseudonym: string;
  authorAliId: string;
  createdAt: string;
}): string {
  const bodySnip = article.body.length > 700
    ? article.body.slice(0, 700) + "…"
    : article.body;
  const date = new Date(article.createdAt).toLocaleString("ar-SA", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  return (
    `🌿 *بوابة ALI الرقمية*\n` +
    `━━━━━━━━━━━━━━━━━\n\n` +
    `📰 *${article.title}*\n\n` +
    `${bodySnip}\n\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `✍️ ${article.authorPseudonym} · \`${article.authorAliId}\`\n` +
    `🕒 ${date}\n` +
    `🆔 #مقال_${article.id} #ALI_Media`
  );
}

// ── sendArticleToChannel ──────────────────────────────────────────────────────
/**
 * Archives a newly published article to the Telegram storage channel.
 * Fire-and-forget — never throws, never blocks the HTTP response.
 */
export function sendArticleToChannel(article: {
  id: number;
  title: string;
  body: string;
  mediaUrl?: string | null;
  authorPseudonym: string;
  authorAliId: string;
  createdAt: string;
}): void {
  const token     = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_STORAGE_CHANNEL_ID;
  if (!token || !channelId) return;

  const chatId  = normaliseChatId(channelId);
  const text    = buildChannelText(article);
  const baseOps = { chat_id: chatId, parse_mode: "Markdown", disable_notification: true };

  let endpoint: string;
  let payload: Record<string, unknown>;

  if (article.mediaUrl && isVideoExt(article.mediaUrl)) {
    endpoint = "sendVideo";
    payload  = { ...baseOps, video: article.mediaUrl, caption: text.slice(0, 1024), supports_streaming: true };
  } else if (article.mediaUrl) {
    endpoint = "sendPhoto";
    payload  = { ...baseOps, photo: article.mediaUrl, caption: text.slice(0, 1024) };
  } else {
    endpoint = "sendMessage";
    payload  = { ...baseOps, text: text.slice(0, 4096) };
  }

  fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  }).catch(() => { /* silently ignore — storage channel is best-effort */ });
}

// ── sendBotNotification ───────────────────────────────────────────────────────
/**
 * Sends an inline-keyboard message to a user's Telegram chat.
 * The web_app button URL includes a `startapp` query param so the
 * frontend can deep-link to the correct section on launch.
 */
export function sendBotNotification(opts: {
  toTelegramId: string;
  text: string;
  buttonText: string;
  navParam?: string;
}): void {
  const token   = process.env.TELEGRAM_BOT_TOKEN;
  const domains = (process.env.REPLIT_DOMAINS ?? "").split(",").map(d => d.trim()).filter(Boolean);
  const webApp  = domains[0] ? `https://${domains[0]}` : null;
  if (!token || !webApp) return;

  const url = opts.navParam
    ? `${webApp}?startapp=${encodeURIComponent(opts.navParam)}`
    : webApp;

  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id:      opts.toTelegramId,
      text:         opts.text,
      parse_mode:   "Markdown",
      reply_markup: { inline_keyboard: [[{ text: opts.buttonText, web_app: { url } }]] },
    }),
  }).catch(() => {});
}
