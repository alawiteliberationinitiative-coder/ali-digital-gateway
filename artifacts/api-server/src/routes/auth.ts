/**
 * Native-app authentication routes.
 *
 * POST /api/auth/generate-code      — bot creates a one-time code
 * POST /api/auth/verify-code        — native app exchanges code for JWT
 * POST /api/auth/refresh            — native app extends a valid JWT
 * GET  /api/auth/magic/:code        — HTML landing page for deep-link auto-login
 * GET  /api/auth/captcha            — generate a math CAPTCHA for registration
 * POST /api/auth/login-by-aliid     — login with aliId + pseudonym (no Telegram needed)
 * POST /api/auth/register-native    — register new user with pseudonym + CAPTCHA
 */
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { createCode, consumeCode } from "../lib/auth-codes.js";
import { signNativeJwt, verifyNativeJwt } from "../lib/jwt.js";
import { db, eq, and, usersTable } from "@workspace/db";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts — حاول لاحقاً" },
});

/* ── Shared helpers (mirrors users.ts — kept local to avoid circular imports) ── */

function generateAliId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `ALI-2026-${suffix}`;
}

function generateKey(prefix: string): string {
  const hex = () =>
    Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, "0");
  return `${prefix}-${hex()}-${hex()}-${hex()}`;
}

/* ── In-memory CAPTCHA store ─────────────────────────────────────────────── */

interface CaptchaEntry { answer: number; expiry: number }
const captchaStore = new Map<string, CaptchaEntry>();

function purgeCaptchas() {
  const now = Date.now();
  for (const [k, v] of captchaStore) { if (v.expiry < now) captchaStore.delete(k); }
}

function genToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * POST /api/auth/generate-code
 * Called by the Telegram bot. Body: { telegramId, botSecret }
 */
router.post("/auth/generate-code", authLimiter, (req, res): void => {
  const { telegramId, botSecret } = req.body as { telegramId?: unknown; botSecret?: unknown };

  if (typeof botSecret !== "string" || botSecret !== process.env.TELEGRAM_BOT_TOKEN) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  if (typeof telegramId !== "string" || !/^\d{5,15}$/.test(telegramId)) {
    res.status(400).json({ error: "Invalid telegramId" }); return;
  }

  const code = createCode(telegramId);
  req.log.info({ telegramId }, "native login code generated");
  res.json({ code });
});

/**
 * POST /api/auth/verify-code
 * Called by the native app. Body: { code }
 * Returns: { token, telegramId }
 */
router.post("/auth/verify-code", authLimiter, (req, res): void => {
  const { code } = req.body as { code?: unknown };

  if (typeof code !== "string" || code.length < 4 || code.length > 12) {
    res.status(400).json({ error: "رمز غير صالح" }); return;
  }

  const telegramId = consumeCode(code);
  if (!telegramId) {
    res.status(401).json({ error: "الرمز غير صحيح أو انتهت صلاحيته" }); return;
  }

  const token = signNativeJwt(telegramId);
  req.log.info({ telegramId }, "native JWT issued");
  res.json({ token, telegramId });
});

/**
 * POST /api/auth/refresh
 * Refreshes a valid native JWT.
 */
router.post("/auth/refresh", (req, res): void => {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization header required" }); return;
  }

  const existing = verifyNativeJwt(authHeader.slice(7));
  if (!existing) {
    res.status(401).json({ error: "Invalid or expired token" }); return;
  }

  const token = signNativeJwt(existing.telegramId);
  req.log.info({ telegramId: existing.telegramId }, "native JWT refreshed");
  res.json({ token, telegramId: existing.telegramId });
});

/**
 * GET /api/auth/magic/:code
 * HTML landing page that auto-redirects to the Android deep link.
 */
router.get("/auth/magic/:code", (req, res): void => {
  const raw  = String(req.params.code ?? "");
  const code = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);

  if (code.length < 4) { res.status(400).send("رابط غير صالح"); return; }

  const deepLink = `com.ali.digitalgateway://auth?code=${code}`;
  const apkUrl   =
    "https://github.com/alawiteliberationinitiative-coder/ali-digital-gateway/releases/latest/download/ALI-Gateway.apk";

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>دخول ALI.MDD</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0b0b14;color:#fff;font-family:'Segoe UI',Tahoma,sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center}
    .logo{width:88px;height:88px;border-radius:22px;margin-bottom:24px;object-fit:cover}
    h1{font-size:22px;font-weight:900;color:#d4af37;margin-bottom:8px}
    .sub{font-size:13px;color:rgba(255,255,255,.45);margin-bottom:32px;line-height:1.7}
    .btn{display:block;width:100%;max-width:320px;padding:16px;border-radius:16px;font-size:15px;font-weight:700;text-decoration:none;margin:0 auto 12px;cursor:pointer;border:none;transition:opacity .15s}
    .btn:active{opacity:.8}
    .btn-gold{background:linear-gradient(135deg,#d4af37,#b8962e);color:#0b0b14}
    .btn-ghost{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.13);color:rgba(255,255,255,.6)}
    .code-wrap{margin:8px auto 24px}
    .code-label{font-size:11px;color:rgba(255,255,255,.3);margin-bottom:6px}
    .code-box{display:inline-block;background:rgba(212,175,55,.09);border:1.5px solid rgba(212,175,55,.3);border-radius:12px;padding:10px 28px;font-family:monospace;font-size:26px;font-weight:900;letter-spacing:.35em;color:#d4af37}
    .note{font-size:11px;color:rgba(255,255,255,.2);margin-top:20px;line-height:1.6}
    .spinner{width:20px;height:20px;border:3px solid rgba(11,11,20,.3);border-top-color:#0b0b14;border-radius:50%;display:inline-block;animation:spin .7s linear infinite;vertical-align:middle;margin-left:8px}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <img class="logo" src="/icon-ali.png" alt="ALI.MDD" onerror="this.style.display='none'">
  <h1>مرحباً في ALI.MDD</h1>
  <p class="sub">سيُفتح التطبيق تلقائياً...<br>إذا لم يفتح، اضغط الزر أدناه</p>
  <a class="btn btn-gold" href="${deepLink}" id="openBtn">🔓 فتح التطبيق وتسجيل الدخول <span class="spinner" id="spin"></span></a>
  <div class="code-wrap">
    <p class="code-label">أو أدخل الرمز يدوياً في التطبيق</p>
    <div class="code-box">${code}</div>
  </div>
  <a class="btn btn-ghost" href="${apkUrl}">⬇️ تحميل التطبيق</a>
  <p class="note">⚠️ هذا الرابط صالح لمدة ١٠ دقائق فقط<br>لا تشاركه مع أي شخص</p>
  <script>
    setTimeout(function(){ document.getElementById('spin').style.display='none'; window.location.href='${deepLink}'; }, 900);
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(html);
});

/**
 * GET /api/auth/captcha
 *
 * Generates a simple math CAPTCHA for native registration.
 * Returns: { token: string, question: string }
 * Token expires in 2 minutes and is single-use.
 */
router.get("/auth/captcha", authLimiter, (req, res): void => {
  purgeCaptchas();
  const a = Math.floor(Math.random() * 20) + 3;
  const b = Math.floor(Math.random() * 20) + 3;
  const token = genToken();
  captchaStore.set(token, { answer: a + b, expiry: Date.now() + 120_000 });
  res.json({ token, question: `${a} + ${b}` });
});

/**
 * POST /api/auth/login-by-aliid
 *
 * Login for existing members who don't have Telegram on their device.
 * Body: { aliId: string, pseudonym: string }
 * Returns: { token, telegramId }
 */
router.post("/auth/login-by-aliid", authLimiter, async (req, res): Promise<void> => {
  const { aliId, pseudonym } = req.body as { aliId?: unknown; pseudonym?: unknown };

  if (typeof aliId !== "string" || !/^ALI-\d{4}-[A-Z0-9]{4}$/i.test(aliId.trim())) {
    res.status(400).json({ error: "صيغة رقم العضوية غير صحيحة (مثال: ALI-2026-AB12)" }); return;
  }
  if (typeof pseudonym !== "string" || pseudonym.trim().length < 3) {
    res.status(400).json({ error: "الاسم المستعار مطلوب" }); return;
  }

  const normalizedAliId = aliId.trim().toUpperCase();
  const normalizedPseudonym = pseudonym.trim();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.aliId, normalizedAliId),
        eq(usersTable.pseudonym, normalizedPseudonym),
      ),
    );

  if (!user) {
    res.status(401).json({ error: "رقم العضوية أو الاسم المستعار غير صحيح" }); return;
  }

  const token = signNativeJwt(user.telegramId);
  req.log.info({ aliId: normalizedAliId }, "login-by-aliid succeeded");
  res.json({ token, telegramId: user.telegramId });
});

/**
 * POST /api/auth/register-native
 *
 * Registers a brand-new user (no Telegram account needed).
 * Body: { pseudonym: string, captchaToken: string, captchaAnswer: number }
 * Returns: { token, telegramId, aliId, pseudonym }
 */
router.post("/auth/register-native", authLimiter, async (req, res): Promise<void> => {
  purgeCaptchas();

  const { pseudonym, captchaToken, captchaAnswer } = req.body as {
    pseudonym?:     unknown;
    captchaToken?:  unknown;
    captchaAnswer?: unknown;
  };

  /* ── Validate CAPTCHA ───────────────────────────────────────────────────── */
  if (typeof captchaToken !== "string") {
    res.status(400).json({ error: "رمز التحقق مطلوب" }); return;
  }
  const captcha = captchaStore.get(captchaToken);
  if (!captcha || captcha.expiry < Date.now()) {
    res.status(400).json({ error: "رمز التحقق منتهي الصلاحية — اضغط تحديث للحصول على سؤال جديد" }); return;
  }
  const givenAnswer = Number(captchaAnswer);
  captchaStore.delete(captchaToken); // single-use regardless of result
  if (isNaN(givenAnswer) || givenAnswer !== captcha.answer) {
    res.status(400).json({ error: "الإجابة خاطئة — حاول مجدداً" }); return;
  }

  /* ── Validate pseudonym ────────────────────────────────────────────────── */
  if (typeof pseudonym !== "string") {
    res.status(400).json({ error: "الاسم المستعار مطلوب" }); return;
  }
  const trimmed = pseudonym.trim();
  if (trimmed.length < 3 || trimmed.length > 30) {
    res.status(400).json({ error: "الاسم المستعار يجب أن يكون بين 3 و 30 حرفاً" }); return;
  }
  if (!/^[\w\u0600-\u06FF\- ]+$/.test(trimmed)) {
    res.status(400).json({ error: "الاسم المستعار يحتوي على رموز غير مسموح بها" }); return;
  }

  /* ── Check pseudonym uniqueness ────────────────────────────────────────── */
  const [pConflict] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.pseudonym, trimmed));
  if (pConflict) {
    res.status(409).json({ error: "هذا الاسم المستعار محجوز — جرب اسماً آخر" }); return;
  }

  /* ── Generate synthetic telegramId (numeric, 13-digit, starts with 99) ── */
  // Range: 9900000000000 – 9999999999999 (safe: real Telegram IDs are ≤13 digits but
  // assigned sequentially from 1; this 99-prefix range is never used by Telegram).
  const syntheticId = "99" + String(Math.floor(Math.random() * 1e11)).padStart(11, "0");

  const [idConflict] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.telegramId, syntheticId));
  if (idConflict) {
    res.status(500).json({ error: "حدث خطأ داخلي — يرجى المحاولة مجدداً" }); return;
  }

  /* ── Generate aliId (unique) ───────────────────────────────────────────── */
  let aliId = generateAliId();
  for (let i = 0; i < 10; i++) {
    const [c] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.aliId, aliId));
    if (!c) break;
    aliId = generateAliId();
  }

  /* ── Create user ───────────────────────────────────────────────────────── */
  const [created] = await db
    .insert(usersTable)
    .values({
      aliId,
      pseudonym:     trimmed,
      telegramId:    syntheticId,
      vaultKey:      generateKey("VLT"),
      identityKey:   generateKey("IDT"),
      masterKey:     generateKey("MST"),
      mddBalance:    "250",
      rank:          "Initiate",
      level:         1,
      keysConfirmed: false,
      referredBy:    null,
    })
    .returning();

  const token = signNativeJwt(syntheticId);
  req.log.info({ aliId, syntheticId }, "native registration completed");
  res.status(201).json({ token, telegramId: syntheticId, aliId, pseudonym: trimmed, user: created });
});

export default router;
