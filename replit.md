# Telegram Bot

Minimal Telegram bot using `node-telegram-bot-api` with polling.

## Run

- `node index.js` — starts the bot

## Required Secrets

- `TELEGRAM_BOT_TOKEN` — bot token from @BotFather

## Files

- `index.js` — the entire bot (handles `/start`)
- `package.json` — single dependency: `node-telegram-bot-api`

## Notes

- Uses long polling (no webhook). Long-poll timeout: 60s. HTTP request timeout: 60s. Tuned for unstable/VPN networks.
