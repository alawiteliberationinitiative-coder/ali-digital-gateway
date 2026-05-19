import { useState, Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tv, Zap } from "lucide-react";

const WatchSection = lazy(() => import("../sections/watch").then(m => ({ default: m.WatchSection })));
const PlaySection  = lazy(() => import("../sections/play").then(m => ({ default: m.PlaySection })));

const GOLD  = "#d4af37";
const GREEN = "#22c55e";

type EarnTab = "watch" | "play";

function TabLoading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-7 h-7 border-2 rounded-full animate-spin"
        style={{ borderColor: `${GOLD}35`, borderTopColor: GOLD }} />
    </div>
  );
}

export function EarnSection({ telegramId: _telegramId }: { telegramId: string }) {
  const [tab, setTab] = useState<EarnTab>("watch");

  return (
    <div className="h-full flex flex-col overflow-hidden" dir="rtl">

      {/* ── Tab switcher: مخفي عند تبويب اللعب ── */}
      <AnimatePresence initial={false}>
        {tab !== "play" && (
          <motion.div
            key="tab-bar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex-shrink-0 overflow-hidden"
            style={{ borderBottom: "1px solid rgba(212,175,55,0.14)" }}>
            <div className="flex items-center gap-3 px-3 py-3"
              style={{ background: "rgba(2,14,4,0.97)" }}>

              {/* شاهد وادعم */}
              <motion.button
                onClick={() => setTab("watch")}
                whileTap={{ scale: 0.96 }}
                className="relative flex-1 flex items-center justify-center gap-2.5 rounded-2xl px-4 py-4 overflow-hidden transition-all"
                style={{
                  background: tab === "watch"
                    ? "linear-gradient(135deg, rgba(212,175,55,0.22) 0%, rgba(180,140,20,0.12) 60%, rgba(212,175,55,0.08) 100%)"
                    : "rgba(255,255,255,0.04)",
                  border: tab === "watch"
                    ? "1.5px solid rgba(212,175,55,0.65)"
                    : "1.5px solid rgba(255,255,255,0.08)",
                  boxShadow: tab === "watch"
                    ? "0 0 22px rgba(212,175,55,0.35), 0 0 8px rgba(212,175,55,0.15), inset 0 1px 0 rgba(255,255,255,0.14)"
                    : "none",
                  backdropFilter: tab === "watch" ? "blur(8px)" : "none",
                }}>
                {tab === "watch" && (
                  <motion.div layoutId="earn-tab-pill"
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.1),transparent)" }}
                    transition={{ type: "spring", stiffness: 420, damping: 38 }} />
                )}
                <Tv size={18}
                  color={tab === "watch" ? GOLD : "rgba(255,255,255,0.35)"}
                  style={{ filter: tab === "watch" ? `drop-shadow(0 0 6px ${GOLD}90)` : "none", flexShrink: 0 }} />
                <div className="relative z-10 text-right">
                  <p className="font-arabic font-black text-[13px] leading-snug"
                    style={{ color: tab === "watch" ? "#16a34a" : "rgba(255,255,255,0.55)" }}>
                    شاهد الآن وادعم المبادرة
                  </p>
                  <p className="font-arabic text-[10px] leading-tight mt-0.5"
                    style={{ color: tab === "watch" ? "#15803d" : "rgba(255,255,255,0.25)" }}>
                    الإعلانات الطوعية
                  </p>
                </div>
              </motion.button>

              {/* اربح — دائماً مملوء بالذهبي مع توهج ونبضة متكررة */}
              <motion.button
                onClick={() => setTab("play")}
                whileTap={{ scale: 0.96 }}
                className="relative flex-1 flex items-center justify-center gap-2.5 rounded-2xl px-4 py-4 overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #d4af37 0%, #b8962a 55%, #d4af37 100%)",
                  border: "1.5px solid rgba(212,175,55,0.9)",
                  boxShadow: "0 0 24px rgba(212,175,55,0.6), 0 0 8px rgba(212,175,55,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
                }}>

                {/* نبضة متكررة — طبقة توهج داخلية */}
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at 60% 50%, rgba(255,255,255,0.28) 0%, transparent 65%)" }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                />

                {tab === "play" && (
                  <motion.div layoutId="earn-tab-pill"
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.12),transparent)" }}
                    transition={{ type: "spring", stiffness: 420, damping: 38 }} />
                )}

                <Zap size={18}
                  color="#14532d"
                  fill="#14532d55"
                  style={{ filter: "drop-shadow(0 0 5px rgba(20,83,45,0.7))", flexShrink: 0 }} />

                <div className="relative z-10 text-right">
                  <p className="font-arabic font-black text-[13px] leading-snug"
                    style={{ color: "#14532d", textShadow: "0 1px 2px rgba(255,255,255,0.3)" }}>
                    اربح 🐝
                  </p>
                  <p className="font-arabic font-bold text-[10px] leading-tight mt-0.5"
                    style={{ color: "#166534" }}>
                    طريق النحل
                  </p>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab content ── */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} className="absolute inset-0"
            initial={{ opacity: 0, x: tab === "watch" ? -14 : 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tab === "watch" ? 14 : -14 }}
            transition={{ duration: 0.18, ease: "easeOut" }}>
            <Suspense fallback={<TabLoading />}>
              {tab === "watch" && <WatchSection onBack={() => {}} />}
              {tab === "play"  && <PlaySection  onBack={() => setTab("watch")} />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
