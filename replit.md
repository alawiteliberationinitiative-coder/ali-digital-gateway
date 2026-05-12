# Telegram Bot Project

A server-side project integrating a Telegram bot with a Supabase backend.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Required Secrets

These are stored in Replit Secrets (never hardcode them):

- `TELEGRAM_BOT_TOKEN` — your Telegram bot token from @BotFather
- `SUPABASE_URL` — your Supabase project URL
- `DATABASE_URL` — Postgres connection string (auto-provisioned)

Access in code via `process.env.TELEGRAM_BOT_TOKEN`, `process.env.SUPABASE_URL`, etc.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Supabase integration
- Telegram Bot API
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/` — Express server, routes, and bot logic
- `lib/db/src/schema/` — Drizzle ORM database schema
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Never hardcode `TELEGRAM_BOT_TOKEN` or `SUPABASE_URL` — always use `process.env`
- Always run `pnpm --filter @workspace/api-spec run codegen` after changing the OpenAPI spec

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
