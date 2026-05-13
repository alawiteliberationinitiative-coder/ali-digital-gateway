#!/bin/sh
WORKSPACE=/home/runner/workspace

# Start the Telegram bot in background
node "$WORKSPACE/index.js" &

# Start the API server — tsx handles TypeScript + workspace path aliases natively
exec "$WORKSPACE/artifacts/api-server/node_modules/.bin/tsx" \
     "$WORKSPACE/artifacts/api-server/src/index.ts"
