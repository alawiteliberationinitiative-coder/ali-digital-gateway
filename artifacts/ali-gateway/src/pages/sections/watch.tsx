import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Play, Star, CheckCircle, Tv } from "lucide-react";
import { useTelegram } from "../../lib/telegram";

declare global {
  interface Window {
    Adsgram?: {
      init: (opts: { blockId: string }) => Promise<{
        show: () => Promise<{ done: boolean; error?: boolean; description?: string }>;
      }>;
    };
  }
}

const ADSGRAM_BLOCK_ID = import.meta.env.VITE_ADSGRAM_BLOCK_ID as string | undefined;
const AD_POINTS = 10;

const AD_LIST = [
  { id: "ad1", emoji: "🌿", title: "مبادرة التحرير العلوي", desc: "رؤيتنا ومهمّتنا في الفضاء الرقمي" },
  { id: "ad2", emoji: "💰", title: "عملة $MDD الرقمية", desc: "اكتشف عملة المبادرة وكيف تكسب منها" },
  { id: "ad3", emoji: "🌍", title: "شبكة السفراء الدولية", desc: "أكثر من 40 دولة تدعم القضية" },
  { id: "ad4", emoji: "🏛", title: "مشروع Bargylos", desc: "التوثيق الميداني والرصد المنظَّم" },
];

type AdState = "idle" | "loading" | "playing" | "rewarded" | "error";

function useAdsgramReward(telegramId: string) {
  const rewardOnServer = useCallback(async () => {
    const res = await fetch("/api/ads/reward", {
      method: "POST",
      headers: { "x-telegram-id": telegramId },
    });
    if (!res.ok) throw new Error("reward API failed");
    return (await res.json()) as { loyaltyPoints: number; pointsAwarded: number };
  }, [telegramId]);

  return rewardOnServer;
}

export function WatchSection({ onBack }: { onBack: () => void }) {
  const { user } = useTelegram();
  const telegramId = user?.id?.toString() || "";

  const [totalEarned, setTotalEarned] = useState(0);
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [adState, setAdState] = useState<AdState>("idle");
  const [activeAdId, setActiveAdId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const rewardOnServer = useAdsgramReward(telegramId);

  async function handleWatch(adId: string) {
    if (collected.has(adId) || !telegramId) return;
    setActiveAdId(adId);
    setAdState("loading");
    setErrorMsg("");

    try {
      if (ADSGRAM_BLOCK_ID && window.Adsgram) {
        // ── Real Adsgram path ──
        const controller = await window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
        setAdState("playing");
        const result = await controller.show();
        if (result.done) {
          const { pointsAwarded } = await rewardOnServer();
          setCollected(prev => new Set([...prev, adId]));
          setTotalEarned(t => t + pointsAwarded);
          setAdState("rewarded");
        } else {
          // Error 1099 = no ad inventory available
          const is1099 = result.description?.includes("1099") || result.description?.includes("No ads");
          setAdState("error");
          setErrorMsg(
            is1099
              ? "جاري تحديث العروض التشاركية.. ساهم في البحث الآن لتعزيز رصيدك"
              : "لم تكتمل المشاهدة. حاول مجدداً."
          );
        }
      } else {
        // ── Simulation fallback (dev / no block ID configured) ──
        setAdState("playing");
        await new Promise(r => setTimeout(r, 3000));
        const { pointsAwarded } = await rewardOnServer();
        setCollected(prev => new Set([...prev, adId]));
        setTotalEarned(t => t + pointsAwarded);
        setAdState("rewarded");
      }
    } catch (e: unknown) {
      // Catch Error 1099 (no ad inventory) from thrown exceptions too
      const msg = e instanceof Error ? e.message : String(e);
      const is1099 = msg.includes("1099") || msg.toLowerCase().includes("no ads") || msg.toLowerCase().includes("inventory");
      setAdState("error");
      setErrorMsg(
        is1099
          ? "جاري تحديث العروض التشاركية.. ساهم في البحث الآن لتعزيز رصيدك"
          : "حدث خطأ. يرجى المحاولة لاحقاً."
      );
    }

    setTimeout(() => {
      setAdState("idle");
      setActiveAdId(null);
    }, 2000);
  }

  const slide = { initial: { x: -40, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 40, opacity: 0 }, transition: { duration: 0.3 } };

  return (
    <motion.div className="flex flex-col min-h-full" dir="rtl" {...slide}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-primary/10 text-primary active:scale-95 transition-transform">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-arabic font-bold text-primary text-lg leading-tight">شاهد وادعم</h1>
          <p className="font-arabic text-muted-foreground text-xs">اكسب {AD_POINTS} نقاط ولاء بكل إعلان</p>
        </div>
        {totalEarned > 0 && (
          <div className="flex items-center gap-1 bg-[#d4af37]/15 border border-[#d4af37]/40 rounded-full px-3 py-1">
            <Star className="w-3.5 h-3.5 text-[#d4af37]" fill="#d4af37" />
            <span className="font-mono text-[#d4af37] text-sm font-bold">+{totalEarned}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 pb-20 space-y-5">

        {/* Global ad state overlay */}
        <AnimatePresence>
          {adState !== "idle" && (
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{
                background: adState === "rewarded" ? "rgba(34,197,94,0.12)" : adState === "error" ? "rgba(239,68,68,0.12)" : "rgba(212,175,55,0.08)",
                border: `1.5px solid ${adState === "rewarded" ? "rgba(34,197,94,0.4)" : adState === "error" ? "rgba(239,68,68,0.4)" : "rgba(212,175,55,0.3)"}`,
              }}>
              {adState === "loading" && <motion.div className="w-5 h-5 border-2 border-[#d4af37] border-t-transparent rounded-full flex-shrink-0" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} />}
              {adState === "playing" && <Tv className="w-5 h-5 text-[#d4af37] flex-shrink-0" />}
              {adState === "rewarded" && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />}
              {adState === "error" && <span className="text-red-400 flex-shrink-0">✕</span>}
              <p className="font-arabic text-sm font-bold" style={{ color: adState === "rewarded" ? "#4ade80" : adState === "error" ? "#f87171" : "#d4af37" }}>
                {adState === "loading" && "جارٍ تحميل الإعلان..."}
                {adState === "playing" && "يُعرض الإعلان — لا تغلق النافذة"}
                {adState === "rewarded" && `🎉 تمّ! +${AD_POINTS} نقطة أُضيفت لرصيدك`}
                {adState === "error" && errorMsg}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info banner */}
        <div className="bg-card border border-primary/20 rounded-2xl p-4 flex gap-3 items-start"
          style={{ boxShadow: "0 3px 0 rgba(212,175,55,0.15)" }}>
          <div className="text-2xl flex-shrink-0">📺</div>
          <div>
            <p className="font-arabic font-bold text-foreground text-sm mb-0.5">شاهد وادعم — في أي وقت</p>
            <p className="font-arabic text-muted-foreground text-xs leading-5">
              شاهد محتوى المبادرة واكسب <span className="text-[#d4af37] font-bold">{AD_POINTS} نقاط ولاء</span> لكل إعلان تُكمله. تُضاف النقاط فوراً لرصيدك.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            ["📺", `${collected.size}/${AD_LIST.length}`, "مُشاهَد"],
            ["⭐", totalEarned || "٠", "نقطة اليوم"],
            ["🔄", AD_LIST.length - collected.size, "متبقٍّ"],
          ].map(([ic, v, l]) => (
            <div key={String(l)} className="bg-card border border-border rounded-2xl p-3">
              <div className="text-xl mb-1">{ic}</div>
              <div className="font-mono font-bold text-primary text-base">{v}</div>
              <div className="font-arabic text-muted-foreground text-[10px]">{l}</div>
            </div>
          ))}
        </div>

        {/* Ad list */}
        <h2 className="font-arabic font-bold text-foreground text-base">المحتوى المتاح</h2>

        {AD_LIST.map((ad, i) => {
          const done = collected.has(ad.id);
          const isActive = activeAdId === ad.id;
          return (
            <motion.button key={ad.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              onClick={() => handleWatch(ad.id)}
              disabled={done || (adState !== "idle" && !isActive)}
              className="w-full flex items-center gap-4 rounded-2xl border-2 p-4 text-right transition-all active:scale-[0.98] disabled:cursor-not-allowed"
              style={{
                backgroundColor: done ? "rgba(34,197,94,0.05)" : isActive ? "rgba(212,175,55,0.08)" : "var(--card)",
                borderColor: done ? "rgba(34,197,94,0.35)" : isActive ? "rgba(212,175,55,0.5)" : "var(--border)",
                boxShadow: done ? "0 3px 0 rgba(34,197,94,0.15)" : isActive ? "0 3px 0 rgba(212,175,55,0.25)" : "0 3px 0 rgba(212,175,55,0.1)",
                opacity: (!done && adState !== "idle" && !isActive) ? 0.4 : 1,
              }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                style={{ backgroundColor: done ? "rgba(34,197,94,0.12)" : "rgba(212,175,55,0.08)", border: `1.5px solid ${done ? "rgba(34,197,94,0.3)" : "rgba(212,175,55,0.2)"}` }}>
                {done ? "✅" : isActive ? "⏳" : ad.emoji}
              </div>
              <div className="flex-1 text-right">
                <p className="font-arabic font-bold text-foreground text-sm">{ad.title}</p>
                <p className="font-arabic text-muted-foreground text-xs mt-0.5">{ad.desc}</p>
                <div className="flex items-center gap-1 mt-1.5 justify-end">
                  <span className="font-mono text-xs font-bold" style={{ color: done ? "#4ade80" : "#d4af37" }}>
                    {done ? "✓ تم الاستلام" : `+${AD_POINTS} نقطة`}
                  </span>
                </div>
              </div>
              {!done && (
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isActive ? "rgba(212,175,55,0.2)" : "rgba(0,43,27,0.4)", border: "1px solid rgba(212,175,55,0.3)" }}>
                  {isActive
                    ? <motion.div className="w-4 h-4 border-2 border-[#d4af37] border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} />
                    : <Play className="w-4 h-4 text-primary" fill="currentColor" />
                  }
                </div>
              )}
            </motion.button>
          );
        })}

        {collected.size === AD_LIST.length && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-arabic font-bold text-[#d4af37] text-lg mb-1">أحسنت!</p>
            <p className="font-arabic text-muted-foreground text-sm">شاهدت كل المحتوى المتاح اليوم · عُد غداً للمزيد</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
