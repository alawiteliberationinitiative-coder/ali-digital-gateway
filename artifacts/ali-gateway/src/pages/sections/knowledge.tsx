import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Star, Lock, CheckCircle, Volume2 } from "lucide-react";
import { useTelegram } from "../../lib/telegram";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Question {
  id: number;
  category: string;
  type: "sort" | "fill" | "choice";
  instruction: string;
  text?: string;
  words?: string[];
  options?: string[];
  answer: string | string[];
  source?: string;
}

interface KnowledgeBase {
  version: string;
  totalQuestions: number;
  categories: Record<string, { count: number; label: string; color: string; emoji: string }>;
  questions: Question[];
}

const QUESTIONS_PER_LEVEL = 5;
const POINTS_PER_LEVEL = 10;
const ADSGRAM_BLOCK_ID = import.meta.env.VITE_ADSGRAM_BLOCK_ID as string | undefined;

declare global {
  interface Window {
    Adsgram?: { init: (o: { blockId: string }) => Promise<{ show: () => Promise<{ done: boolean }> }> };
  }
}

// ─── Sound System ─────────────────────────────────────────────────────────────
function useSounds() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playClick = useCallback(() => {
    try {
      const ac = getCtx();
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.frequency.value = 660; osc.type = "sine";
      g.gain.setValueAtTime(0.08, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
      osc.start(); osc.stop(ac.currentTime + 0.08);
    } catch { /* silent */ }
  }, [getCtx]);

  const playCorrect = useCallback(() => {
    try {
      const ac = getCtx();
      [523, 659, 784].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.connect(g); g.connect(ac.destination);
        osc.frequency.value = freq; osc.type = "sine";
        const t = ac.currentTime + i * 0.14;
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.start(t); osc.stop(t + 0.22);
      });
    } catch { /* silent */ }
  }, [getCtx]);

  const playWrong = useCallback(() => {
    try {
      const ac = getCtx();
      [300, 220].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.connect(g); g.connect(ac.destination);
        osc.type = "sawtooth"; osc.frequency.value = freq;
        const t = ac.currentTime + i * 0.15;
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t); osc.stop(t + 0.2);
      });
    } catch { /* silent */ }
  }, [getCtx]);

  return { playClick, playCorrect, playWrong };
}

// ─── Category Info ────────────────────────────────────────────────────────────
const CAT: Record<string, { label: string; color: string; emoji: string }> = {
  nahjBalagha: { label: "نهج البلاغة", color: "#d4af37", emoji: "📜" },
  poetry:      { label: "شعر وأدب",    color: "#60a5fa", emoji: "🖋" },
  mythology:   { label: "الميثيولوجيا", color: "#a78bfa", emoji: "⚡" },
  geography:   { label: "جغرافيا",     color: "#34d399", emoji: "🗺" },
};

// ─── Word Sort ────────────────────────────────────────────────────────────────
function WordSort({ words, answer, onResult, playClick, playCorrect, playWrong }: {
  words: string[]; answer: string[];
  onResult: (c: boolean) => void;
  playClick: () => void; playCorrect: () => void; playWrong: () => void;
}) {
  const [avail, setAvail] = useState([...words]);
  const [arranged, setArranged] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  function pick(w: string, i: number) {
    if (submitted) return;
    playClick();
    setAvail(p => p.filter((_, j) => j !== i));
    setArranged(p => [...p, w]);
  }
  function remove(i: number) {
    if (submitted) return;
    playClick();
    const w = arranged[i];
    setArranged(p => p.filter((_, j) => j !== i));
    setAvail(p => [...p, w]);
  }
  function submit() {
    if (arranged.length !== answer.length) return;
    const ok = arranged.join(" ") === answer.join(" ");
    setCorrect(ok);
    setSubmitted(true);
    ok ? playCorrect() : playWrong();
    setTimeout(() => onResult(ok), 1400);
  }
  function reset() {
    playClick();
    setAvail([...words]); setArranged([]); setSubmitted(false);
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Drop zone */}
      <motion.div className="min-h-14 rounded-2xl p-3 flex flex-wrap gap-2 transition-all"
        animate={{ borderColor: submitted ? (correct ? "#4ade80" : "#f87171") : "rgba(212,175,55,0.35)" }}
        style={{ background: "rgba(0,20,10,0.6)", border: "2px dashed rgba(212,175,55,0.35)" }}>
        {arranged.length === 0 && (
          <span className="font-arabic text-white/25 text-sm self-center mx-auto">اضغط على الكلمات لترتيبها هنا</span>
        )}
        {arranged.map((w, i) => (
          <motion.button key={`a-${i}`} layout initial={{ scale: 0.8 }} animate={{ scale: 1 }}
            onClick={() => remove(i)} disabled={submitted}
            className="font-arabic text-sm px-3 py-1.5 rounded-xl font-bold transition-all active:scale-95"
            style={{ background: submitted ? (correct ? "rgba(74,222,128,0.2)" : "rgba(239,68,68,0.2)") : "rgba(212,175,55,0.2)", border: `1.5px solid ${submitted ? (correct ? "#4ade80" : "#f87171") : "rgba(212,175,55,0.6)"}`, color: submitted ? (correct ? "#4ade80" : "#f87171") : "#d4af37" }}>
            {w}
          </motion.button>
        ))}
      </motion.div>

      {/* Word bank */}
      <div className="flex flex-wrap gap-2 justify-center py-1">
        {avail.map((w, i) => (
          <motion.button key={`v-${i}-${w}`} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => pick(w, i)} disabled={submitted}
            whileTap={{ scale: 0.93 }}
            className="font-arabic text-sm px-4 py-2 rounded-xl font-bold active:scale-95 transition-all"
            style={{ background: "rgba(0,60,30,0.5)", border: "1.5px solid rgba(212,175,55,0.3)", color: "#e8e8e8" }}>
            {w}
          </motion.button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button onClick={reset} disabled={submitted || arranged.length === 0}
          className="flex-1 py-2.5 rounded-xl font-arabic text-sm border border-white/10 text-white/50 active:scale-95 transition-all disabled:opacity-30">
          ↺ إعادة
        </button>
        <motion.button onClick={submit}
          disabled={submitted || arranged.length !== answer.length}
          whileTap={{ scale: 0.97 }}
          className="flex-2 flex-1 py-2.5 rounded-xl font-arabic font-bold text-sm active:scale-95 transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#004400,#006600)", color: "#d4af37", border: "1.5px solid rgba(212,175,55,0.4)" }}>
          تحقق ✓
        </motion.button>
      </div>

      <AnimatePresence>
        {submitted && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-3 text-center font-arabic text-sm font-bold"
            style={{ background: correct ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)", color: correct ? "#4ade80" : "#f87171", border: `1.5px solid ${correct ? "rgba(74,222,128,0.4)" : "rgba(239,68,68,0.4)"}` }}>
            {correct ? "✅ ممتاز! إجابة صحيحة" : `❌ الترتيب الصحيح: ${answer.join(" ")}`}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Fill in the Blank ────────────────────────────────────────────────────────
function FillBlank({ text, options, answer, onResult, playClick, playCorrect, playWrong }: {
  text: string; options: string[]; answer: string;
  onResult: (c: boolean) => void;
  playClick: () => void; playCorrect: () => void; playWrong: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const isCorrect = selected === answer;

  function choose(opt: string) {
    if (selected) return;
    playClick();
    setSelected(opt);
    const ok = opt === answer;
    setTimeout(() => { ok ? playCorrect() : playWrong(); }, 80);
    setTimeout(() => onResult(ok), 1300);
  }

  const parts = text.split("___");

  return (
    <div className="space-y-5" dir="rtl">
      {/* Sentence with blank */}
      <div className="rounded-2xl p-4 text-center"
        style={{ background: "rgba(0,50,25,0.4)", border: "1.5px solid rgba(212,175,55,0.2)" }}>
        <p className="font-arabic text-white text-lg leading-8 font-bold">
          {parts[0]}
          <motion.span
            className="inline-block mx-1 px-3 py-0.5 rounded-lg font-mono font-bold min-w-[80px] text-center"
            animate={{ backgroundColor: selected ? (isCorrect ? "rgba(74,222,128,0.25)" : "rgba(239,68,68,0.25)") : "rgba(212,175,55,0.15)" }}
            style={{ border: `2px solid ${selected ? (isCorrect ? "#4ade80" : "#f87171") : "rgba(212,175,55,0.5)"}`, color: selected ? (isCorrect ? "#4ade80" : "#f87171") : "#d4af37" }}>
            {selected || "___"}
          </motion.span>
          {parts[1]}
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const isOpt = selected === opt;
          const isAns = opt === answer;
          let bg = "rgba(0,60,30,0.4)";
          let border = "rgba(212,175,55,0.25)";
          let color = "#e8e8e8";
          if (selected) {
            if (isAns) { bg = "rgba(74,222,128,0.18)"; border = "#4ade80"; color = "#4ade80"; }
            else if (isOpt) { bg = "rgba(239,68,68,0.18)"; border = "#f87171"; color = "#f87171"; }
            else { bg = "rgba(0,0,0,0.15)"; border = "rgba(255,255,255,0.06)"; color = "rgba(255,255,255,0.25)"; }
          }
          return (
            <motion.button key={opt}
              onClick={() => choose(opt)}
              whileTap={!selected ? { scale: 0.96 } : {}}
              className="py-3 px-3 rounded-2xl font-arabic text-sm font-bold text-center transition-all"
              style={{ background: bg, border: `2px solid ${border}`, color, boxShadow: isAns && selected ? "0 0 14px rgba(74,222,128,0.25)" : "none" }}>
              {isOpt && !isAns && <span className="mr-1">✕ </span>}
              {isAns && selected && <span className="mr-1">✓ </span>}
              {opt}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Multiple Choice ──────────────────────────────────────────────────────────
function ChoiceQuestion({ options, answer, onResult, playClick, playCorrect, playWrong }: {
  options: string[]; answer: string;
  onResult: (c: boolean) => void;
  playClick: () => void; playCorrect: () => void; playWrong: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  function choose(opt: string) {
    if (selected) return;
    playClick();
    setSelected(opt);
    const ok = opt === answer;
    setTimeout(() => { ok ? playCorrect() : playWrong(); }, 80);
    setTimeout(() => onResult(ok), 1300);
  }

  return (
    <div className="space-y-3" dir="rtl">
      {options.map((opt) => {
        const isOpt = selected === opt;
        const isAns = opt === answer;
        let bg = "rgba(0,60,30,0.35)";
        let border = "rgba(212,175,55,0.2)";
        let color = "#e8e8e8";
        if (selected) {
          if (isAns) { bg = "rgba(74,222,128,0.18)"; border = "#4ade80"; color = "#4ade80"; }
          else if (isOpt) { bg = "rgba(239,68,68,0.18)"; border = "#f87171"; color = "#f87171"; }
          else { bg = "rgba(0,0,0,0.1)"; border = "rgba(255,255,255,0.05)"; color = "rgba(255,255,255,0.2)"; }
        }
        return (
          <motion.button key={opt}
            onClick={() => choose(opt)}
            whileTap={!selected ? { scale: 0.98 } : {}}
            className="w-full py-3.5 px-5 rounded-2xl font-arabic text-sm font-bold text-right transition-all"
            style={{ background: bg, border: `2px solid ${border}`, color, boxShadow: isAns && selected ? "0 0 16px rgba(74,222,128,0.2)" : "none" }}>
            <span className="ml-2 text-base">
              {isOpt && !isAns ? "✕" : isAns && selected ? "✓" : "◈"}
            </span>
            {opt}
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Stage Complete (Ad Gate) ──────────────────────────────────────────────────
function StageGate({ stage, score, total, onWatch, loading, onSkip }: {
  stage: number; score: number; total: number;
  onWatch: () => void; loading: boolean; onSkip: () => void;
}) {
  const stars = Math.round((score / total) * 3);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-5 px-5 py-10 text-center" dir="rtl">

      <motion.div className="text-6xl"
        animate={{ rotate: [0, -12, 12, -8, 8, 0], scale: [1, 1.25, 1] }}
        transition={{ duration: 0.9 }}>
        {score >= 4 ? "🏆" : score >= 3 ? "⭐" : "📚"}
      </motion.div>

      <div>
        <p className="font-arabic text-[#d4af37] font-bold text-2xl mb-1">المحطة {stage} مكتملة!</p>
        <p className="font-arabic text-white/50 text-sm">أجبت عن {score} من {total} إجابات صحيحة</p>
      </div>

      {/* Stars */}
      <div className="flex gap-3">
        {[...Array(3)].map((_, i) => (
          <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15 + i * 0.15 }}
            className="text-3xl">{i < stars ? "⭐" : "☆"}</motion.div>
        ))}
      </div>

      {/* Reward card */}
      <div className="w-full rounded-2xl border border-[#d4af37]/30 p-4"
        style={{ background: "rgba(212,175,55,0.07)" }}>
        <p className="font-arabic text-[#d4af37]/60 text-xs mb-1">مكافأة المحطة</p>
        <p className="font-mono text-[#d4af37] font-bold text-2xl">+{POINTS_PER_LEVEL} نقطة ولاء</p>
      </div>

      {/* Ad gate */}
      <div className="w-full rounded-2xl border border-purple-500/30 p-4"
        style={{ background: "rgba(88,28,135,0.2)" }}>
        <p className="font-arabic text-purple-200 font-bold text-sm mb-1">📺 شاهد واستمر في الرحلة</p>
        <p className="font-arabic text-purple-300/60 text-xs">شاهد إعلاناً لفتح المحطة التالية وادعم المبادرة</p>
      </div>

      <motion.button onClick={onWatch} disabled={loading} whileTap={{ scale: 0.96 }}
        className="w-full py-4 rounded-2xl font-arabic font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#5b21b6,#7c3aed)", boxShadow: "0 5px 0 rgba(55,10,90,0.6)", color: "#e9d5ff" }}>
        {loading
          ? <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> جارٍ التحميل...</>
          : <>📺 شاهد وافتح المحطة التالية</>}
      </motion.button>

      <button onClick={onSkip} className="font-arabic text-white/25 text-xs underline">
        تخطي (بدون نقاط)
      </button>
    </motion.div>
  );
}

// ─── Duolingo Winding Path ─────────────────────────────────────────────────────
const OFFSETS = [48, 20, 0, -20, -48, -20, 0, 20];

function DuolingoMap({ totalLevels, completedLevels, currentLevel, onSelect }: {
  totalLevels: number; completedLevels: Set<number>; currentLevel: number;
  onSelect: (l: number) => void;
}) {
  const displayLevels = Math.min(totalLevels, 50);

  return (
    <div className="px-4 pb-28 relative">
      <div className="relative flex flex-col items-center gap-0 pt-2">
        {[...Array(displayLevels)].map((_, i) => {
          const lvl = i + 1;
          const done = completedLevels.has(lvl);
          const current = lvl === currentLevel;
          const locked = lvl > currentLevel && !done;
          const isStage = lvl % 5 === 0;
          const offsetX = OFFSETS[i % OFFSETS.length];

          return (
            <div key={lvl} className="flex flex-col items-center" style={{ width: "100%" }}>
              {/* Stage milestone banner */}
              {isStage && lvl <= currentLevel + 1 && (
                <motion.div
                  initial={{ opacity: 0, scaleX: 0.8 }} animate={{ opacity: 1, scaleX: 1 }}
                  className="w-full max-w-[220px] rounded-xl py-2 px-4 mb-1 mt-1 text-center"
                  style={{
                    background: done ? "rgba(74,222,128,0.12)" : current || lvl === currentLevel + 1 ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${done ? "rgba(74,222,128,0.35)" : "rgba(212,175,55,0.25)"}`,
                  }}>
                  <p className="font-arabic text-xs font-bold" style={{ color: done ? "#4ade80" : "#d4af37" }}>
                    {done ? "✅" : "⭐"} محطة {lvl / 5} — الإعلان والدعم
                  </p>
                </motion.div>
              )}

              {/* Connector line (above node, except first) */}
              {i > 0 && (
                <div className="w-0.5 h-6 rounded-full"
                  style={{ background: done || current ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.08)" }} />
              )}

              {/* Level node */}
              <motion.button
                onClick={() => !locked && onSelect(lvl)}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1, x: offsetX }}
                transition={{ delay: i * 0.025, type: "spring", stiffness: 300, damping: 22 }}
                whileTap={!locked ? { scale: 0.9 } : {}}
                className="relative flex flex-col items-center justify-center rounded-full transition-all"
                style={{
                  width: isStage ? 72 : 58,
                  height: isStage ? 72 : 58,
                  background: done
                    ? "linear-gradient(135deg,#16a34a,#22c55e)"
                    : current
                    ? "linear-gradient(135deg,#7a5c00,#d4af37)"
                    : locked
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,60,30,0.5)",
                  border: `3px solid ${done ? "#4ade80" : current ? "#f0d060" : locked ? "rgba(255,255,255,0.08)" : "rgba(212,175,55,0.3)"}`,
                  boxShadow: done
                    ? "0 4px 0 rgba(22,163,74,0.5), 0 0 20px rgba(74,222,128,0.2)"
                    : current
                    ? "0 4px 0 rgba(100,75,0,0.7), 0 0 25px rgba(212,175,55,0.35)"
                    : "0 3px 0 rgba(0,0,0,0.4)",
                  cursor: locked ? "not-allowed" : "pointer",
                }}>

                {/* Pulse ring for current */}
                {current && (
                  <motion.div className="absolute inset-0 rounded-full border-2 border-[#d4af37]"
                    animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ repeat: Infinity, duration: 1.8 }} />
                )}

                {done
                  ? <CheckCircle className="w-6 h-6 text-white" />
                  : locked
                  ? <Lock className="w-4 h-4 text-white/20" />
                  : <span className="font-mono font-bold text-sm" style={{ color: current ? "#002b1b" : "#d4af37" }}>{lvl}</span>
                }
                {isStage && !locked && (
                  <span className="absolute -top-1 -right-1 text-xs">⭐</span>
                )}
              </motion.button>
            </div>
          );
        })}

        {totalLevels > displayLevels && (
          <p className="font-arabic text-center text-white/20 text-xs mt-6">
            +{totalLevels - displayLevels} مستوى قادم
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Quiz Progress Bar ────────────────────────────────────────────────────────
function QuizProgress({ level, idx, total, catColor }: { level: number; idx: number; total: number; catColor: string }) {
  const pct = ((idx) / total) * 100;
  return (
    <div className="space-y-2" dir="rtl">
      <div className="flex items-center justify-between text-xs">
        <span className="font-arabic text-white/40">المستوى {level}</span>
        <span className="font-arabic text-white/40">{idx + 1} / {total}</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <motion.div className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${catColor}, ${catColor}cc)` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }} />
      </div>
      {/* Step dots */}
      <div className="flex gap-1.5 justify-center">
        {[...Array(total)].map((_, i) => (
          <motion.div key={i}
            className="rounded-full transition-all"
            animate={{ width: i === idx ? 20 : 8, height: 8, backgroundColor: i < idx ? catColor : i === idx ? catColor : "rgba(255,255,255,0.1)" }}
            transition={{ duration: 0.3 }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Knowledge Section ────────────────────────────────────────────────────
export function KnowledgeSection({ onBack }: { onBack: () => void }) {
  const { user } = useTelegram();
  const telegramId = user?.id?.toString() || "";
  const { playClick, playCorrect, playWrong } = useSounds();

  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(true);

  const [completedLevels, setCompletedLevels] = useState<Set<number>>(new Set());
  const [currentLevel, setCurrentLevel] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"map" | "quiz" | "stage">("map");
  const [adLoading, setAdLoading] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    fetch("/knowledge_base.json")
      .then(r => r.json())
      .then((d: KnowledgeBase) => { setKb(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const getLevelQuestions = useCallback((lvl: number): Question[] => {
    if (!kb) return [];
    const start = (lvl - 1) * QUESTIONS_PER_LEVEL;
    return kb.questions.slice(start, start + QUESTIONS_PER_LEVEL);
  }, [kb]);

  const totalLevels = kb ? Math.floor(kb.totalQuestions / QUESTIONS_PER_LEVEL) : 0;

  function startLevel(lvl: number) {
    playClick();
    setSelectedLevel(lvl);
    setQIdx(0);
    setScore(0);
    setPhase("quiz");
  }

  function handleAnswer(correct: boolean) {
    if (correct) setScore(s => s + 1);
    const qs = getLevelQuestions(selectedLevel!);
    if (qIdx + 1 >= qs.length) {
      setTimeout(() => setPhase("stage"), 600);
    } else {
      setTimeout(() => setQIdx(i => i + 1), 900);
    }
  }

  async function handleWatchAd() {
    setAdLoading(true);
    try {
      if (ADSGRAM_BLOCK_ID && window.Adsgram) {
        const ctrl = await window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
        const r = await ctrl.show();
        if (!r.done) { setAdLoading(false); return; }
      } else {
        await new Promise(r => setTimeout(r, 2000));
      }
      if (telegramId) {
        await fetch("/api/ads/reward", { method: "POST", headers: { "x-telegram-id": telegramId } });
      }
      setTotalPoints(p => p + POINTS_PER_LEVEL);
      completeLevel();
    } catch { /* silent */ }
    setAdLoading(false);
  }

  function completeLevel() {
    const lvl = selectedLevel!;
    setCompletedLevels(prev => new Set([...prev, lvl]));
    setCurrentLevel(prev => Math.max(prev, lvl + 1));
    setPhase("map");
    setSelectedLevel(null);
  }

  function handleSkip() {
    playClick();
    completeLevel();
  }

  const qs = selectedLevel ? getLevelQuestions(selectedLevel) : [];
  const q = qs[qIdx];
  const cat = q ? (CAT[q.category] ?? { label: q.category, color: "#d4af37", emoji: "📖" }) : null;
  const stage = selectedLevel ? Math.ceil(selectedLevel / 5) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(160deg,#001a10,#002b1b)" }}>
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-arabic text-[#d4af37]/60 text-sm">جارٍ تحميل محرك المعرفة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full"
      style={{ background: "linear-gradient(160deg,#001a10 0%,#002b1b 50%,#001208 100%)" }}>

      {/* Header */}
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(0,22,13,0.96)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(212,175,55,0.18)" }}>
        <button onClick={() => { playClick(); onBack(); }}
          className="p-2 rounded-xl active:scale-95 transition-transform"
          style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)" }}>
          <ChevronRight className="w-5 h-5 text-[#d4af37]" />
        </button>
        <div className="flex-1" dir="rtl">
          <h1 className="font-arabic font-bold text-[#d4af37] text-lg leading-tight">اربح وادعم — محرك المعرفة</h1>
          <p className="font-arabic text-white/35 text-xs">{totalLevels} مستوى · {kb?.totalQuestions ?? 0} سؤال</p>
        </div>
        {totalPoints > 0 && (
          <div className="flex items-center gap-1 rounded-full px-3 py-1"
            style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.4)" }}>
            <Star className="w-3.5 h-3.5 text-[#d4af37]" fill="#d4af37" />
            <span className="font-mono text-[#d4af37] text-sm font-bold">+{totalPoints}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* ── MAP VIEW ── */}
          {phase === "map" && (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }}>
              {/* Hero */}
              <div className="px-4 pt-6 pb-4 text-center" dir="rtl">
                <motion.div className="text-5xl mb-3"
                  animate={{ rotate: [0, -6, 6, -4, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}>🧠</motion.div>
                <p className="font-arabic text-[#d4af37] font-bold text-xl mb-1">خريطة الرحلة</p>
                <p className="font-arabic text-white/40 text-sm mb-4">كل ٥ مستويات = محطة إعلان ودعم</p>
                {/* Category legend */}
                <div className="flex flex-wrap justify-center gap-2">
                  {Object.values(kb?.categories ?? {}).map(c => (
                    <span key={c.label} className="font-arabic text-xs px-2.5 py-1 rounded-full"
                      style={{ background: `${c.color}18`, border: `1px solid ${c.color}45`, color: c.color }}>
                      {c.emoji} {c.label}
                    </span>
                  ))}
                </div>
                {/* Type legend */}
                <div className="flex justify-center gap-3 mt-2">
                  {[["↔", "ترتيب", "#d4af37"], ["📝", "ملء فراغ", "#60a5fa"], ["✅", "اختيار", "#34d399"]].map(([ic, lb, cl]) => (
                    <span key={String(lb)} className="font-arabic text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: `${cl}12`, border: `1px solid ${cl}30`, color: String(cl) }}>
                      {ic} {lb}
                    </span>
                  ))}
                </div>
              </div>

              <DuolingoMap totalLevels={totalLevels} completedLevels={completedLevels}
                currentLevel={currentLevel} onSelect={startLevel} />
            </motion.div>
          )}

          {/* ── QUIZ VIEW ── */}
          {phase === "quiz" && q && (
            <motion.div key={`quiz-${qIdx}`}
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}
              className="px-4 py-5 pb-24 space-y-5">

              <QuizProgress level={selectedLevel!} idx={qIdx} total={qs.length}
                catColor={cat?.color ?? "#d4af37"} />

              {/* Category + source badge */}
              <div className="flex items-center gap-2 justify-end" dir="rtl">
                {cat && (
                  <span className="font-arabic text-xs px-3 py-1 rounded-full"
                    style={{ background: `${cat.color}18`, border: `1px solid ${cat.color}40`, color: cat.color }}>
                    {cat.emoji} {cat.label}
                  </span>
                )}
                {q.source && (
                  <span className="font-arabic text-[10px] px-2 py-0.5 rounded-full text-white/30"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {q.source}
                  </span>
                )}
              </div>

              {/* Question type badge */}
              <div className="flex justify-center">
                <span className="font-arabic text-xs px-3 py-1 rounded-full font-bold"
                  style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", color: "rgba(212,175,55,0.7)" }}>
                  {q.type === "sort" ? "↔ رتّب الكلمات" : q.type === "fill" ? "📝 أكمل الجملة" : "✅ اختر الإجابة"}
                </span>
              </div>

              {/* Instruction + Question Text */}
              <div className="rounded-2xl p-5" dir="rtl"
                style={{ background: "rgba(0,50,25,0.35)", border: "1.5px solid rgba(212,175,55,0.18)", boxShadow: "0 4px 0 rgba(0,0,0,0.5)" }}>
                <p className="font-arabic text-[#d4af37]/70 text-xs mb-2">{q.instruction}</p>
                {q.text && q.type !== "fill" && (
                  <p className="font-arabic text-white font-bold text-base leading-7">{q.text}</p>
                )}
                {q.type === "sort" && (
                  <p className="font-arabic text-[#d4af37]/50 text-xs mt-2">💡 اضغط على الكلمات لترتيبها</p>
                )}
              </div>

              {/* Interaction */}
              {q.type === "sort" && q.words && (
                <WordSort key={q.id} words={q.words} answer={q.answer as string[]}
                  onResult={handleAnswer} playClick={playClick} playCorrect={playCorrect} playWrong={playWrong} />
              )}
              {q.type === "fill" && q.text && q.options && (
                <FillBlank key={q.id} text={q.text} options={q.options} answer={q.answer as string}
                  onResult={handleAnswer} playClick={playClick} playCorrect={playCorrect} playWrong={playWrong} />
              )}
              {q.type === "choice" && q.options && (
                <ChoiceQuestion key={q.id} options={q.options} answer={q.answer as string}
                  onResult={handleAnswer} playClick={playClick} playCorrect={playCorrect} playWrong={playWrong} />
              )}
            </motion.div>
          )}

          {/* ── STAGE GATE ── */}
          {phase === "stage" && (
            <motion.div key="stage" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}>
              <StageGate stage={stage} score={score} total={qs.length}
                onWatch={handleWatchAd} loading={adLoading} onSkip={handleSkip} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
