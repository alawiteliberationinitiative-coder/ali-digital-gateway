import { useCallback } from "react";
import { apiFetch } from "../../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Star, CheckCircle, Play, Clock, XCircle } from "lucide-react";
import { AliEmblem } from "../../components/ui/ali-emblem";
import { useTelegram } from "../../lib/telegram";
import { useRewardedAd } from "../../hooks/use-rewarded-ad";
import { useState } from "react";

const AD_POINTS = 10;
const COOLDOWN_MS = 25_000;

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

  const [totalEarned, setTotalEarned] = useState(0);
  const [watchCount, setWatchCount] = useState(0);
  const [apiError, setApiError] = useState("");

  const ad = useRewardedAd(COOLDOWN_MS);

  const rewardOnServer = useCallback(async () => {
    if (!telegramId) return null;
    const res = await apiFetch("/api/ads/reward", { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? "reward API failed");
    }
    return (await res.json()) as { loyaltyPoints: number; pointsAwarded: number };
  }, [telegramId]);

  async function handleWatch() {
    if (ad.isActive || !telegramId) return;
    setApiError("");
    const completed = await ad.show();
    if (completed) {
      try {
        const data = await rewardOnServer();
        if (data) {
          setTotalEarned(t => t + data.pointsAwarded);
          setWatchCount(c => c + 1);
        }
      } catch (e: unknown) {
        setApiError(e instanceof Error ? e.message : "خطأ في الخادم");
      }
    }
  }

  const phase = ad.phase;
  const cooldownLeft = ad.cooldownLeft;

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
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-primary/10 text-primary active:scale-95 transition-transform">
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
          <motion.div
            className="absolute rounded-full"
            style={{ width: 188, height: 188, background: "transparent", border: "2px solid rgba(212,175,55,0.25)" }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.9, 0.4] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{ width: 164, height: 164, background: "transparent", border: "1.5px solid rgba(212,175,55,0.15)" }}
            animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.6, 0.2] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 0.4 }}
          />
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

        {/* Watch count badge */}
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

        {/* ── Phase feedback ── */}
        <AnimatePresence>
          {phase !== "idle" && (
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="w-full rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{
                background:
                  phase === "completed" ? "rgba(34,197,94,0.1)"
                  : phase === "dismissed" ? "rgba(239,68,68,0.08)"
                  : "rgba(212,175,55,0.07)",
                border: `1.5px solid ${
                  phase === "completed" ? "rgba(34,197,94,0.4)"
                  : phase === "dismissed" ? "rgba(239,68,68,0.35)"
                  : "rgba(212,175,55,0.3)"
                }`,
              }}>
              {(phase === "loading" || phase === "showing") && (
                <motion.div
                  className="w-5 h-5 border-2 border-[#d4af37] border-t-transparent rounded-full flex-shrink-0"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                />
              )}
              {phase === "completed" && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />}
              {phase === "dismissed" && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
              <p className="font-arabic text-sm font-bold"
                style={{
                  color:
                    phase === "completed" ? "#4ade80"
                    : phase === "dismissed" ? "#f87171"
                    : "#d4af37",
                }}>
                {phase === "loading"   && "يُحضَّر الإعلان..."}
                {phase === "showing"   && "شاهد الإعلان حتى النهاية ليُحتسب لك 📺"}
                {phase === "completed" && `🎉 مشاهدة مكتملة! +${AD_POINTS} نقطة أُضيفت فوراً`}
                {phase === "dismissed" && "❗ لم تكتمل المشاهدة — النقاط لا تُمنح إلا بعد الاكتمال"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* API error */}
        <AnimatePresence>
          {apiError && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="font-arabic text-sm text-center text-red-400">
              {apiError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── Notice card ── */}
        <motion.div
          className="w-full rounded-2xl px-5 py-5 space-y-3"
          style={{
            background: "linear-gradient(135deg,rgba(0,43,27,0.85),rgba(6,13,26,0.9))",
            border: "1.5px solid rgba(212,175,55,0.35)",
            boxShadow: "0 4px 0 rgba(212,175,55,0.12), inset 0 0 24px rgba(212,175,55,0.04)",
          }}>

          <div className="flex items-center gap-2 mb-1">
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

          {/* Security reminder */}
          <div className="mt-2 pt-2 border-t border-[#d4af37]/15 flex items-start gap-2">
            <span className="text-[10px] text-white/30 font-mono mt-0.5">🔒</span>
            <p className="font-arabic text-[11px] text-white/25">
              النقاط لا تُضاف إلا بعد التحقق من اكتمال المشاهدة على الخادم
            </p>
          </div>

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
          disabled={ad.isActive || cooldownLeft > 0 || !telegramId}
          whileTap={{ scale: (ad.isActive || cooldownLeft > 0) ? 1 : 0.96 }}
          className="w-full flex items-center justify-center gap-3 rounded-3xl font-arabic font-bold text-xl"
          style={{
            padding: "20px 0",
            background:
              ad.isActive || cooldownLeft > 0
                ? "rgba(212,175,55,0.15)"
                : "linear-gradient(135deg,#d4af37 0%,#f0d060 50%,#d4af37 100%)",
            boxShadow:
              ad.isActive || cooldownLeft > 0
                ? "none"
                : "0 6px 0 rgba(180,140,20,0.55)",
            border:
              ad.isActive || cooldownLeft > 0
                ? "1.5px solid rgba(212,175,55,0.35)"
                : "none",
            color:
              ad.isActive || cooldownLeft > 0 ? "#d4af37" : "#002b1b",
            opacity: !telegramId ? 0.5 : 1,
          }}>
          {ad.isActive ? (
            <>
              <motion.div
                className="w-6 h-6 border-[2.5px] border-[#d4af37] border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.85, ease: "linear" }}
              />
              <span>{phase === "loading" ? "يُحضَّر الإعلان..." : "جارٍ العرض..."}</span>
            </>
          ) : cooldownLeft > 0 ? (
            <>
              <Clock className="w-6 h-6" />
              <span>متاح بعد {cooldownLeft}ث</span>
            </>
          ) : (
            <>
              <Play className="w-6 h-6" fill="currentColor" />
              <span>شاهد الآن وادعم المبادرة</span>
            </>
          )}
        </motion.button>

        {/* Points note */}
        <p className="font-arabic text-xs text-muted-foreground text-center -mt-4">
          كل مشاهدة <span className="text-red-400 font-bold">مكتملة</span> = <span className="text-[#d4af37] font-bold">+{AD_POINTS} نقاط ولاء</span> تُضاف فوراً
        </p>

      </div>
    </motion.div>
  );
}
