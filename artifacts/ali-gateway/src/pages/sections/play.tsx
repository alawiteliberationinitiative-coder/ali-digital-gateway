import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Zap, Star, Trophy, RotateCcw, Tv } from "lucide-react";
import { useTelegram } from "../../lib/telegram";

declare global {
  interface Window {
    show_11001376?: () => Promise<void>;
  }
}

const slide = {
  initial: { x: -40, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit:    { x: 40, opacity: 0 },
  transition: { duration: 0.3 },
};

interface Question {
  q:       string;
  options: string[];
  correct: number;
  pts:     number;
}

const QUESTIONS: Question[] = [
  {
    q: "ماذا تعني ALI في اسم المبادرة؟",
    options: ["Alawite Liberation Initiative", "Arab Leadership Institute", "Advanced Liberty Index", "Alliance Leaders Initiative"],
    correct: 0, pts: 50,
  },
  {
    q: "ما هو رمز عملة المبادرة الرقمية؟",
    options: ["$ALI", "$ALE", "$MDD", "$TLV"],
    correct: 2, pts: 50,
  },
  {
    q: "ما اسم مشروع التوثيق السري في المبادرة؟",
    options: ["Sentinel", "Bargylos", "Nexus", "Arcos"],
    correct: 1, pts: 75,
  },
  {
    q: "كم دولة تغطيها شبكة سفراء القضية؟",
    options: ["أكثر من ١٠", "أكثر من ٢٠", "أكثر من ٤٠", "أكثر من ١٠٠"],
    correct: 2, pts: 50,
  },
  {
    q: "ما شعار المبادرة؟",
    options: ["نحو الحرية", "حقٌّ لا يموت", "الوحدة قوة", "الأرض للأحرار"],
    correct: 1, pts: 100,
  },
];

// Ad after every N questions (between levels)
const AD_EVERY_N = 2;

// GameState is a proper state-machine:
//   ready → playing → answered → [ad-break →] playing … → done
type GameState  = "ready" | "playing" | "answered" | "ad-break" | "done";
type DoubleState = "idle" | "loading" | "done" | "error";

async function triggerMonetagAd(): Promise<boolean> {
  try {
    if (typeof window.show_11001376 === "function") {
      await window.show_11001376();
      return true;
    }
    // Dev-mode simulation: 3 s countdown
    await new Promise(r => setTimeout(r, 3000));
    return true;
  } catch {
    return false;
  }
}

// ── Ad-Break Screen ────────────────────────────────────────────────────────────
function AdBreakScreen({ nextQ, score, onDone }: {
  nextQ:  number;
  score:  number;
  onDone: () => void;
}) {
  const [secs, setSecs]         = useState(3);
  const [adPhase, setAdPhase]   = useState<"countdown" | "ad" | "done">("countdown");
  const launched                = useRef(false);

  // Countdown then launch ad
  useEffect(() => {
    if (secs > 0) {
      const t = setTimeout(() => setSecs(s => s - 1), 1000);
      return () => clearTimeout(t);
    }
    if (!launched.current) {
      launched.current = true;
      setAdPhase("ad");
      triggerMonetagAd().then(() => {
        setAdPhase("done");
        setTimeout(onDone, 700);
      });
    }
  }, [secs, onDone]);

  return (
    <motion.div
      key="ad-break"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center"
      style={{ background: "linear-gradient(180deg,#060d1a 0%,#001a0f 100%)" }}>

      {/* Level badge */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 2.4 }}
        className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{
          background:  "linear-gradient(135deg,#002b1b,#004a2a)",
          border:      "3px solid #d4af37",
          boxShadow:   "0 0 40px rgba(212,175,55,0.35)",
        }}>
        {adPhase === "done"
          ? <span className="text-4xl">✅</span>
          : adPhase === "ad"
            ? <Tv className="w-10 h-10 text-[#d4af37]" />
            : <span className="text-3xl font-mono font-black text-[#d4af37]">{secs}</span>
        }
      </motion.div>

      {/* Labels */}
      <div>
        <p className="font-arabic font-black text-[#d4af37] text-xl mb-1">
          {adPhase === "countdown" && "استراحة — المستوى التالي قريباً"}
          {adPhase === "ad"        && "يُعرض الإعلان — شاهد حتى النهاية"}
          {adPhase === "done"      && "أحسنت! ننتقل للمستوى التالي"}
        </p>
        <p className="font-arabic text-muted-foreground text-sm">
          {adPhase === "countdown" && `السؤال ${nextQ} من ${QUESTIONS.length} · رصيدك الحالي: ${score} نقطة`}
          {adPhase === "ad"        && "مشاهدتك تدعم المبادرة مباشرةً 💚"}
          {adPhase === "done"      && ""}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {QUESTIONS.map((_, i) => (
          <div key={i}
            className="w-2.5 h-2.5 rounded-full transition-all"
            style={{
              backgroundColor: i < nextQ - 1
                ? "#d4af37"
                : i === nextQ - 1
                  ? "rgba(212,175,55,0.3)"
                  : "rgba(255,255,255,0.1)",
              transform: i === nextQ - 1 ? "scale(1.25)" : "scale(1)",
            }} />
        ))}
      </div>

      {/* Ad spinner */}
      {adPhase === "ad" && (
        <motion.div
          className="w-8 h-8 border-[3px] border-[#d4af37] border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }} />
      )}

      {/* Info strip */}
      <p className="font-arabic text-[10px] text-muted-foreground/50 max-w-xs leading-4">
        الإعلانات تُعرض عبر شركاء موثوقين · دعمك للمبادرة يبدأ من هنا
      </p>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function PlaySection({ onBack }: { onBack: () => void }) {
  const { user }    = useTelegram();
  const telegramId  = user?.id?.toString() || "";

  const [gameState,    setGameState]    = useState<GameState>("ready");
  const [current,      setCurrent]      = useState(0);
  const [selected,     setSelected]     = useState<number | null>(null);
  const [score,        setScore]        = useState(0);
  const [streak,       setStreak]       = useState(0);
  const [doubleState,  setDoubleState]  = useState<DoubleState>("idle");
  const [doubledScore, setDoubledScore] = useState(0);

  // Pending question index to navigate to after the ad-break
  const pendingNextIdx = useRef<number>(0);

  const q      = QUESTIONS[current];
  const isLast = current === QUESTIONS.length - 1;

  function handleStart() { setGameState("playing"); }

  function handleAnswer(idx: number) {
    if (gameState !== "playing") return;
    setSelected(idx);
    setGameState("answered");
    if (idx === q.correct) {
      const bonus = streak >= 2 ? Math.floor(q.pts * 0.5) : 0;
      setScore(s => s + q.pts + bonus);
      setStreak(s => s + 1);
    } else {
      setStreak(0);
    }
  }

  function handleNext() {
    if (isLast) {
      setGameState("done");
      return;
    }

    const nextIdx = current + 1;
    const needAd  = nextIdx % AD_EVERY_N === 0; // ad after every N questions

    if (needAd) {
      // Store destination, switch to ad-break state
      pendingNextIdx.current = nextIdx;
      setGameState("ad-break");
    } else {
      setCurrent(nextIdx);
      setSelected(null);
      setGameState("playing");
    }
  }

  // Called by AdBreakScreen when ad finishes
  function handleAdDone() {
    const idx = pendingNextIdx.current;
    setCurrent(idx);
    setSelected(null);
    setGameState("playing");
  }

  async function handleDoublePoints() {
    if (doubleState !== "idle" || !score) return;
    setDoubleState("loading");
    const ok = await triggerMonetagAd();
    if (ok) {
      const doubled = score * 2;
      setDoubledScore(doubled);
      setScore(doubled);
      if (telegramId) {
        try {
          await fetch("/api/ads/reward", {
            method:  "POST",
            headers: { "x-telegram-id": telegramId },
          });
        } catch { /* non-critical */ }
      }
      setDoubleState("done");
    } else {
      setDoubleState("error");
      setTimeout(() => setDoubleState("idle"), 2500);
    }
  }

  function handleRestart() {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setStreak(0);
    setDoubleState("idle");
    setDoubledScore(0);
    setGameState("ready");
    pendingNextIdx.current = 0;
  }

  const optionColor = (idx: number) => {
    if (gameState !== "answered") return undefined;
    if (idx === q.correct)                     return { bg: "#16a34a22", border: "#16a34a88", text: "#4ade80" };
    if (idx === selected && idx !== q.correct) return { bg: "#dc262622", border: "#dc262688", text: "#f87171" };
    return undefined;
  };

  const finalScore = doubleState === "done" ? doubledScore : score;

  return (
    <motion.div className="flex flex-col h-full" dir="rtl" {...slide}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-primary/10 text-primary active:scale-95 transition-transform">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-arabic font-bold text-primary text-lg leading-tight">اربح و ادعم</h1>
          <p className="font-arabic text-muted-foreground text-xs">أجب وكسب نقاط الولاء · ادعم القضية</p>
        </div>
        {(gameState === "playing" || gameState === "answered" || gameState === "ad-break") && (
          <div className="flex items-center gap-1 bg-[#d4af37]/15 border border-[#d4af37]/40 rounded-full px-3 py-1">
            <Star className="w-3.5 h-3.5 text-[#d4af37]" fill="#d4af37" />
            <span className="font-mono text-[#d4af37] text-sm font-bold">{score}</span>
          </div>
        )}
      </div>

      {/* ── Screens ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">

          {/* ── Ready ── */}
          {gameState === "ready" && (
            <motion.div key="ready"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center gap-6 pt-8 px-4">

              <motion.div
                animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                className="w-32 h-32 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#002b1b,#003d26)", border: "3px solid #d4af37", boxShadow: "0 0 40px rgba(212,175,55,0.3), 0 8px 0 rgba(212,175,55,0.4)" }}>
                <span className="text-5xl">🎯</span>
              </motion.div>

              <div>
                <h2 className="font-arabic font-bold text-foreground text-2xl mb-2">اربح و ادعم</h2>
                <p className="font-arabic text-muted-foreground text-sm leading-6 max-w-xs">
                  أجب على {QUESTIONS.length} أسئلة عن المبادرة<br />
                  واكسب نقاط ولاء تُضاف لرصيدك فوراً
                </p>
              </div>

              <div className="w-full grid grid-cols-3 gap-3">
                {[
                  ["🎯", `${QUESTIONS.length} أسئلة`, "تحدّيات"],
                  ["⭐", "٣٢٥+",              "نقطة بالكامل"],
                  ["🔥", "بونص",              "لكل سلسلة"],
                ].map(([ic, v, l]) => (
                  <div key={l} className="bg-card border border-border rounded-2xl p-3 text-center">
                    <div className="text-2xl mb-1">{ic}</div>
                    <div className="font-mono font-bold text-primary text-sm">{v}</div>
                    <div className="font-arabic text-muted-foreground text-[10px]">{l}</div>
                  </div>
                ))}
              </div>

              {/* Ad notice */}
              <div className="flex items-center gap-2 w-full rounded-xl px-3 py-2"
                style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)" }}>
                <Tv className="w-3.5 h-3.5 text-[#d4af37] flex-shrink-0" />
                <p className="font-arabic text-[11px] text-[#d4af37]/80">
                  إعلانات قصيرة بين المستويات — مشاهدتها تدعم المبادرة مباشرةً
                </p>
              </div>

              <motion.button onClick={handleStart} whileTap={{ scale: 0.96 }}
                className="w-full py-5 rounded-3xl font-arabic font-bold text-2xl"
                style={{ background: "linear-gradient(135deg,#d4af37 0%,#f0d060 50%,#d4af37 100%)", boxShadow: "0 6px 0 rgba(180,140,20,0.6)", color: "#002b1b" }}>
                ابدأ اللعب ▶
              </motion.button>
            </motion.div>
          )}

          {/* ── Ad-Break (full-screen between levels) ── */}
          {gameState === "ad-break" && (
            <AdBreakScreen
              key="ad-break"
              nextQ={pendingNextIdx.current + 1}
              score={score}
              onDone={handleAdDone}
            />
          )}

          {/* ── Playing / Answered ── */}
          {(gameState === "playing" || gameState === "answered") && (
            <motion.div key={`q-${current}`}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="flex flex-col h-full">

              <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-4"
                style={{ paddingBottom: gameState === "answered" ? "8px" : "16px" }}>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between font-arabic text-xs text-muted-foreground">
                    <span>السؤال {current + 1} من {QUESTIONS.length}</span>
                    {streak >= 2 && <span className="text-orange-400 font-bold">🔥 سلسلة ×{streak}</span>}
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full bg-primary"
                      animate={{ width: `${((current + (gameState === "answered" ? 1 : 0)) / QUESTIONS.length) * 100}%` }}
                      transition={{ duration: 0.4 }} />
                  </div>
                  {/* Upcoming ad hint */}
                  {!isLast && (current + 1) % AD_EVERY_N === 0 && gameState === "playing" && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="font-arabic text-[10px] flex items-center gap-1"
                      style={{ color: "rgba(212,175,55,0.55)" }}>
                      <Tv className="w-3 h-3" />
                      استراحة إعلانية قصيرة بعد هذا السؤال
                    </motion.p>
                  )}
                </div>

                {/* Question card */}
                <div className="bg-card border-2 border-primary/30 rounded-3xl p-5 text-center"
                  style={{ boxShadow: "0 4px 0 rgba(0,43,27,0.5)" }}>
                  <div className="text-3xl mb-2">❓</div>
                  <p className="font-arabic font-bold text-foreground text-lg leading-relaxed">{q.q}</p>
                  <div className="mt-2 inline-flex items-center gap-1 bg-[#d4af37]/10 rounded-full px-3 py-1">
                    <Zap className="w-3 h-3 text-[#d4af37]" />
                    <span className="font-mono text-[#d4af37] text-xs">+{q.pts} نقطة</span>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-2.5">
                  {q.options.map((opt, idx) => {
                    const col = optionColor(idx);
                    return (
                      <motion.button key={idx} onClick={() => handleAnswer(idx)} whileTap={{ scale: 0.97 }}
                        disabled={gameState === "answered"}
                        className="w-full p-3.5 rounded-2xl border-2 font-arabic text-base text-right transition-all"
                        style={{
                          backgroundColor: col ? col.bg    : "var(--card)",
                          borderColor:     col ? col.border : "var(--border)",
                          color:           col ? col.text   : "var(--foreground)",
                          boxShadow:       col ? undefined  : "0 3px 0 rgba(0,0,0,0.2)",
                        }}>
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold"
                            style={{ borderColor: col ? col.border : "rgba(255,255,255,0.2)", color: col?.text }}>
                            {["أ", "ب", "ج", "د"][idx]}
                          </div>
                          <span className="flex-1">{opt}</span>
                          {gameState === "answered" && idx === q.correct && <span className="text-green-400 text-lg">✓</span>}
                          {gameState === "answered" && idx === selected && idx !== q.correct && <span className="text-red-400 text-lg">✗</span>}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Fixed bottom feedback + next */}
              <AnimatePresence>
                {gameState === "answered" && (
                  <motion.div
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 340, damping: 28 }}
                    className="flex-shrink-0 px-4 py-3 border-t border-border"
                    style={{
                      background: selected === q.correct
                        ? "linear-gradient(to top, rgba(5,46,22,0.97), rgba(5,46,22,0.92))"
                        : "linear-gradient(to top, rgba(69,10,10,0.97), rgba(69,10,10,0.92))",
                    }}>
                    <div className="flex gap-3 items-stretch">

                      {/* Feedback */}
                      <div className={`flex-1 rounded-2xl px-4 py-3 flex flex-col justify-center border ${selected === q.correct ? "border-green-600/40 bg-green-950/60" : "border-red-600/40 bg-red-950/60"}`}>
                        <p className="font-arabic font-bold text-base leading-tight">
                          {selected === q.correct ? "🎉 إجابة صحيحة!" : "❌ إجابة خاطئة"}
                        </p>
                        {selected === q.correct && streak >= 2 && (
                          <p className="font-arabic text-orange-400 text-xs mt-0.5">
                            🔥 بونص +{Math.floor(q.pts * 0.5)} نقطة
                          </p>
                        )}
                        {selected !== q.correct && (
                          <p className="font-arabic text-white/50 text-xs mt-0.5">
                            الإجابة: {q.options[q.correct]}
                          </p>
                        )}
                        {/* Warn about upcoming ad */}
                        {!isLast && (current + 1) % AD_EVERY_N === 0 && (
                          <p className="font-arabic text-[10px] text-[#d4af37]/70 mt-1 flex items-center gap-1">
                            <Tv className="w-3 h-3" />
                            استراحة إعلانية قصيرة قبل المستوى التالي
                          </p>
                        )}
                      </div>

                      {/* Next */}
                      <motion.button onClick={handleNext} whileTap={{ scale: 0.94 }}
                        className="flex-shrink-0 w-28 rounded-2xl font-arabic font-bold text-base flex flex-col items-center justify-center gap-1"
                        style={{
                          background:  "linear-gradient(135deg,#002b1b,#004a2a)",
                          boxShadow:   "0 4px 0 rgba(0,0,0,0.5)",
                          border:      "1.5px solid rgba(212,175,55,0.5)",
                          color:       "#d4af37",
                        }}>
                        <span className="text-xl">{isLast ? "★" : "←"}</span>
                        <span className="text-xs">{isLast ? "النتيجة" : "التالي"}</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Done ── */}
          {gameState === "done" && (
            <motion.div key="done"
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center gap-5 pt-6 px-4 overflow-y-auto pb-20">

              <motion.div animate={{ rotate: [0, -10, 10, -5, 0] }} transition={{ delay: 0.3, duration: 0.6 }}
                className="text-7xl">
                {finalScore >= 250 ? "🏆" : finalScore >= 150 ? "🥈" : "🎯"}
              </motion.div>

              <div>
                <p className="font-arabic text-muted-foreground text-sm mb-1">مجموع نقاطك</p>
                <motion.div key={finalScore}
                  initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
                  className="font-mono text-6xl font-bold"
                  style={{ color: doubleState === "done" ? "#4ade80" : "#d4af37" }}>
                  {finalScore}
                </motion.div>
                <p className="font-arabic text-[#d4af37]/70 text-sm mt-1">نقطة ولاء</p>
                {doubleState === "done" && (
                  <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="font-arabic text-green-400 font-bold text-sm mt-1">
                    ×٢ تمّت المضاعفة! 🎉
                  </motion.p>
                )}
              </div>

              {/* Summary */}
              <div className="w-full bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Trophy className="w-5 h-5 text-[#d4af37]" />
                  <span className="font-arabic font-bold text-foreground">ملخص الجلسة</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  {[
                    ["عدد الأسئلة",  `${QUESTIONS.length}`],
                    ["أطول سلسلة",  `${streak}×`],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-background rounded-xl p-3">
                      <div className="font-mono font-bold text-primary text-xl">{v}</div>
                      <div className="font-arabic text-muted-foreground text-xs">{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="font-arabic text-muted-foreground text-sm leading-6">
                شكراً لدعمك القضية! نقاطك ستُضاف<br />إلى رصيدك خلال لحظات.
              </p>

              {/* ── Double Points Button ── */}
              {doubleState !== "done" && score > 0 && (
                <motion.button
                  onClick={handleDoublePoints}
                  disabled={doubleState === "loading"}
                  whileTap={{ scale: 0.96 }}
                  className="w-full py-4 rounded-2xl font-arabic font-bold text-base flex items-center justify-center gap-3"
                  style={{
                    background: doubleState === "error"
                      ? "rgba(239,68,68,0.12)"
                      : "linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.08))",
                    border:     doubleState === "error"
                      ? "1.5px solid rgba(239,68,68,0.4)"
                      : "1.5px solid rgba(212,175,55,0.5)",
                    boxShadow:  "0 4px 0 rgba(212,175,55,0.15)",
                    color:      doubleState === "error" ? "#f87171" : "#d4af37",
                    opacity:    doubleState === "loading" ? 0.7 : 1,
                  }}>
                  {doubleState === "loading" ? (
                    <>
                      <motion.div className="w-5 h-5 border-2 border-[#d4af37] border-t-transparent rounded-full"
                        animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }} />
                      <span>جارٍ تحميل الإعلان...</span>
                    </>
                  ) : doubleState === "error" ? (
                    <span>✕ لم يكتمل الإعلان — حاول مجدداً</span>
                  ) : (
                    <>
                      <Tv className="w-5 h-5" />
                      <span>شاهد إعلاناً لمضاعفة نقاطك ×٢</span>
                      <span className="font-mono text-sm bg-[#d4af37]/20 rounded-full px-2 py-0.5">
                        {score} ← {score * 2}
                      </span>
                    </>
                  )}
                </motion.button>
              )}

              <div className="w-full space-y-3">
                <motion.button onClick={handleRestart} whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-arabic font-bold text-lg"
                  style={{ background: "linear-gradient(135deg,#d4af37,#f0d060)", boxShadow: "0 4px 0 rgba(180,140,20,0.5)", color: "#002b1b" }}>
                  <RotateCcw className="w-5 h-5" />
                  العب مجدداً
                </motion.button>
                <button onClick={onBack}
                  className="w-full py-3 rounded-2xl font-arabic text-muted-foreground text-sm border border-border bg-card">
                  العودة للرئيسية
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
