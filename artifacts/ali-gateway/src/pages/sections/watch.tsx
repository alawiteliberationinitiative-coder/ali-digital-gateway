import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Star, CheckCircle, Play } from "lucide-react";
import { AliEmblem } from "../../components/ui/ali-emblem";
import { useTelegram } from "../../lib/telegram";

declare global {
  interface Window {
    show_11001376?: () => Promise<void>;
  }
}

const AD_POINTS = 10;

type AdState = "idle" | "loading" | "rewarded" | "error";

const NOTICE_LINES = [
  "هذا الإعلان لا يمثّل توجهات المبادرة.",
  "يرجى مشاهدته حتى النهاية.",
  "بإمكانك عدم النقر على الشاشة لكيلا تنتقل إلى روابط إعلانية خارجية.",
  "مجرّد مشاهدتك تزيد من رصيدك وتدعم المبادرة.",
  "أغلقه فقط عندما ينتهي عداد الثواني.",
  "كل إعلان تشاهده يدعم المبادرة وأهلنا إنسانياً 💚",
];

export function WatchSection({ onBack }: { onBack: () => void }) {
  const { user } = useTelegram();
  const telegramId = user?.id?.toString() || "";

  const [adState,      setAdState]      = useState<AdState>("idle");
  const [totalEarned,  setTotalEarned]  = useState(0);
  const [watchCount,   setWatchCount]   = useState(0);
  const [errorMsg,     setErrorMsg]     = useState("");

  const rewardOnServer = useCallback(async () => {
    const res = await fetch("/api/ads/reward", {
      method:  "POST",
      headers: { "x-telegram-id": telegramId },
    });
    if (!res.ok) throw new Error("reward API failed");
    return (await res.json()) as { loyaltyPoints: number; pointsAwarded: number };
  }, [telegramId]);

  async function handleWatch() {
    if (adState === "loading" || !telegramId) return;
    setAdState("loading");
    setErrorMsg("");
    try {
      if (typeof window.show_11001376 === "function") {
        await window.show_11001376();
      } else {
        // dev simulation
        await new Promise(r => setTimeout(r, 2500));
      }
      const { pointsAwarded } = await rewardOnServer();
      setTotalEarned(t => t + pointsAwarded);
      setWatchCount(c => c + 1);
      setAdState("rewarded");
      setTimeout(() => setAdState("idle"), 2800);
    } catch {
      setAdState("error");
      setErrorMsg("لم تكتمل المشاهدة. حاول مجدداً.");
      setTimeout(() => setAdState("idle"), 3000);
    }
  }

  const isLoading = adState === "loading";

  return (
    <motion.div
      className="flex flex-col h-full"
      dir="rtl"
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ duration: 0.3 }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-primary/10 text-primary active:scale-95 transition-transform">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-arabic font-bold text-primary text-lg leading-tight">شاهد وادعم</h1>
          <p className="font-arabic text-muted-foreground text-xs">مشاهدتك تدعم المبادرة وتزيد رصيدك</p>
        </div>
        {totalEarned > 0 && (
          <div className="flex items-center gap-1 bg-[#d4af37]/15 border border-[#d4af37]/40 rounded-full px-3 py-1">
            <Star className="w-3.5 h-3.5 text-[#d4af37]" fill="#d4af37" />
            <span className="font-mono text-[#d4af37] text-sm font-bold">+{totalEarned}</span>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-5 py-8 gap-8">

        {/* Emblem */}
        <div className="relative flex items-center justify-center">
          {/* Outer glow ring — pulses */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 188, height: 188,
              background: "transparent",
              border: "2px solid rgba(212,175,55,0.25)",
            }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.9, 0.4] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          />
          {/* Mid ring */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 164, height: 164,
              background: "transparent",
              border: "1.5px solid rgba(212,175,55,0.15)",
            }}
            animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.6, 0.2] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 0.4 }}
          />
          {/* Emblem */}
          <div
            className="relative z-10 rounded-full overflow-hidden"
            style={{
              width: 144, height: 144,
              boxShadow: "0 0 48px rgba(212,175,55,0.35), 0 8px 0 rgba(212,175,55,0.3)",
              border: "3px solid #d4af37",
            }}>
            <AliEmblem className="w-full h-full" animate={false} />
          </div>
        </div>

        {/* Points badge */}
        {watchCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.35)" }}>
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="font-arabic text-green-400 text-sm font-bold">
              شاهدت {watchCount} {watchCount === 1 ? "إعلاناً" : "إعلانات"} · +{totalEarned} نقطة مضافة
            </span>
          </motion.div>
        )}

        {/* Ad state feedback */}
        <AnimatePresence>
          {adState !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="w-full rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{
                background: adState === "rewarded" ? "rgba(34,197,94,0.1)"
                  : adState === "error" ? "rgba(239,68,68,0.1)"
                  : "rgba(212,175,55,0.07)",
                border: `1.5px solid ${
                  adState === "rewarded" ? "rgba(34,197,94,0.4)"
                  : adState === "error" ? "rgba(239,68,68,0.4)"
                  : "rgba(212,175,55,0.3)"
                }`,
              }}>
              {adState === "loading" && (
                <motion.div className="w-5 h-5 border-2 border-[#d4af37] border-t-transparent rounded-full flex-shrink-0"
                  animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} />
              )}
              {adState === "rewarded" && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />}
              {adState === "error" && <span className="text-red-400 text-lg flex-shrink-0">✕</span>}
              <p className="font-arabic text-sm font-bold"
                style={{ color: adState === "rewarded" ? "#4ade80" : adState === "error" ? "#f87171" : "#d4af37" }}>
                {adState === "loading"  && "يُحضَّر الإعلان... شاهد حتى النهاية"}
                {adState === "rewarded" && `🎉 شكراً! +${AD_POINTS} نقطة أُضيفت لرصيدك`}
                {adState === "error"    && errorMsg}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Blinking Notice ── */}
        <motion.div
          className="w-full rounded-2xl px-5 py-5 space-y-3"
          style={{
            background: "linear-gradient(135deg,rgba(0,43,27,0.85),rgba(6,13,26,0.9))",
            border: "1.5px solid rgba(212,175,55,0.35)",
            boxShadow: "0 4px 0 rgba(212,175,55,0.12), inset 0 0 24px rgba(212,175,55,0.04)",
          }}>

          {/* Header row */}
          <div className="flex items-center gap-2 mb-1">
            {/* Blinking dot */}
            <motion.div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: "#d4af37" }}
              animate={{ opacity: [1, 0.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
            />
            <span className="font-arabic font-black text-[#d4af37] text-sm tracking-wide">
              تنبيه هام قبل المشاهدة
            </span>
          </div>

          {/* Lines */}
          <div className="space-y-2.5">
            {NOTICE_LINES.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="font-arabic text-sm leading-6 flex gap-2"
                style={{ color: i === NOTICE_LINES.length - 1 ? "#4ade80" : "rgba(255,255,255,0.82)" }}>
                <span className="text-[#d4af37] flex-shrink-0 mt-0.5 text-xs">◈</span>
                {line}
              </motion.p>
            ))}
          </div>

          {/* Bottom shimmer line */}
          <motion.div
            className="h-px w-full mt-1"
            style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          />
        </motion.div>

        {/* ── Watch Button ── */}
        <motion.button
          onClick={handleWatch}
          disabled={isLoading}
          whileTap={{ scale: isLoading ? 1 : 0.96 }}
          className="w-full flex items-center justify-center gap-3 rounded-3xl font-arabic font-bold text-xl"
          style={{
            padding: "20px 0",
            background: isLoading
              ? "rgba(212,175,55,0.2)"
              : "linear-gradient(135deg,#d4af37 0%,#f0d060 50%,#d4af37 100%)",
            boxShadow: isLoading ? "none" : "0 6px 0 rgba(180,140,20,0.55)",
            border: isLoading ? "1.5px solid rgba(212,175,55,0.4)" : "none",
            color: isLoading ? "#d4af37" : "#002b1b",
            opacity: isLoading ? 0.75 : 1,
          }}>
          {isLoading ? (
            <>
              <motion.div
                className="w-6 h-6 border-[2.5px] border-[#d4af37] border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.85, ease: "linear" }}
              />
              <span>جارٍ تحضير الإعلان...</span>
            </>
          ) : (
            <>
              <Play className="w-6 h-6" fill="currentColor" />
              <span>شاهد الآن وادعم المبادرة</span>
            </>
          )}
        </motion.button>

        {/* Points per watch note */}
        <p className="font-arabic text-xs text-muted-foreground text-center -mt-4">
          كل مشاهدة مكتملة = <span className="text-[#d4af37] font-bold">+{AD_POINTS} نقاط ولاء</span> تُضاف فوراً لرصيدك
        </p>

      </div>
    </motion.div>
  );
}
