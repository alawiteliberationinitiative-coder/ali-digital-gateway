# Threat Model

## Project Overview

This project is a Telegram-integrated application composed of a polling bot in `index.js`, a production API server in `artifacts/api-server/src`, and a Telegram Mini App frontend in `artifacts/ali-gateway/src`. Users interact through Telegram and the Mini App; the API persists user profiles, points, follows, spaces, invites, quiz progress, and uploaded document references. Production traffic is expected to arrive from Telegram clients and the public web deployment, while the bot and API use secrets from environment variables.

Production scope for this scan:
- `index.js` is production-relevant because `start.sh` launches it alongside the API server.
- `artifacts/api-server/src/**` is production-relevant and is the primary trust boundary.
- `artifacts/ali-gateway/src/**` is production-relevant as the browser-side Mini App.
- Development-only helpers and local workflow behavior are out of scope unless they are reachable from the deployed API or frontend.

## Assets

- **Telegram identity and session context** — Telegram Mini App `initData`, Telegram user IDs, and any headers derived from them. Compromise allows account impersonation.
- **User profile and application data** — aliId values, pseudonyms, referral relationships, loyalty points, levels, roles, follows, spaces, invites, and uploaded document references. Compromise affects privacy, integrity, and access control.
- **Application secrets** — `TELEGRAM_BOT_TOKEN`, `TELEGRAM_STORAGE_CHANNEL_ID`, and blockchain or third-party API configuration. Exposure could allow bot takeover or misuse of integrated services.
- **Private uploads and archive content** — document payloads sent through `/api/docs/upload-file` and stored through the Telegram bot token. Abuse could expose sensitive user-submitted material or let attackers fill the storage channel.

## Trust Boundaries

- **Telegram client / Mini App to API** — all client requests to `artifacts/api-server/src` are untrusted until the server validates Telegram identity. Any fallback to caller-controlled headers weakens the core authentication boundary.
- **Bot process to API** — `index.js` calls `http://localhost:22729/api/users/me` and trusts the API for registration state. This boundary is local-only but still security-sensitive because the API determines identity and registration state.
- **API to database** — the API has direct database write access through `@workspace/db`. Broken authorization or injection in the API would directly modify stored user and space state.
- **API to Telegram/third-party services** — the API sends documents to Telegram and queries external TON/CoinGecko services. Misuse can leak data or consume third-party quotas.
- **Public vs authenticated surfaces** — health checks, leaderboard-style reads, and public content should remain public; profile, follows, spaces participation, points, and document actions must be bound to the real Telegram user server-side.

## Scan Anchors

- Production entry points: `index.js`, `start.sh`, `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/ali-gateway/src/main.tsx`.
- Highest-risk area: `artifacts/api-server/src/middleware/telegram-auth.ts` because it defines identity for nearly every protected route.
- Protected server surfaces are mainly under `artifacts/api-server/src/routes/{users,ads,quiz,spaces,follows,docs}.ts`.
- Frontend auth header setup lives in `artifacts/ali-gateway/src/lib/api.ts` and `artifacts/ali-gateway/src/lib/telegram.tsx`.
- Ignore dev-only workflow conflict handling unless it becomes reachable from deployed HTTP routes.

## Threat Categories

### Spoofing

This application relies on Telegram identity to decide which user profile, points balance, follows graph, and space membership a request can access or modify. The API MUST only accept Telegram identity derived from a verified Mini App `initData` payload or another server-controlled mechanism; it MUST NOT trust client-supplied identity headers as an authentication substitute.

### Tampering

Many endpoints mutate points, levels, follows, invites, uploads, and space state. These actions MUST be authorized against the authenticated Telegram user on the server, and sensitive state changes MUST not accept another user’s identifier from a request body or URL unless the caller is explicitly authorized to act on that target.

### Information Disclosure

User profiles, followers, participants, invites, and uploaded document metadata are sensitive application data. The API MUST scope responses to the authenticated user where appropriate, and error messages, logs, and bot-upload captions MUST not expose secrets or enable spoofed audit trails.

### Denial of Service

The bot polls Telegram continuously and the API exposes public and semi-public routes that can trigger database writes and third-party API calls. Public or weakly authenticated routes MUST apply rate limits and payload limits sufficient to prevent channel spam, points farming, and resource exhaustion.

### Elevation of Privilege

The most serious privilege boundary is between anonymous/public callers and authenticated Telegram users, and between normal users and hosts/admins in the spaces system. Server-side authorization MUST be enforced from trusted identity data on every route, because any bypass at the authentication middleware would expose nearly the entire API surface to arbitrary account takeover and unauthorized state changes.
