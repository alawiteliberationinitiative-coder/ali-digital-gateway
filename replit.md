# ALI Digital Gateway

Telegram Mini App — Node.js CJS polling bot + React+Vite+Tailwind RTL Arabic WebApp.

## Architecture

- `index.js` — Telegram bot (long polling, handles `/start` with Mini App launch link)
- `artifacts/api-server/` — Express 5 REST API (`@workspace/api-server`)
- `artifacts/ali-gateway/` — React+Vite RTL Arabic frontend (`@workspace/ali-gateway`)
- `lib/db/` — Drizzle ORM schema + Supabase HTTP client (`@workspace/db`)

## Database

Uses **Supabase** (project: `fgvdtxxggpiukhllntfd`) via HTTP/PostgREST.

Replit cannot reach Supabase over TCP/PostgreSQL, so all queries go through the
`drizzle_query(sql text) RETURNS json` RPC function installed in Supabase.
The function wraps every SELECT in `json_agg(row_to_json(t))` and is callable
only by the `service_role` key.

Setup files:
- `scripts/supabase-rpc.sql` — create/update the `drizzle_query` RPC function
- `scripts/supabase-migration.sql` — full schema + data migration (run once)

## Required Secrets

| Secret | Purpose |
|--------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather |
| `SUPABASE_URL` | `https://fgvdtxxggpiukhllntfd.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (sb_secret_...) |
| `SUPABASE_ANON_KEY` | Anon/public key (JWT) |
| `SUPABASE_DB_PASSWORD` | Database password |
| `SUPABASE_CONNECTION_STRING` | PostgreSQL connection string (kept for reference) |
| `SESSION_SECRET` | Express session secret |

## Notes

- Bot uses long polling (no webhook). Long-poll timeout: 60s.
- API auth: HMAC-SHA256 via `x-telegram-init-data` header (Telegram Mini App).
- All DB queries go via HTTPS to Supabase PostgREST — no direct TCP to PostgreSQL.
- `lib/db/src/index.ts` uses `drizzle-orm/pg-proxy` with a custom HTTP executor.
