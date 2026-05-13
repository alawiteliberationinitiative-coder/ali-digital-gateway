#!/bin/sh
# Start the Telegram bot in background
node index.js &
BOT_PID=$!

# Start the API server in foreground (keeps container alive)
node artifacts/api-server/dist/index.js
