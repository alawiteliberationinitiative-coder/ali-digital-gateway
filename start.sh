#!/bin/sh
# Build the db lib declarations first
cd lib/db && npx tsc --build && cd /home/runner/workspace

# Start the Telegram bot in background
node index.js &

# Start the API server using tsx (handles TypeScript + workspace imports natively)
cd artifacts/api-server && exec node_modules/.bin/tsx src/index.ts
