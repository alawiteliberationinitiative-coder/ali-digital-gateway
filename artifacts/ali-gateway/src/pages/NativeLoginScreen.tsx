import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Smartphone, Send, CheckCircle, AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useTelegram } from "@/lib/telegram";
import { apiFetch } from "@/lib/api";

const GOLD   = "#d4af37";
const GREEN  = "#22c55e";
const BG     = "#0b0b14";
const CARD   = "#13121f";

type Phase = "instructions" | "enter-code" | "verifying" | "success" | "error";

export default function NativeLoginScreen() {
  const { loginNative } = useTelegram();
  const [phase,    setPhase]    = useState<Phase>("instructions");
  const [code,     setCode]     = useState("");
  const [errMsg,   setErrMsg]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === "enter-code") {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [phase]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    setCode(val);
  };

  const handleVerify = async () => {
    if (code.length < 4) return;
    setPhase("verifying");
    setErrMsg("");
    try {
      const res = await apiFetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json() as { token?: string; telegramId?: string; error?: string };
      if (!res.ok || !data.token || !data.telegramId) {
        throw new Error(data.error ?? "رمز غير صالح");
      }
      setPhase("success");
      setTimeout(() => loginNative(data.token!, data.telegramId!), 800);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "فشل التحقق — حاول مجدداً");
      setPhase("error");
    }
  };

  const handleRetry = () => {
    setCode("");
    setErrMsg("");
    setPhase("enter-code");
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-5"
      style={{ background: BG }}>

      {/* ── Background glow ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 30%, ${GOLD}08 0%, transparent 70%)`,
        }} />

      <AnimatePresence mode="wait">

        {/* ── Instructions screen ── */}
        {phase === "instructions" && (
          <motion.div
            key="instructions"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm text-center"
            dir="rtl">

            {/* Icon */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{ background: `${GOLD}12`, border: `2px solid ${GOLD}30` }}>
                  <Shield size={36} color={GOLD} />
                </div>
                <div
                  className="absolute -bottom-2 -left-2 w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "#1f2937", border: `1.5px solid ${GOLD}25` }}>
                  <Smartphone size={16} color={GOLD + "cc"} />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="font-arabic font-black text-white/90 mb-2" style={{ fontSize: 22 }}>
              مرحباً بك في A.L.I
            </h1>
            <p className="font-arabic text-white/40 text-sm mb-8 leading-relaxed">
              بوابة التحرير العلوي الرقمية
            </p>

            {/* Steps */}
            <div
              className="rounded-2xl p-5 mb-7 text-right space-y-4"
              style={{ background: `${GOLD}07`, border: `1px solid ${GOLD}18` }}>
              <p className="font-arabic text-white/55 text-xs font-bold tracking-wide mb-3">
                خطوات الدخول
              </p>

              {[
                { n: "١", text: "افتح تطبيق Telegram" },
                { n: "٢", text: "أرسل الأمر  /login  إلى بوت  @ALI_MDD_BOT" },
                { n: "٣", text: "انسخ الرمز المكوّن من 8 أحرف" },
                { n: "٤", text: "أدخله في الشاشة التالية" },
              ].map(s => (
                <div key={s.n} className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[11px]"
                    style={{ background: `${GOLD}18`, color: GOLD }}>
                    {s.n}
                  </span>
                  <span className="font-arabic text-white/70 text-sm">{s.text}</span>
                </div>
              ))}
            </div>

            {/* Bot mention */}
            <div
              className="flex items-center justify-center gap-2 mb-7 px-4 py-2.5 rounded-2xl mx-auto w-fit"
              style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>
              <Send size={13} color="#60a5fa" />
              <span className="font-mono text-[13px] font-bold" style={{ color: "#60a5fa" }}>
                @ALI_MDD_BOT
              </span>
              <span className="font-mono text-[13px]" style={{ color: "rgba(96,165,250,0.6)" }}>
                /login
              </span>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setPhase("enter-code")}
              className="w-full py-4 rounded-2xl font-arabic text-sm font-black transition-all"
              style={{
                background: `${GOLD}18`,
                border: `1.5px solid ${GOLD}45`,
                color: GOLD,
              }}>
              حصلت على الرمز — أدخله الآن
            </motion.button>

            <p className="font-arabic text-white/20 text-[11px] mt-5 leading-relaxed">
              الرمز صالح لمدة 10 دقائق فقط
            </p>
          </motion.div>
        )}

        {/* ── Enter code screen ── */}
        {(phase === "enter-code" || phase === "verifying" || phase === "error") && (
          <motion.div
            key="enter-code"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm"
            dir="rtl">

            {/* Back */}
            <button
              onClick={() => { setCode(""); setErrMsg(""); setPhase("instructions"); }}
              className="flex items-center gap-1.5 mb-8 text-white/30 hover:text-white/60 transition-colors">
              <ArrowLeft size={14} />
              <span className="font-arabic text-xs">رجوع</span>
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: `${GOLD}12`, border: `1.5px solid ${GOLD}28` }}>
                <Shield size={28} color={GOLD} />
              </div>
              <h2 className="font-arabic font-black text-white/85 text-lg mb-1">أدخل رمز الدخول</h2>
              <p className="font-arabic text-white/35 text-xs">
                الرمز المكوّن من 8 أحرف الذي أرسله البوت
              </p>
            </div>

            {/* Code input */}
            <div className="mb-5">
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={handleCodeChange}
                onKeyDown={e => { if (e.key === "Enter" && code.length >= 4) handleVerify(); }}
                disabled={phase === "verifying"}
                placeholder="ABCD1234"
                maxLength={8}
                className="w-full text-center rounded-2xl py-4 font-mono font-black text-2xl tracking-[0.35em] outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: `2px solid ${
                    phase === "error"
                      ? "rgba(239,68,68,0.45)"
                      : code.length === 8
                      ? GOLD + "55"
                      : "rgba(255,255,255,0.1)"
                  }`,
                  color: phase === "error" ? "#ef4444" : code.length === 8 ? GOLD : "rgba(255,255,255,0.8)",
                  letterSpacing: "0.35em",
                }}
                dir="ltr"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
              />
              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full transition-all"
                    style={{
                      background: i < code.length
                        ? (phase === "error" ? "#ef4444" : GOLD)
                        : "rgba(255,255,255,0.12)",
                      transform: i < code.length ? "scale(1.2)" : "scale(1)",
                    }} />
                ))}
              </div>
            </div>

            {/* Error message */}
            {phase === "error" && errMsg && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mb-4 px-4 py-3 rounded-2xl"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertCircle size={15} color="#ef4444" />
                <p className="font-arabic text-sm text-red-400 flex-1">{errMsg}</p>
              </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              {phase === "error" && (
                <button
                  onClick={handleRetry}
                  className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-2xl transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <RefreshCw size={15} color="rgba(255,255,255,0.45)" />
                </button>
              )}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleVerify}
                disabled={code.length < 4 || phase === "verifying"}
                className="flex-1 py-3.5 rounded-2xl font-arabic text-sm font-black transition-all"
                style={{
                  background: code.length >= 4 ? `${GOLD}18` : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${code.length >= 4 ? GOLD + "45" : "rgba(255,255,255,0.07)"}`,
                  color: code.length >= 4 ? GOLD : "rgba(255,255,255,0.2)",
                }}>
                {phase === "verifying" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 rounded-full animate-spin inline-block"
                      style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }} />
                    جاري التحقق...
                  </span>
                ) : "دخول"}
              </motion.button>
            </div>

            <button
              onClick={() => { setCode(""); setErrMsg(""); setPhase("instructions"); }}
              className="w-full mt-4 font-arabic text-white/25 text-xs text-center py-2 hover:text-white/45 transition-colors">
              أحتاج مساعدة — العودة للتعليمات
            </button>
          </motion.div>
        )}

        {/* ── Success screen ── */}
        {phase === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 280 }}
            className="w-full max-w-sm text-center"
            dir="rtl">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{ background: `${GREEN}10`, border: `2px solid ${GREEN}30` }}>
              <CheckCircle size={40} color={GREEN} />
            </div>
            <h2 className="font-arabic font-black text-white/90 text-xl mb-2">تم التحقق بنجاح</h2>
            <p className="font-arabic text-white/40 text-sm">جاري فتح البوابة...</p>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Footer */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="font-arabic text-white/15 text-[10px]">
          A.L.I Digital Gateway · Alawite Liberation Initiative
        </p>
      </div>
    </div>
  );
}
