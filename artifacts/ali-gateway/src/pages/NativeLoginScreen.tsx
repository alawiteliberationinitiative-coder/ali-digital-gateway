import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Smartphone, CheckCircle, AlertCircle, ArrowLeft,
  RefreshCw, User, Hash, KeyRound, UserPlus, Send,
} from "lucide-react";
import { useTelegram } from "@/lib/telegram";
import { apiFetch } from "@/lib/api";

const GOLD  = "#d4af37";
const GREEN = "#22c55e";
const BG    = "#0b0b14";
const CARD  = "#13121f";

/* ─────────────────── Types ─────────────────── */

type Flow =
  | "welcome"           // initial choice screen
  | "bot-instructions"  // how to get code from Telegram bot
  | "enter-code"        // enter 8-char one-time code
  | "login-aliid"       // enter aliId + pseudonym
  | "register"          // choose pseudonym
  | "register-captcha"  // solve math CAPTCHA
  | "verifying"
  | "success"
  | "error";

/* ─────────────────── Shared atoms ─────────────────── */

const fadeUp = {
  initial:  { opacity: 0, y: 18 },
  animate:  { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit:     { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

function GoldButton({ children, onClick, disabled }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled
          ? "rgba(212,175,55,.25)"
          : "linear-gradient(135deg,#d4af37,#b8962e)",
        color: disabled ? "rgba(11,11,20,.5)" : BG,
        border: "none",
        borderRadius: 16,
        padding: "16px 0",
        fontSize: 15,
        fontWeight: 800,
        width: "100%",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "opacity .15s",
        letterSpacing: ".02em",
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,.05)",
        color: "rgba(255,255,255,.55)",
        border: "1px solid rgba(255,255,255,.12)",
        borderRadius: 16,
        padding: "14px 0",
        fontSize: 14,
        fontWeight: 600,
        width: "100%",
        cursor: "pointer",
        transition: "opacity .15s",
      }}
    >
      {children}
    </button>
  );
}

function Field({
  label, value, onChange, placeholder, mono, maxLength, dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  maxLength?: number;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 6, textAlign: "right" }}>
        {label}
      </p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        dir={dir ?? "rtl"}
        style={{
          width: "100%",
          background: "rgba(255,255,255,.06)",
          border: "1.5px solid rgba(255,255,255,.12)",
          borderRadius: 12,
          padding: "13px 14px",
          color: "#fff",
          fontSize: mono ? 17 : 15,
          fontFamily: mono ? "monospace" : "inherit",
          letterSpacing: mono ? ".05em" : "normal",
          outline: "none",
          textAlign: dir === "ltr" ? "left" : "right",
        }}
      />
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "none", cursor: "pointer",
        color: "rgba(255,255,255,.4)", display: "flex", alignItems: "center",
        gap: 4, fontSize: 13, padding: "4px 0", marginBottom: 20,
      }}
    >
      <ArrowLeft size={14} /> رجوع
    </button>
  );
}

/* ─────────────────── Main Component ─────────────────── */

export default function NativeLoginScreen() {
  const { loginNative } = useTelegram();

  const [flow,      setFlow]      = useState<Flow>("welcome");
  const [errMsg,    setErrMsg]    = useState("");

  /* Code flow */
  const [code, setCode] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);

  /* Login-by-aliid flow */
  const [aliId,     setAliId]     = useState("");
  const [pseudonym, setPseudonym] = useState("");

  /* Register flow */
  const [regPseudo,   setRegPseudo]   = useState("");
  const [captchaQ,    setCaptchaQ]    = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAns,  setCaptchaAns]  = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);

  useEffect(() => {
    if (flow === "enter-code") setTimeout(() => codeRef.current?.focus(), 300);
  }, [flow]);

  /* ── helpers ────────────────────────────────────────────────────────── */

  const reset = useCallback((target: Flow) => {
    setErrMsg("");
    setFlow(target);
  }, []);

  const doLogin = useCallback(async (token: string, telegramId: string) => {
    setFlow("success");
    setTimeout(() => loginNative(token, telegramId), 800);
  }, [loginNative]);

  /* ── Code verify ─────────────────────────────────────────────────────── */

  const handleVerifyCode = async () => {
    if (code.length < 4) return;
    setFlow("verifying");
    setErrMsg("");
    try {
      const res  = await apiFetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json() as { token?: string; telegramId?: string; error?: string };
      if (!res.ok || !data.token || !data.telegramId) throw new Error(data.error ?? "رمز غير صالح");
      await doLogin(data.token, data.telegramId);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "فشل التحقق — حاول مجدداً");
      setFlow("error");
    }
  };

  /* ── Login by aliId ─────────────────────────────────────────────────── */

  const handleLoginByAliId = async () => {
    if (!aliId.trim()) return;
    setFlow("verifying");
    setErrMsg("");
    try {
      const res  = await apiFetch("/api/auth/login-by-aliid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aliId: aliId.trim() }),
      });
      const data = await res.json() as { token?: string; telegramId?: string; error?: string };
      if (!res.ok || !data.token || !data.telegramId) throw new Error(data.error ?? "فشل تسجيل الدخول");
      await doLogin(data.token, data.telegramId);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "فشل تسجيل الدخول — حاول مجدداً");
      setFlow("error");
    }
  };

  /* ── Fetch CAPTCHA ───────────────────────────────────────────────────── */

  const fetchCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    setCaptchaAns("");
    try {
      const res  = await apiFetch("/api/auth/captcha");
      const data = await res.json() as { token?: string; question?: string; error?: string };
      if (!res.ok || !data.token || !data.question) throw new Error(data.error ?? "فشل تحميل التحقق");
      setCaptchaQ(data.question);
      setCaptchaToken(data.token);
    } catch {
      setCaptchaQ("؟");
      setCaptchaToken("");
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  /* ── Navigate to CAPTCHA step ────────────────────────────────────────── */

  const handleGoToCaptcha = async () => {
    if (regPseudo.trim().length < 3) return;
    await fetchCaptcha();
    setFlow("register-captcha");
  };

  /* ── Register native ─────────────────────────────────────────────────── */

  const handleRegister = async () => {
    if (!captchaAns.trim() || !captchaToken) return;
    setFlow("verifying");
    setErrMsg("");
    try {
      const res  = await apiFetch("/api/auth/register-native", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pseudonym:     regPseudo.trim(),
          captchaToken,
          captchaAnswer: Number(captchaAns.trim()),
        }),
      });
      const data = await res.json() as { token?: string; telegramId?: string; aliId?: string; error?: string };
      if (!res.ok || !data.token || !data.telegramId) throw new Error(data.error ?? "فشل التسجيل");
      await doLogin(data.token, data.telegramId);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "فشل التسجيل — حاول مجدداً");
      setFlow("error");
    }
  };

  /* ── Open bot deep link ──────────────────────────────────────────────── */

  const openBot = () => {
    window.open("https://t.me/ALI_MDD_BOT?start=login", "_blank");
  };

  /* ─────────────────────────────────────────────────────────────────────── */
  /* RENDER                                                                  */
  /* ─────────────────────────────────────────────────────────────────────── */

  return (
    <div style={{
      minHeight: "100vh", background: BG, display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 20px", direction: "rtl",
    }}>
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1,   opacity: 1, transition: { duration: 0.5, type: "spring" } }}
        style={{ marginBottom: 28 }}
      >
        <img
          src="/icon-ali.png"
          alt="ALI.MDD"
          style={{ width: 76, height: 76, borderRadius: 20, objectFit: "cover" }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </motion.div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 380, background: CARD,
        borderRadius: 24, padding: "28px 24px",
        border: "1px solid rgba(255,255,255,.07)",
        boxShadow: "0 24px 80px rgba(0,0,0,.55)",
      }}>
        <AnimatePresence mode="wait">

          {/* ═══════════════════════ WELCOME ═══════════════════════ */}
          {flow === "welcome" && (
            <motion.div key="welcome" {...fadeUp}>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: GOLD, marginBottom: 6, textAlign: "center" }}>
                بوابة ALI.MDD
              </h1>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", textAlign: "center", marginBottom: 28, lineHeight: 1.7 }}>
                اختر طريقة الدخول
              </p>

              {/* Option 1: via Telegram bot */}
              <OptionCard
                icon={<Send size={20} color={GOLD} />}
                title="عبر بوت تيليغرام"
                desc="احصل على رمز دخول تلقائي من البوت"
                onClick={() => reset("bot-instructions")}
              />

              {/* Option 2: existing member */}
              <OptionCard
                icon={<Hash size={20} color={GOLD} />}
                title="لدي رقم عضوية"
                desc="ادخل رقم عضويتك واسمك المستعار"
                onClick={() => reset("login-aliid")}
              />

              {/* Option 3: new user */}
              <OptionCard
                icon={<UserPlus size={20} color={GOLD} />}
                title="مستخدم جديد"
                desc="سجّل حساباً جديداً بدون تيليغرام"
                onClick={() => reset("register")}
              />
            </motion.div>
          )}

          {/* ═════════════════ BOT INSTRUCTIONS ════════════════════ */}
          {flow === "bot-instructions" && (
            <motion.div key="bot-instructions" {...fadeUp}>
              <BackBtn onClick={() => reset("welcome")} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <Send size={22} color={GOLD} />
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>الدخول عبر تيليغرام</h2>
              </div>
              <StepList steps={[
                "افتح بوت @ALI_MDD_BOT في تيليغرام",
                "اضغط على «📱 تحميل تطبيق الأندرويد»",
                "سيصلك رمز دخول مكون من 8 أحرف",
                "اضغط «دخول بالرمز» وأدخله أدناه",
              ]} />
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                <GoldButton onClick={openBot}>فتح @ALI_MDD_BOT</GoldButton>
                <GhostButton onClick={() => reset("enter-code")}>دخول بالرمز ←</GhostButton>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════ ENTER CODE ══════════════════════ */}
          {flow === "enter-code" && (
            <motion.div key="enter-code" {...fadeUp}>
              <BackBtn onClick={() => reset("bot-instructions")} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <Smartphone size={22} color={GOLD} />
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>أدخل رمز الدخول</h2>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginBottom: 20, lineHeight: 1.7 }}>
                الرمز مكون من 8 أحرف أرسله البوت إليك
              </p>
              <input
                ref={codeRef}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                placeholder="XXXXXXXX"
                dir="ltr"
                style={{
                  width: "100%", background: "rgba(255,255,255,.06)",
                  border: `1.5px solid ${code.length === 8 ? GOLD : "rgba(255,255,255,.12)"}`,
                  borderRadius: 14, padding: "16px 14px",
                  color: GOLD, fontSize: 24, fontWeight: 900,
                  fontFamily: "monospace", letterSpacing: ".22em",
                  textAlign: "center", outline: "none", marginBottom: 20,
                }}
              />
              <GoldButton onClick={handleVerifyCode} disabled={code.length < 4}>
                تحقق من الرمز
              </GoldButton>
            </motion.div>
          )}

          {/* ═════════════════ LOGIN BY ALI-ID ══════════════════════ */}
          {flow === "login-aliid" && (
            <motion.div key="login-aliid" {...fadeUp}>
              <BackBtn onClick={() => reset("welcome")} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <Hash size={22} color={GOLD} />
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>الدخول برقم العضوية</h2>
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 20, lineHeight: 1.7 }}>
                أدخل رقم عضويتك للدخول مباشرةً إلى حسابك
              </p>

              <Field
                label="رقم العضوية"
                value={aliId}
                onChange={(v) => setAliId(v.replace(/[^A-Za-z0-9@#!\-]/g, "").slice(0, 17))}
                placeholder="ALI-2026-Xx0!XxX9"
                mono
                dir="ltr"
                maxLength={17}
              />

              <div style={{ marginTop: 8 }}>
                <GoldButton
                  onClick={handleLoginByAliId}
                  disabled={aliId.trim().length < 17}
                >
                  تسجيل الدخول
                </GoldButton>
              </div>

              <p style={{ fontSize: 11, color: "rgba(255,255,255,.2)", textAlign: "center", marginTop: 16, lineHeight: 1.7 }}>
                انسخ رقم عضويتك كاملاً من ملفك الشخصي — مثال: ALI-2026-Kp7!nA3B
              </p>
            </motion.div>
          )}

          {/* ══════════════════ REGISTER — PICK PSEUDONYM ═══════════ */}
          {flow === "register" && (
            <motion.div key="register" {...fadeUp}>
              <BackBtn onClick={() => reset("welcome")} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <UserPlus size={22} color={GOLD} />
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>إنشاء حساب جديد</h2>
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 20, lineHeight: 1.7 }}>
                اختر اسماً مستعاراً فريداً (3–30 حرفاً).<br />
                سيُولَّد رقم عضويتك تلقائياً.
              </p>

              <Field
                label="الاسم المستعار"
                value={regPseudo}
                onChange={setRegPseudo}
                placeholder="مثال: Cipher-7749"
                maxLength={30}
              />

              <div style={{
                background: "rgba(212,175,55,.07)", borderRadius: 12,
                padding: "12px 14px", marginBottom: 20,
                border: "1px solid rgba(212,175,55,.15)",
              }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,.5)", lineHeight: 1.7 }}>
                  يُسمح بالحروف العربية والإنجليزية والأرقام والشرطة والمسافة فقط.
                </p>
              </div>

              <GoldButton
                onClick={handleGoToCaptcha}
                disabled={regPseudo.trim().length < 3}
              >
                التالي — التحقق من الهوية
              </GoldButton>
            </motion.div>
          )}

          {/* ══════════════════ REGISTER — CAPTCHA ══════════════════ */}
          {flow === "register-captcha" && (
            <motion.div key="register-captcha" {...fadeUp}>
              <BackBtn onClick={() => reset("register")} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <Shield size={22} color={GOLD} />
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>التحقق من الهوية</h2>
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 20, lineHeight: 1.7 }}>
                حل السؤال التالي لإثبات أنك لست روبوتاً
              </p>

              {/* CAPTCHA question box */}
              <div style={{
                background: "rgba(212,175,55,.08)", border: "1.5px solid rgba(212,175,55,.25)",
                borderRadius: 16, padding: "22px 0", textAlign: "center", marginBottom: 20,
              }}>
                {captchaLoading ? (
                  <p style={{ color: "rgba(255,255,255,.3)", fontSize: 14 }}>جارٍ التحميل...</p>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginBottom: 8 }}>
                      ما هو ناتج
                    </p>
                    <p style={{
                      fontSize: 36, fontWeight: 900, color: GOLD,
                      fontFamily: "monospace", letterSpacing: ".08em",
                    }}>
                      {captchaQ} = ؟
                    </p>
                    <button
                      onClick={fetchCaptcha}
                      style={{
                        marginTop: 12, background: "none", border: "none",
                        color: "rgba(255,255,255,.3)", cursor: "pointer",
                        fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4,
                      }}
                    >
                      <RefreshCw size={11} /> سؤال آخر
                    </button>
                  </>
                )}
              </div>

              <Field
                label="الإجابة"
                value={captchaAns}
                onChange={(v) => setCaptchaAns(v.replace(/[^0-9]/g, "").slice(0, 4))}
                placeholder="أدخل الرقم"
                mono
                dir="ltr"
                maxLength={4}
              />

              {/* Summary */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "rgba(255,255,255,.04)", borderRadius: 12,
                padding: "10px 14px", marginBottom: 20,
                border: "1px solid rgba(255,255,255,.07)",
              }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>الاسم المستعار</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.7)" }}>
                  {regPseudo.trim()}
                </span>
              </div>

              <GoldButton
                onClick={handleRegister}
                disabled={!captchaAns.trim() || !captchaToken || captchaLoading}
              >
                إنشاء الحساب
              </GoldButton>
            </motion.div>
          )}

          {/* ════════════════════ VERIFYING ════════════════════════ */}
          {flow === "verifying" && (
            <motion.div key="verifying" {...fadeUp} style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                border: `4px solid rgba(212,175,55,.2)`,
                borderTop: `4px solid ${GOLD}`,
                margin: "0 auto 20px",
                animation: "spin .8s linear infinite",
              }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <p style={{ color: "rgba(255,255,255,.5)", fontSize: 15 }}>جارٍ التحقق...</p>
            </motion.div>
          )}

          {/* ════════════════════ SUCCESS ═══════════════════════════ */}
          {flow === "success" && (
            <motion.div key="success" {...fadeUp} style={{ textAlign: "center", padding: "32px 0" }}>
              <CheckCircle size={52} color={GREEN} style={{ margin: "0 auto 16px" }} />
              <h2 style={{ fontSize: 18, fontWeight: 800, color: GREEN, marginBottom: 8 }}>
                تم تسجيل الدخول
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>
                جارٍ تحميل بوابتك...
              </p>
            </motion.div>
          )}

          {/* ════════════════════ ERROR ════════════════════════════ */}
          {flow === "error" && (
            <motion.div key="error" {...fadeUp} style={{ textAlign: "center", padding: "24px 0" }}>
              <AlertCircle size={44} color="#ef4444" style={{ margin: "0 auto 16px" }} />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#ef4444", marginBottom: 8 }}>
                فشلت العملية
              </h2>
              <p style={{
                fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 28,
                lineHeight: 1.7, padding: "0 8px",
              }}>
                {errMsg}
              </p>
              <GoldButton onClick={() => reset("welcome")}>العودة للبداية</GoldButton>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Footer */}
      <p style={{
        marginTop: 24, fontSize: 11, color: "rgba(255,255,255,.18)",
        textAlign: "center", lineHeight: 1.7,
      }}>
        ALI.MDD — تطبيق أندرويد الرسمي
      </p>
    </div>
  );
}

/* ─────────────────── Sub-components ─────────────────── */

function OptionCard({ icon, title, desc, onClick }: {
  icon:    React.ReactNode;
  title:   string;
  desc:    string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", background: "rgba(255,255,255,.04)",
        border: "1px solid rgba(255,255,255,.08)", borderRadius: 16,
        padding: "16px 14px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 14,
        marginBottom: 10, transition: "background .15s",
        textAlign: "right",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(212,175,55,.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.04)")}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: "rgba(212,175,55,.1)", border: "1px solid rgba(212,175,55,.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{title}</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,.38)", lineHeight: 1.5 }}>{desc}</p>
      </div>
      <ArrowLeft size={14} color="rgba(255,255,255,.25)" style={{ marginRight: "auto", flexShrink: 0 }} />
    </button>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{
            width: 22, height: 22, borderRadius: "50%",
            background: "rgba(212,175,55,.15)", border: "1px solid rgba(212,175,55,.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, color: GOLD, flexShrink: 0, marginTop: 1,
          }}>
            {i + 1}
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.6)", lineHeight: 1.6 }}>{s}</p>
        </div>
      ))}
    </div>
  );
}
