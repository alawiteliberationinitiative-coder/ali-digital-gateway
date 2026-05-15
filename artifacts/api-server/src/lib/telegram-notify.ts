/**
 * Shared Telegram bot notification helper.
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
