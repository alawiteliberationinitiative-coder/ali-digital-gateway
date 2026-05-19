import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import compression from "compression";
import { logger } from "./lib/logger.js";
import router from "./routes/index.js";
import { verifyTelegram } from "./middleware/telegram-auth.js";

const app = express();

// ── Trust Replit's reverse proxy (required for express-rate-limit) ───────────
app.set("trust proxy", 1);

// ── Gzip/Brotli compression — reduces response size 60-80% on slow networks ──
app.use(compression({ threshold: 512 })); // only compress responses > 512 bytes

// ── Request timeout — prevents hung connections from blocking worker threads ──
app.use((req, res, next) => {
  res.setTimeout(30_000, () => {
    if (!res.headersSent) res.status(503).json({ error: "Request timeout — حاول مجدداً" });
  });
  next();
});

// ── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,       // Telegram WebApp manages its own CSP
    crossOriginEmbedderPolicy: false,   // Required for WebRTC / audio elements
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ── Body parsing ─────────────────────────────────────────────────────────────
// /api/articles/upload-media receives raw binary (video/image) — no JSON parsing.
app.use("/api/articles/upload-media", express.raw({ type: "*/*", limit: "80mb" }));
app.use(express.json({ limit: "1mb" }));

// ── Global rate limit: 300 req / min per IP ──────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests — حاول مجدداً بعد دقيقة" },
});

// ── Strict rate limit: 20 req / min for sensitive write endpoints ─────────────
const strictLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests — حاول مجدداً بعد دقيقة" },
});

app.use(globalLimiter);

// ── Structured request logging ───────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

// ── Telegram auth middleware ─────────────────────────────────────────────────
app.use(verifyTelegram as express.RequestHandler);

// ── Strict limiters on write / reward endpoints ──────────────────────────────
app.use("/api/users/register",           strictLimiter);
app.use("/api/ads/challenge",            strictLimiter);
app.use("/api/ads/reward",               strictLimiter);
app.use("/api/quiz/complete-level",      strictLimiter);
app.use("/api/docs/submit",              strictLimiter);
app.use("/api/docs/upload-file",         strictLimiter);
app.use("/api/spaces/:id/signals",       strictLimiter);
// Prevent view/like/comment/download/share botting
app.use("/api/articles/:id/view",        strictLimiter);
app.use("/api/articles/:id/like",        strictLimiter);
app.use("/api/articles/:id/comments",    strictLimiter);
app.use("/api/articles/:id/download",    strictLimiter);
app.use("/api/articles/:id/share",       strictLimiter);
// Prevent call spam (10 per min max)
app.use("/api/calls/initiate",           strictLimiter);

// ── Cache-Control for public read-only endpoints ─────────────────────────────
// These are safe to cache for a short period — reduces round-trips on slow networks
const SHORT_CACHE = "public, max-age=30, stale-while-revalidate=60";
const MED_CACHE   = "public, max-age=120, stale-while-revalidate=300";
app.use("/api/users/leaderboard",  (_req, res, next) => { res.setHeader("Cache-Control", MED_CACHE);   next(); });
app.use("/api/articles",           (req,  res, next) => {
  // Only cache GET list — not individual views/likes/comments (POST)
  if (req.method === "GET" && !req.path.includes("/view") && !req.path.includes("/like") && !req.path.includes("/comments")) {
    res.setHeader("Cache-Control", SHORT_CACHE);
  }
  next();
});
app.use("/api/healthz",            (_req, res, next) => { res.setHeader("Cache-Control", "no-store");   next(); });

// ── API router ───────────────────────────────────────────────────────────────
app.use("/api", router);

// ── Global error handler — catches unhandled async throws in Express 5 ───────
// Must have 4 parameters for Express to treat it as error middleware.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  (req as express.Request & { log?: { error: (...a: unknown[]) => void } }).log?.error(
    { err, url: req.url, method: req.method },
    "Unhandled server error"
  );
  if (!res.headersSent) {
    res.status(500).json({ error: "خطأ في الخادم — يرجى المحاولة لاحقاً" });
  }
});

export default app;
