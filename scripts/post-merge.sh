#!/bin/bash
set -e

echo "Running post-merge setup..."

pnpm install --frozen-lockfile=false

if [ -d "lib/db" ]; then
  echo "Pushing database schema..."
  pnpm --filter @workspace/db run push || true
fi

echo "Post-merge setup complete."
