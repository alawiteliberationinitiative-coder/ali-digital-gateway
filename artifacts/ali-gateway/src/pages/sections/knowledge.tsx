import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Star, Lock, Trophy, Play, CheckCircle } from "lucide-react";
import { useTelegram } from "../../lib/telegram";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Question {
  id: number;
  category: string;
  type: "sort" | "choice";
  text: string;
  words?: string[];
  answer: string | string[];
  options?: string[];
  explanation: string;
}

interface KnowledgeBase {
  version: string;
  totalQuestions: number;
  categories: Record<string, { count: number; label: string; color: string }>;
  questions: Question[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const QUESTIONS_PER_LEVEL = 5;
const POINTS_PER_LEVEL = 10;
const ADSGRAM_BLOCK_ID = import.meta.env.VITE_ADSGRAM_BLOCK_ID as string | undefined;

declare global {
  interface Window {
    Adsgram?: { init: (o: { blockId: string }) => Promise<{ show: () => Promise<{ done: boolean }> }> };
  }
}

// ─── Sound helpers ────────────────────────────────────────────────────────────
function playBeep(type: "correct" | "wrong") {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = type === "correct" ? 880 : 220;
    osc.type = type === "correct" ? "sine" : "sawtooth";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch { /* silent */ }
}

// ─── Category badge ───────────────────────────────────────────────────────────
const CAT_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  nahjBalagha: { label: "نهج البلاغة", color: "#d4af37", emoji: "📜" },
  literature:  { label: "أدب وشعر",    color: "#60a5fa", emoji: "🖋" },
  philosophy:  { label: "فلسفة",        color: "#a78bfa", emoji: "🏛" },
  geography:   { label: "جغرافيا",      color: "#34d399", emoji: "🗺" },
};

// ─── Word Sort Component ──────────────────────────────────────────────────────
function WordSort({ words, answer, onResult }: {
  words: string[];
  answer: string[];
  onResult: (correct: boolean) => void;
}) {
  const [available, setAvailable] = useState<string[]>([...words]);
  const [arranged, setArranged] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  function pick(word: string, idx: number) {
    if (submitted) return;
    setAvailable(prev => prev.filter((_, i) => i !== idx));
    setArranged(prev => [...prev, word]);
  }

  function remove(idx: number) {
    if (submitted) return;
    const w = arranged[idx];
    setArranged(prev => prev.filter((_, i) => i !== idx));
    setAvailable(prev => [...prev, w]);
  }

  function submit() {
    if (arranged.length !== answer.length) return;
    const isCorrect = arranged.join(" ") === answer.join(" ");
    setCorrect(isCorrect);
    setSubmitted(true);
    playBeep(isCorrect ? "correct" : "wrong");
    setTimeout(() => onResult(isCorrect), 1200);
  }

  function reset() {
    setAvailable([...words]);
    setArranged([]);
    setSubmitted(false);
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Arranged area */}
      <div className="min-h-16 bg-[#001a10] border-2 border-dashed rounded-2xl p-3 flex flex-wrap gap-2"
        style={{ borderColor: submitted ? (correct ? "#4ade80" : "#f87171") : "rgba(212,175,55,0.4)" }}>
        {arranged.length === 0 && (
          <span className="font-arabic text-white/30 text-sm self-center mx-auto">اضغط على الكلمات لترتيبها هنا...</span>
        )}
        {arranged.map((w, i) => (
          <motion.button key={`arr-${i}`} layout
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={() => remove(i)}
            disabled={submitted}
            className="font-arabic text-sm px-3 py-1.5 rounded-xl font-bold"
            style={{ background: "rgba(212,175,55,0.2)", border: "1.5px solid rgba(212,175,55,0.6)", color: "#d4af37" }}>
            {w}
          </motion.button>
        ))}
      </div>

      {/* Available words */}
      <div className="flex flex-wrap gap-2 justify-center">
        {available.map((w, i) => (
          <motion.button key={`av-${i}-${w}`} layout
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => pick(w, i)}
            disabled={submitted}
            whileTap={{ scale: 0.93 }}
            className="font-arabic text-sm px-4 py-2 rounded-xl font-bold active:scale-95 transition-all"
            style={{ background: "rgba(0,68,0,0.4)", border: "1.5px solid rgba(212,175,55,0.3)", color: "#e8e8e8" }}>
            {w}
          </motion.button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={reset} disabled={submitted}
          className="flex-1 py-2.5 rounded-xl font-arabic text-sm border border-border text-muted-foreground active:scale-95 transition-all disabled:opacity-40">
          إعادة الترتيب
        </button>
        <button onClick={submit}
          disabled={submitted || arranged.length !== answer.length}
          className="flex-1 py-2.5 rounded-xl font-arabic font-bold text-sm active:scale-95 transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#004400,#006600)", color: "#d4af37", border: "1.5px solid rgba(212,175,55,0.4)" }}>
          تحقق ✓
        </button>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {submitted && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-3 text-center font-arabic text-sm font-bold"
            style={{ background: correct ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: correct ? "#4ade80" : "#f87171", border: `1.5px solid ${correct ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}` }}>
            {correct ? "✅ ممتاز! إجابة صحيحة" : `❌ الترتيب الصحيح: ${answer.join(" ")}`}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Choice Component ─────────────────────────────────────────────────────────
function ChoiceQuestion({ options, answer, onResult }: {
  options: string[];
  answer: string;
  onResult: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  function choose(opt: string) {
    if (selected) return;
    setSelected(opt);
    const isCorrect = opt === answer;
    playBeep(isCorrect ? "correct" : "wrong");
    setTimeout(() => onResult(isCorrect), 1100);
  }

  return (
    <div className="grid grid-cols-1 gap-3" dir="rtl">
      {options.map((opt) => {
        const isSelected = selected === opt;
        const isCorrect = opt === answer;
        let bg = "rgba(0,68,0,0.25)";
        let border = "rgba(212,175,55,0.2)";
        let textColor = "var(--foreground)";
        if (selected) {
          if (isCorrect) { bg = "rgba(34,197,94,0.2)"; border = "#4ade80"; textColor = "#4ade80"; }
          else if (isSelected) { bg = "rgba(239,68,68,0.2)"; border = "#f87171"; textColor = "#f87171"; }
          else { bg = "rgba(0,0,0,0.1)"; border = "rgba(255,255,255,0.05)"; textColor = "rgba(255,255,255,0.3)"; }
        }
        return (
          <motion.button key={opt} layout
            onClick={() => choose(opt)}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 px-5 rounded-2xl font-arabic text-base font-bold text-right transition-all active:scale-[0.98]"
            style={{ background: bg, border: `2px solid ${border}`, color: textColor, boxShadow: isCorrect && selected ? "0 0 16px rgba(74,222,128,0.3)" : "none" }}>
            <span className="mr-2">{isSelected && !isCorrect ? "✕" : isCorrect && selected ? "✓" : "◈"}</span>
            {opt}
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Level Complete Screen ────────────────────────────────────────────────────
function LevelComplete({ level, score, total, onWatchAd, onNext, adLoading }: {
  level: number;
  score: number;
  total: number;
  onWatchAd: () => void;
  onNext: () => void;
  adLoading: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center gap-5 px-4 py-8" dir="rtl">
      <motion.div animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 0.8 }} className="text-6xl">
        {score >= 4 ? "🏆" : score >= 3 ? "🎯" : "📚"}
      </motion.div>

      <div className="space-y-1">
        <p className="font-arabic text-[#d4af37] font-bold text-2xl">تم فتح قفل المعرفة!</p>
        <p className="font-arabic text-white/60 text-base">المستوى {level} مكتمل</p>
      </div>

      {/* Score */}
      <div className="flex items-center gap-6">
        {[...Array(total)].map((_, i) => (
          <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.15 }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{ background: i < score ? "rgba(212,175,55,0.25)" : "rgba(255,255,255,0.05)", border: `2px solid ${i < score ? "#d4af37" : "rgba(255,255,255,0.1)"}` }}>
            {i < score ? "⭐" : "○"}
          </motion.div>
        ))}
      </div>

      {/* Reward */}
      <div className="rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/8 px-8 py-4 w-full"
        style={{ boxShadow: "0 4px 0 rgba(212,175,55,0.2)" }}>
        <p className="font-arabic text-[#d4af37]/70 text-xs mb-1">المكافأة</p>
        <p className="font-mono text-[#d4af37] font-bold text-2xl">+{POINTS_PER_LEVEL} نقطة ولاء</p>
        <p className="font-arabic text-white/40 text-xs mt-1">تُستبدل بـ airdrop $MDD لاحقاً</p>
      </div>

      {/* Adsgram gate — required to unlock next level */}
      <div className="w-full space-y-3">
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-center">
          <p className="font-arabic text-purple-300 text-xs font-bold mb-1">📺 شاهد إعلاناً وادعم المبادرة</p>
          <p className="font-arabic text-white/50 text-xs">المشاهدة مطلوبة لفتح المستوى التالي</p>
        </div>
        <motion.button
          onClick={onWatchAd}
          disabled={adLoading}
          whileTap={{ scale: 0.96 }}
          className="w-full py-4 rounded-2xl font-arabic font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#5b21b6,#7c3aed)", boxShadow: "0 5px 0 rgba(55,10,90,0.6)", color: "#e9d5ff" }}>
          {adLoading
            ? <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> جارٍ التحميل...</>
            : <><Play className="w-5 h-5" fill="currentColor" /> شاهد وافتح المستوى التالي</>}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Level Map ────────────────────────────────────────────────────────────────
function LevelMap({ totalLevels, unlockedUpTo, currentLevel, onSelect }: {
  totalLevels: number;
  unlockedUpTo: number;
  currentLevel: number;
  onSelect: (level: number) => void;
}) {
  const show = Math.min(totalLevels, 20);
  return (
    <div className="px-4 pb-24" dir="rtl">
      <p className="font-arabic text-muted-foreground text-xs text-center mb-5">اختر مستوى للبدء</p>
      <div className="grid grid-cols-4 gap-3">
        {[...Array(show)].map((_, i) => {
          const lvl = i + 1;
          const unlocked = lvl <= unlockedUpTo;
          const current = lvl === currentLevel;
          return (
            <motion.button key={lvl}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => unlocked && onSelect(lvl)}
              whileTap={unlocked ? { scale: 0.93 } : {}}
              className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-1"
              style={{
                background: current ? "linear-gradient(135deg,#004400,#006600)" : unlocked ? "rgba(0,68,0,0.4)" : "rgba(0,0,0,0.2)",
                border: `2px solid ${current ? "#d4af37" : unlocked ? "rgba(212,175,55,0.3)" : "rgba(255,255,255,0.05)"}`,
                boxShadow: current ? "0 4px 0 rgba(212,175,55,0.3)" : unlocked ? "0 3px 0 rgba(0,0,0,0.3)" : "none",
              }}>
              {unlocked
                ? <span className="font-mono text-[#d4af37] font-bold text-base">{lvl}</span>
                : <Lock className="w-4 h-4 text-white/20" />}
              {unlocked && <span className="text-[8px] text-white/40 font-arabic">مستوى</span>}
            </motion.button>
          );
        })}
      </div>
      {totalLevels > show && (
        <p className="font-arabic text-center text-white/30 text-xs mt-4">+{totalLevels - show} مستوى آخر قادم</p>
      )}
    </div>
  );
}

// ─── Main Quiz Engine ─────────────────────────────────────────────────────────
export function KnowledgeSection({ onBack }: { onBack: () => void }) {
  const { user } = useTelegram();
  const telegramId = user?.id?.toString() || "";

  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(true);

  // Progress state
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"map" | "quiz" | "complete">("map");
  const [adLoading, setAdLoading] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const questionRef = useRef<Question | null>(null);

  useEffect(() => {
    fetch("/knowledge_base.json")
      .then(r => r.json())
      .then((data: KnowledgeBase) => { setKb(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const getLevelQuestions = useCallback((level: number): Question[] => {
    if (!kb) return [];
    const start = (level - 1) * QUESTIONS_PER_LEVEL;
    return kb.questions.slice(start, start + QUESTIONS_PER_LEVEL);
  }, [kb]);

  const totalLevels = kb ? Math.floor(kb.totalQuestions / QUESTIONS_PER_LEVEL) : 0;

  function startLevel(level: number) {
    setSelectedLevel(level);
    setQuestionIdx(0);
    setScore(0);
    setPhase("quiz");
  }

  function handleAnswer(correct: boolean) {
    if (correct) setScore(s => s + 1);
    if (questionIdx + 1 >= QUESTIONS_PER_LEVEL) {
      setTimeout(() => setPhase("complete"), 500);
    } else {
      setTimeout(() => setQuestionIdx(i => i + 1), 800);
    }
  }

  async function handleWatchAd() {
    setAdLoading(true);
    try {
      if (ADSGRAM_BLOCK_ID && window.Adsgram) {
        const ctrl = await window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
        const result = await ctrl.show();
        if (!result.done) { setAdLoading(false); return; }
      } else {
        await new Promise(r => setTimeout(r, 2000));
      }
      // Award points
      if (telegramId) {
        await fetch("/api/ads/reward", { method: "POST", headers: { "x-telegram-id": telegramId } });
      }
      setTotalPoints(p => p + POINTS_PER_LEVEL);
      setUnlockedLevel(u => Math.max(u, (selectedLevel ?? 1) + 1));
      setPhase("map");
      setSelectedLevel(null);
    } catch {
      setAdLoading(false);
    }
    setAdLoading(false);
  }

  const currentQuestions = selectedLevel ? getLevelQuestions(selectedLevel) : [];
  const currentQ = currentQuestions[questionIdx];
  const catInfo = currentQ ? (CAT_LABELS[currentQ.category] ?? { label: currentQ.category, color: "#d4af37", emoji: "📖" }) : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(160deg,#001a10,#002b1b)" }}>
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-arabic text-[#d4af37]/60 text-sm">جارٍ تحميل محرك المعرفة...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div className="flex flex-col min-h-full"
      style={{ background: "linear-gradient(160deg,#001a10 0%,#002b1b 50%,#001208 100%)" }}
      initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}>

      {/* Header */}
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(0,26,16,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(212,175,55,0.2)" }}>
        <button onClick={onBack} className="p-2 rounded-xl active:scale-95 transition-transform"
          style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)" }}>
          <ChevronRight className="w-5 h-5 text-[#d4af37]" />
        </button>
        <div className="flex-1">
          <h1 className="font-arabic font-bold text-[#d4af37] text-lg leading-tight" dir="rtl">محرك المعرفة</h1>
          <p className="font-arabic text-white/40 text-xs" dir="rtl">٥٠٠ سؤال · {totalLevels} مستوى</p>
        </div>
        {totalPoints > 0 && (
          <div className="flex items-center gap-1 rounded-full px-3 py-1"
            style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.4)" }}>
            <Star className="w-3.5 h-3.5 text-[#d4af37]" fill="#d4af37" />
            <span className="font-mono text-[#d4af37] text-sm font-bold">+{totalPoints}</span>
          </div>
        )}
      </div>

      {/* ── Map View ── */}
      <AnimatePresence mode="wait">
        {phase === "map" && (
          <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto">
            {/* Hero */}
            <div className="px-4 py-6 text-center" dir="rtl">
              <motion.div className="text-5xl mb-3" animate={{ rotate: [0, -5, 5, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
                🧠
              </motion.div>
              <p className="font-arabic text-[#d4af37] font-bold text-xl mb-1">خريطة المستويات</p>
              <p className="font-arabic text-white/50 text-sm">كل مستوى = ٥ أسئلة + ١٠ نقاط ولاء</p>
              {/* Category legend */}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {Object.values(CAT_LABELS).map(c => (
                  <span key={c.label} className="font-arabic text-xs px-2.5 py-1 rounded-full"
                    style={{ background: `${c.color}20`, border: `1px solid ${c.color}50`, color: c.color }}>
                    {c.emoji} {c.label}
                  </span>
                ))}
              </div>
            </div>
            <LevelMap totalLevels={totalLevels} unlockedUpTo={unlockedLevel}
              currentLevel={unlockedLevel} onSelect={startLevel} />
          </motion.div>
        )}

        {/* ── Quiz View ── */}
        {phase === "quiz" && currentQ && (
          <motion.div key={`quiz-${questionIdx}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}
            className="flex-1 overflow-y-auto px-4 py-5 pb-24 space-y-5">

            {/* Progress bar */}
            <div className="space-y-2" dir="rtl">
              <div className="flex items-center justify-between">
                <span className="font-arabic text-white/50 text-xs">المستوى {selectedLevel}</span>
                <span className="font-arabic text-white/50 text-xs">{questionIdx + 1} / {QUESTIONS_PER_LEVEL}</span>
              </div>
              <div className="flex gap-1.5">
                {[...Array(QUESTIONS_PER_LEVEL)].map((_, i) => (
                  <div key={i} className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.08)" }}>
                    <motion.div className="h-full rounded-full"
                      style={{ background: "#d4af37" }}
                      animate={{ width: i < questionIdx ? "100%" : i === questionIdx ? "50%" : "0%" }}
                      transition={{ duration: 0.4 }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Category badge */}
            {catInfo && (
              <div className="flex justify-end" dir="rtl">
                <span className="font-arabic text-xs px-3 py-1 rounded-full"
                  style={{ background: `${catInfo.color}20`, border: `1px solid ${catInfo.color}40`, color: catInfo.color }}>
                  {catInfo.emoji} {catInfo.label}
                </span>
              </div>
            )}

            {/* Question */}
            <div className="rounded-2xl p-5" dir="rtl"
              style={{ background: "rgba(0,68,0,0.3)", border: "1.5px solid rgba(212,175,55,0.2)", boxShadow: "0 4px 0 rgba(0,0,0,0.4)" }}>
              <p className="font-arabic text-white font-bold text-base leading-7">{currentQ.text}</p>
              {currentQ.type === "sort" && currentQ.words && (
                <p className="font-arabic text-[#d4af37]/60 text-xs mt-2">💡 اضغط على الكلمات لترتيبها</p>
              )}
            </div>

            {/* Interaction */}
            {currentQ.type === "sort" && currentQ.words && (
              <WordSort
                key={currentQ.id}
                words={currentQ.words}
                answer={currentQ.answer as string[]}
                onResult={handleAnswer} />
            )}
            {currentQ.type === "choice" && currentQ.options && (
              <ChoiceQuestion
                key={currentQ.id}
                options={currentQ.options}
                answer={currentQ.answer as string}
                onResult={handleAnswer} />
            )}

            {/* Explanation hint */}
            <div className="rounded-xl p-3" dir="rtl"
              style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.1)" }}>
              <p className="font-arabic text-white/30 text-xs">{currentQ.explanation}</p>
            </div>
          </motion.div>
        )}

        {/* ── Complete Screen ── */}
        {phase === "complete" && (
          <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 overflow-y-auto">
            <LevelComplete
              level={selectedLevel ?? 1}
              score={score}
              total={QUESTIONS_PER_LEVEL}
              onWatchAd={handleWatchAd}
              onNext={() => { setPhase("map"); setSelectedLevel(null); }}
              adLoading={adLoading} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
