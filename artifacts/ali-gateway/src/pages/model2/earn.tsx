import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, CheckCircle, Play, Clock, AlertCircle, Coins } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useRewardedAd } from "@/hooks/use-rewarded-ad";

const GOLD   = "#d4af37";
const GREEN  = "#22c55e";
const AD_POINTS   = 10;
const COOLDOWN_MS = 25_000;

const TIPS = [
  "هذا الإعلان لا يمثّل توجهات المبادرة.",
  "شاهده حتى النهاية للحصول على نقاطك.",
  "لا تنقر على الشاشة لتجنّب الانتقال لروابط خارجية.",
  "كل إعلان تشاهده يدعم المبادرة وأهلنا إنسانياً 💚",
  "أغلقه فقط عندما ينتهي عداد الثواني.",
];

export function EarnSection({ telegramId }: { telegramId: string }) {
  const [totalEarned, setTotalEarned] = useState(0);
  const [watchCount,  setWatchCount]  = useState(0);
  const [apiError,    setApiError]    = useState("");

  const ad = useRewardedAd(COOLDOWN_MS, telegramId);

  const rewardOnServer = useCallback(async (challengeToken: string) => {
    if (!telegramId) return null;
    const res = await apiFetch("/api/ads/reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeToken }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? "فشل الخادم");
    }
    return (await res.json()) as { loyaltyPoints: number; pointsAwarded: number };
  }, [telegramId]);

  async function handleWatch() {
    if (ad.isActive || !telegramId) return;
    setApiError("");
    const token = await ad.show();
    if (token) {
      try {
        const data = await rewardOnServer(token);
        if (data) {
          setTotalEarned(t => t + data.pointsAwarded);
          setWatchCount(c => c + 1);
        }
      } catch (e: unknown) {
        setApiError(e instanceof Error ? e.message : "خطأ في الخادم");
      }
    }
  }

  const cooldownSeconds = Math.ceil((ad.cooldownRemaining ?? 0) / 1000);
  const canWatch = !ad.isActive && !ad.cooldownRemaining && !!telegramId;

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="px-4 pt-4 pb-24 space-y-5" dir="rtl">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "مشاهدات اليوم", value: watchCount,  accent: GOLD  },
            { label: "نقاط مكتسبة",   value: totalEarned, accent: GREEN },
            { label: "نقاط لكل إعلان", value: AD_POINTS, accent: "#60a5fa" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${s.accent}18` }}>
              <p className="font-bold text-xl mb-0.5" style={{ color: s.accent }}>{s.value}</p>
              <p className="font-arabic text-white/35 text-[9px] leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Main watch button */}
        <div className="rounded-3xl p-5 text-center"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}18`, backdropFilter: "blur(10px)" }}>

          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{
              background: canWatch ? `linear-gradient(135deg, ${GOLD}25, ${GOLD}10)` : "rgba(255,255,255,0.06)",
              border: `2px solid ${canWatch ? GOLD + "50" : "rgba(255,255,255,0.1)"}`,
              boxShadow: canWatch ? `0 0 24px ${GOLD}25` : "none",
            }}>
            {ad.isActive ? (
              <div className="w-6 h-6 border-2 rounded-full animate-spin"
                style={{ borderColor: `${GOLD}40`, borderTopColor: GOLD }} />
            ) : ad.cooldownRemaining ? (
              <Clock size={26} color="rgba(255,255,255,0.4)" />
            ) : (
              <Play size={26} color={GOLD} />
            )}
          </div>

          <p className="font-arabic font-bold text-white/90 text-base mb-1">
            {ad.isActive ? "جاري تشغيل الإعلان..." : ad.cooldownRemaining ? `انتظر ${cooldownSeconds}ث` : "شاهد وادعم"}
          </p>
          <p className="font-arabic text-white/40 text-xs mb-4">
            {ad.isActive ? "أكمل المشاهدة للحصول على نقاطك"
              : ad.cooldownRemaining ? "ستتاح المشاهدة قريباً"
              : `اكسب ${AD_POINTS} نقطة مقابل كل مشاهدة`}
          </p>

          <motion.button
            onClick={handleWatch}
            disabled={!canWatch}
            whileTap={canWatch ? { scale: 0.96 } : {}}
            className="w-full py-3.5 rounded-2xl font-arabic font-bold text-lg"
            style={{
              background: canWatch
                ? `linear-gradient(135deg, ${GOLD}, #f0d060)`
                : "rgba(255,255,255,0.07)",
              color: canWatch ? "#001a10" : "rgba(255,255,255,0.3)",
              boxShadow: canWatch ? `0 5px 0 rgba(180,140,20,0.5)` : "none",
              cursor: canWatch ? "pointer" : "not-allowed",
            }}>
            {ad.isActive ? "⏳ جاري التشغيل..." : ad.cooldownRemaining ? `⏱ ${cooldownSeconds}ث` : "▶ ابدأ المشاهدة"}
          </motion.button>

          <AnimatePresence>
            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-3 flex items-center gap-2 justify-center">
                <AlertCircle size={13} color="#ef4444" />
                <span className="font-arabic text-red-400 text-xs">{apiError}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Success indicator */}
        <AnimatePresence>
          {watchCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: `${GREEN}08`, border: `1px solid ${GREEN}25` }} dir="rtl">
              <CheckCircle size={20} color={GREEN} />
              <div>
                <p className="font-arabic font-bold text-sm" style={{ color: GREEN }}>
                  أحسنت! شاهدتَ {watchCount} إعلان{watchCount > 1 ? "ات" : ""}
                </p>
                <p className="font-arabic text-white/45 text-xs">مجموع ما اكتسبته: {totalEarned} نقطة</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coins section */}
        <div className="rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}10` }}>
          <div className="flex items-center gap-2 mb-3">
            <Coins size={15} color={GOLD} />
            <p className="font-arabic text-white/60 text-sm font-bold">نظام المكافآت</p>
          </div>
          <div className="space-y-2">
            {[
              { action: "مشاهدة إعلان",         pts: "+10",  color: GOLD  },
              { action: "إتمام اختبار معرفي",   pts: "+25",  color: GREEN },
              { action: "دعوة صديق",              pts: "+50",  color: "#60a5fa" },
              { action: "نشر تقرير موثّق",      pts: "+100", color: "#fb923c" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0"
                style={{ borderColor: "rgba(255,255,255,0.05)" }} dir="rtl">
                <span className="font-arabic text-white/55 text-xs">{item.action}</span>
                <span className="font-mono font-bold text-sm" style={{ color: item.color }}>{item.pts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="rounded-2xl p-4 space-y-2"
          style={{ background: `${GOLD}06`, border: `1px solid ${GOLD}12` }}>
          <p className="font-arabic text-xs font-bold mb-2" style={{ color: GOLD }}>💡 تذكير مهم</p>
          {TIPS.map((tip, i) => (
            <div key={i} className="flex gap-2">
              <span style={{ color: GOLD + "80", fontSize: 10, marginTop: 2 }}>•</span>
              <p className="font-arabic text-white/50 text-xs leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
