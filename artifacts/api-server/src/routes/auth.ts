/**
 * Native-app authentication routes.
 *
 * POST /api/auth/generate-code  — called by the Telegram bot to create a one-time code
 * POST /api/auth/verify-code    — called by the native app to exchange a code for a JWT
 * POST /api/auth/refresh        — called by the native app to extend a valid JWT
 */
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { createCode, consumeCode } from "../lib/auth-codes.js";
import { signNativeJwt, verifyNativeJwt } from "../lib/jwt.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts — حاول لاحقاً" },
});

/**
 * POST /api/auth/generate-code
 *
 * Called by the Telegram bot with the user's telegramId and a shared botSecret.
 * Returns a one-time 8-char code that the bot sends to the user.
 *
 * Body: { telegramId: string, botSecret: string }
 * Auth: botSecret must equal TELEGRAM_BOT_TOKEN
 */
router.post("/auth/generate-code", authLimiter, (req, res): void => {
  const { telegramId, botSecret } = req.body as {
    telegramId?: unknown;
    botSecret?:  unknown;
  };

  if (
    typeof botSecret !== "string" ||
    botSecret !== process.env.TELEGRAM_BOT_TOKEN
  ) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (
    typeof telegramId !== "string" ||
    !/^\d{5,15}$/.test(telegramId)
  ) {
    res.status(400).json({ error: "Invalid telegramId" });
    return;
  }

  const code = createCode(telegramId);
  req.log.info({ telegramId }, "native login code generated");
  res.json({ code });
});

/**
 * POST /api/auth/verify-code
 *
 * Called by the native app. Validates the one-time code and returns a JWT.
 *
 * Body: { code: string }
 * Returns: { token: string, telegramId: string }
 */
router.post("/auth/verify-code", authLimiter, (req, res): void => {
  const { code } = req.body as { code?: unknown };

  if (typeof code !== "string" || code.length < 4 || code.length > 12) {
    res.status(400).json({ error: "رمز غير صالح" });
    return;
  }

  const telegramId = consumeCode(code);
  if (!telegramId) {
    res.status(401).json({ error: "الرمز غير صحيح أو انتهت صلاحيته" });
    return;
  }

  const token = signNativeJwt(telegramId);
  req.log.info({ telegramId }, "native JWT issued");
  res.json({ token, telegramId });
});

/**
 * POST /api/auth/refresh
 *
 * Refreshes a valid native JWT. Requires a valid Bearer token in the Authorization header.
 * Returns a new token with a fresh 30-day expiry.
 */
router.post("/auth/refresh", (req, res): void => {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization header required" });
    return;
  }

  const existing = verifyNativeJwt(authHeader.slice(7));
  if (!existing) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const token = signNativeJwt(existing.telegramId);
  req.log.info({ telegramId: existing.telegramId }, "native JWT refreshed");
  res.json({ token, telegramId: existing.telegramId });
});

/**
 * GET /api/auth/magic/:code
 *
 * Landing page for Android deep-link auto-login.
 * Sends an HTML page that:
 *  1. Immediately tries to open com.ali.digitalgateway://auth?code=CODE
 *  2. Shows a manual "Open App" button with the same deep link
 *  3. Shows the raw code for manual fallback entry
 *  4. Shows the APK download link for users who haven't installed yet
 */
router.get("/auth/magic/:code", (req, res): void => {
  const raw  = String(req.params.code ?? "");
  const code = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);

  if (code.length < 4) {
    res.status(400).send("رابط غير صالح");
    return;
  }

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
    body{
      background:#0b0b14;color:#fff;
      font-family:'Segoe UI',Tahoma,sans-serif;
      min-height:100vh;display:flex;flex-direction:column;
      align-items:center;justify-content:center;padding:24px;text-align:center;
    }
    .logo{width:88px;height:88px;border-radius:22px;margin-bottom:24px;object-fit:cover}
    h1{font-size:22px;font-weight:900;color:#d4af37;margin-bottom:8px}
    .sub{font-size:13px;color:rgba(255,255,255,.45);margin-bottom:32px;line-height:1.7}
    .btn{
      display:block;width:100%;max-width:320px;padding:16px;border-radius:16px;
      font-size:15px;font-weight:700;text-decoration:none;margin:0 auto 12px;
      cursor:pointer;border:none;transition:opacity .15s;
    }
    .btn:active{opacity:.8}
    .btn-gold{background:linear-gradient(135deg,#d4af37,#b8962e);color:#0b0b14}
    .btn-ghost{
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.13);color:rgba(255,255,255,.6);
    }
    .code-wrap{margin:8px auto 24px}
    .code-label{font-size:11px;color:rgba(255,255,255,.3);margin-bottom:6px}
    .code-box{
      display:inline-block;
      background:rgba(212,175,55,.09);
      border:1.5px solid rgba(212,175,55,.3);
      border-radius:12px;padding:10px 28px;
      font-family:monospace;font-size:26px;font-weight:900;
      letter-spacing:.35em;color:#d4af37;
    }
    .note{font-size:11px;color:rgba(255,255,255,.2);margin-top:20px;line-height:1.6}
    .spinner{
      width:20px;height:20px;border:3px solid rgba(11,11,20,.3);
      border-top-color:#0b0b14;border-radius:50%;
      display:inline-block;animation:spin .7s linear infinite;vertical-align:middle;margin-left:8px;
    }
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <img class="logo" src="/icon-ali.png" alt="ALI.MDD" onerror="this.style.display='none'">
  <h1>مرحباً في ALI.MDD</h1>
  <p class="sub">
    سيُفتح التطبيق تلقائياً...<br>
    إذا لم يفتح، اضغط الزر أدناه
  </p>

  <a class="btn btn-gold" href="${deepLink}" id="openBtn">
    🔓 فتح التطبيق وتسجيل الدخول <span class="spinner" id="spin"></span>
  </a>

  <div class="code-wrap">
    <p class="code-label">أو أدخل الرمز يدوياً في التطبيق</p>
    <div class="code-box">${code}</div>
  </div>

  <a class="btn btn-ghost" href="${apkUrl}">⬇️ تحميل التطبيق</a>

  <p class="note">
    ⚠️ هذا الرابط صالح لمدة ١٠ دقائق فقط<br>لا تشاركه مع أي شخص
  </p>

  <script>
    // Auto-attempt to open the app
    setTimeout(function(){
      document.getElementById('spin').style.display = 'none';
      window.location.href = '${deepLink}';
    }, 900);
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(html);
});

export default router;
