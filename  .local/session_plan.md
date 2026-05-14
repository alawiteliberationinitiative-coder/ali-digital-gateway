# Objective
Assess the deployed Telegram bot, API server, and Mini App for concrete production vulnerabilities, with emphasis on Telegram identity verification, authorization, public write endpoints, and third-party/script trust.

# Relevant information
- Production runtime starts both `index.js` and `artifacts/api-server/src/index.ts` via `start.sh`.
- The primary trust boundary is Telegram client/Mini App -> API server.
- `artifacts/api-server/src/middleware/telegram-auth.ts` determines `req.telegramId` for nearly all protected routes.
- Confirmed hypothesis to validate across routes: the middleware falls back to caller-controlled `x-telegram-id`, which may let arbitrary external clients impersonate users.
- Only production-reachable issues should be reported; dev-only workflow behavior is out of scope.

# Tasks

### T001: Validate API auth and authorization impact
- **Blocked By**: []
- **Details**:
  - Trace how `req.telegramId` is set and which routes trust it.
  - Determine whether spoofing `x-telegram-id` enables profile access, points changes, follows, docs actions, or admin/host actions.
  - Relevant files: `artifacts/api-server/src/middleware/telegram-auth.ts`, `artifacts/api-server/src/routes/*.ts`, `artifacts/ali-gateway/src/lib/{api,telegram}.ts*`.
  - Acceptance: Either rule out spoofing or document impacted routes and severity.

### T002: Review public write surfaces and client-side trust issues
- **Blocked By**: []
- **Details**:
  - Review `docs`, external script usage, ad integration, and other public endpoints for exploitable abuse beyond the main auth issue.
  - Distinguish scanner false positives from real issues.
  - Relevant files: `artifacts/api-server/src/routes/docs.ts`, `artifacts/ali-gateway/index.html`, `artifacts/ali-gateway/src/**`.
  - Acceptance: Confirm any second independent vulnerability or conclude the remaining findings are non-actionable.
