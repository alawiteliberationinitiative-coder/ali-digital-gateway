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

      {/* ── Tab switcher ── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5"
        style={{ background: "rgba(2,14,4,0.97)", borderBottom: "1px solid rgba(212,175,55,0.14)" }}>

        {/* شاهد وادعم */}
        <motion.button
          onClick={() => setTab("watch")}
          whileTap={{ scale: 0.94 }}
          className="relative flex-1 flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 overflow-hidden transition-all"
          style={{
            background: tab === "watch"
              ? "linear-gradient(135deg, rgba(139,92,246,0.28) 0%, rgba(109,40,217,0.18) 100%)"
              : "rgba(255,255,255,0.04)",
            border: tab === "watch"
              ? "1.5px solid rgba(139,92,246,0.55)"
              : "1.5px solid rgba(255,255,255,0.08)",
            boxShadow: tab === "watch"
              ? "0 0 16px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.12)"
              : "none",
          }}>
          {tab === "watch" && (
            <motion.div layoutId="earn-tab-pill"
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.12),transparent)" }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }} />
          )}
          <Tv size={15}
            color={tab === "watch" ? "#a78bfa" : "rgba(255,255,255,0.35)"}
            style={{ filter: tab === "watch" ? "drop-shadow(0 0 5px rgba(167,139,250,0.7))" : "none", flexShrink: 0 }} />
          <div className="relative z-10 text-right">
            <p className="font-arabic font-black text-[11px] leading-tight"
              style={{ color: tab === "watch" ? "#c4b5fd" : "rgba(255,255,255,0.55)" }}>شاهد وادعم</p>
            <p className="font-arabic text-[9px] leading-tight"
              style={{ color: tab === "watch" ? "rgba(196,181,253,0.7)" : "rgba(255,255,255,0.25)" }}>الإعلانات الطوعية</p>
          </div>
        </motion.button>

        {/* طريق النحل */}
        <motion.button
          onClick={() => setTab("play")}
          whileTap={{ scale: 0.94 }}
          className="relative flex-1 flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 overflow-hidden transition-all"
          style={{
            background: tab === "play"
              ? "linear-gradient(135deg, rgba(34,197,94,0.22) 0%, rgba(0,80,30,0.28) 100%)"
              : "rgba(255,255,255,0.04)",
            border: tab === "play"
              ? `1.5px solid rgba(34,197,94,0.5)`
              : "1.5px solid rgba(255,255,255,0.08)",
            boxShadow: tab === "play"
              ? `0 0 16px rgba(34,197,94,0.2), inset 0 1px 0 rgba(255,255,255,0.12)`
              : "none",
          }}>
          {tab === "play" && (
            <motion.div layoutId="earn-tab-pill"
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.1),transparent)" }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }} />
          )}
          <Zap size={15}
            color={tab === "play" ? GREEN : "rgba(255,255,255,0.35)"}
            fill={tab === "play" ? `${GREEN}50` : "none"}
            style={{ filter: tab === "play" ? `drop-shadow(0 0 5px ${GREEN}80)` : "none", flexShrink: 0 }} />
          <div className="relative z-10 text-right">
            <p className="font-arabic font-black text-[11px] leading-tight"
              style={{ color: tab === "play" ? "#4ade80" : "rgba(255,255,255,0.55)" }}>اربح 🐝</p>
            <p className="font-arabic text-[9px] leading-tight"
              style={{ color: tab === "play" ? "rgba(74,222,128,0.7)" : "rgba(255,255,255,0.25)" }}>طريق النحل</p>
          </div>
        </motion.button>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} className="absolute inset-0"
            initial={{ opacity: 0, x: tab === "watch" ? -14 : 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tab === "watch" ? 14 : -14 }}
            transition={{ duration: 0.16, ease: "easeOut" }}>
            <Suspense fallback={<TabLoading />}>
              {tab === "watch" && <WatchSection onBack={() => {}} />}
              {tab === "play"  && <PlaySection  onBack={() => {}} />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
