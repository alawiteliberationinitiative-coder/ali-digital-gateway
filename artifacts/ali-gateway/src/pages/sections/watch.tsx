import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Play, Star, CheckCircle } from "lucide-react";

const slide = { initial: { x: -40, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 40, opacity: 0 }, transition: { duration: 0.3 } };

const ADS = [
  { id: 1, emoji: "🌿", title: "مبادرة التحرير العلوي", desc: "تعرّف على رؤيتنا ومهمتنا في الفضاء الرقمي", pts: 15, duration: 15 },
  { id: 2, emoji: "💰", title: "عملة $MDD الرقمية", desc: "اكتشف عملة المبادرة وكيف تكسب منها", pts: 20, duration: 20 },
  { id: 3, emoji: "🌍", title: "شبكة السفراء الدولية", desc: "أكثر من 40 دولة تدعم القضية", pts: 15, duration: 15 },
  { id: 4, emoji: "🏛", title: "مشروع Bargylos", desc: "التوثيق الميداني والرصد المنظّم", pts: 25, duration: 25 },
];

function AdPlayer({ ad, onDone }: { ad: typeof ADS[0]; onDone: (pts: number) => void }) {
  const [remaining, setRemaining] = useState(ad.duration);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current!);
          setDone(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const pct = ((ad.duration - remaining) / ad.duration) * 100;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
      {/* Simulated ad screen */}
      <div className="rounded-3xl overflow-hidden border-2 border-primary/30 relative"
        style={{ background: "linear-gradient(135deg, #001a10 0%, #002b1b 60%, #001208 100%)", minHeight: 220, boxShadow: "0 6px 0 rgba(0,0,0,0.4)" }}>
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(212,175,55,0.08) 0%, transparent 70%)" }} />
        <div className="flex flex-col items-center justify-center h-full py-10 px-6 text-center relative z-10">
          <motion.div className="text-6xl mb-4"
            animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
            {ad.emoji}
          </motion.div>
          <p className="font-arabic text-[#d4af37] font-bold text-xl mb-1">{ad.title}</p>
          <p className="font-arabic text-white/60 text-sm leading-5">{ad.desc}</p>
          <div className="mt-4 flex items-center gap-1.5 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-full px-4 py-1.5">
            <Star className="w-3.5 h-3.5 text-[#d4af37]" fill="#d4af37" />
            <span className="font-mono text-[#d4af37] text-sm font-bold">+{ad.pts} نقطة</span>
          </div>
        </div>

        {/* Skip / timer badge */}
        <div className="absolute top-3 left-3 bg-black/50 rounded-full px-3 py-1">
          <span className="font-mono text-white/70 text-xs">{done ? "✓ اكتمل" : `${remaining}ث`}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between font-arabic text-xs text-muted-foreground">
          <span>تقدّم المشاهدة</span>
          <span className="font-mono">{Math.round(pct)}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #d4af37, #f0d060)" }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5 }} />
        </div>
      </div>

      {/* Collect button */}
      <AnimatePresence>
        {done && (
          <motion.button initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => onDone(ad.pts)}
            whileTap={{ scale: 0.96 }}
            className="w-full py-4 rounded-2xl font-arabic font-bold text-lg flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#d4af37,#f0d060)", boxShadow: "0 5px 0 rgba(180,140,20,0.5)", color: "#002b1b" }}>
            <CheckCircle className="w-5 h-5" />
            استلم +{ad.pts} نقطة
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function WatchSection({ onBack }: { onBack: () => void }) {
  const [playing, setPlaying] = useState<typeof ADS[0] | null>(null);
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const [totalEarned, setTotalEarned] = useState(0);

  function handleCollect(id: number, pts: number) {
    setCollected((prev) => new Set([...prev, id]));
    setTotalEarned((t) => t + pts);
    setPlaying(null);
  }

  return (
    <motion.div className="flex flex-col min-h-full" dir="rtl" {...slide}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-primary/10 text-primary active:scale-95 transition-transform">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-arabic font-bold text-primary text-lg leading-tight">شاهد وادعم</h1>
          <p className="font-arabic text-muted-foreground text-xs">اكسب نقاط ولاء بمشاهدة محتوى المبادرة</p>
        </div>
        {totalEarned > 0 && (
          <div className="flex items-center gap-1 bg-[#d4af37]/15 border border-[#d4af37]/40 rounded-full px-3 py-1">
            <Star className="w-3.5 h-3.5 text-[#d4af37]" fill="#d4af37" />
            <span className="font-mono text-[#d4af37] text-sm font-bold">+{totalEarned}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 pb-20 space-y-5">
        <AnimatePresence mode="wait">
          {playing ? (
            <motion.div key="player"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              {/* Back to list */}
              <button onClick={() => setPlaying(null)}
                className="font-arabic text-sm text-muted-foreground flex items-center gap-1 mb-4 active:opacity-70">
                <ChevronRight className="w-4 h-4" />
                العودة للقائمة
              </button>
              <AdPlayer ad={playing} onDone={(pts) => handleCollect(playing.id, pts)} />
            </motion.div>
          ) : (
            <motion.div key="list"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-4">

              {/* Info banner */}
              <div className="bg-card border border-primary/20 rounded-2xl p-4 flex gap-3 items-start"
                style={{ boxShadow: "0 3px 0 rgba(212,175,55,0.15)" }}>
                <div className="text-2xl flex-shrink-0">📺</div>
                <div>
                  <p className="font-arabic font-bold text-foreground text-sm mb-0.5">شاهد وادعم — في أي وقت</p>
                  <p className="font-arabic text-muted-foreground text-xs leading-5">
                    شاهد محتوى المبادرة وأعلانها واكسب نقاط ولاء مباشرةً تُضاف لرصيدك. كل إعلان تشاهده يُعزّز انتشار القضية.
                  </p>
                </div>
              </div>

              {/* Progress summary */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  ["📺", `${collected.size}/${ADS.length}`, "مُشاهَد"],
                  ["⭐", totalEarned || "٠", "نقطة مكتسبة"],
                  ["🔄", ADS.length - collected.size, "متبقٍّ"],
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
              {ADS.map((ad, i) => {
                const done = collected.has(ad.id);
                return (
                  <motion.button key={ad.id}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    onClick={() => !done && setPlaying(ad)}
                    disabled={done}
                    className="w-full flex items-center gap-4 rounded-2xl border-2 p-4 text-right transition-all active:scale-[0.98]"
                    style={{
                      backgroundColor: done ? "rgba(34,197,94,0.05)" : "var(--card)",
                      borderColor: done ? "rgba(34,197,94,0.35)" : "var(--border)",
                      boxShadow: done ? "0 3px 0 rgba(34,197,94,0.15)" : "0 3px 0 rgba(212,175,55,0.12)",
                      opacity: done ? 0.85 : 1,
                    }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                      style={{ backgroundColor: done ? "rgba(34,197,94,0.12)" : "rgba(212,175,55,0.08)", border: `1.5px solid ${done ? "rgba(34,197,94,0.3)" : "rgba(212,175,55,0.2)"}` }}>
                      {done ? "✅" : ad.emoji}
                    </div>
                    <div className="flex-1 text-right">
                      <p className="font-arabic font-bold text-foreground text-sm">{ad.title}</p>
                      <p className="font-arabic text-muted-foreground text-xs mt-0.5">{ad.desc}</p>
                      <div className="flex items-center gap-1 mt-1.5 justify-end">
                        <span className="font-mono text-xs font-bold" style={{ color: done ? "#4ade80" : "#d4af37" }}>
                          {done ? "✓ تم الاستلام" : `+${ad.pts} نقطة`}
                        </span>
                        <span className="font-arabic text-muted-foreground text-[10px]">· {ad.duration}ث</span>
                      </div>
                    </div>
                    {!done && (
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Play className="w-4 h-4 text-primary" fill="currentColor" />
                      </div>
                    )}
                  </motion.button>
                );
              })}

              {collected.size === ADS.length && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="font-arabic font-bold text-[#d4af37] text-lg mb-1">أحسنت!</p>
                  <p className="font-arabic text-muted-foreground text-sm">شاهدت كل المحتوى المتاح اليوم · عُد غداً للمزيد</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
