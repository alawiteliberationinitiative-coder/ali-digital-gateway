import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { apiFetch } from "../../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Star, Lock, CheckCircle, Tv, XCircle } from "lucide-react";
import { useTelegram } from "../../lib/telegram";
import { useRewardedAd } from "../../hooks/use-rewarded-ad";

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
const POINTS_PER_LEVEL    = 10;
const BONUS_AD_POINTS     = 5;


function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Sound System ─────────────────────────────────────────────────────────────
function useSounds() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const playClick = useCallback(() => {
    try {
      const ac = getCtx();
      const osc = ac.createOscillator(); const g = ac.createGain();
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
        const osc = ac.createOscillator(); const g = ac.createGain();
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
        const osc = ac.createOscillator(); const g = ac.createGain();
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
  nahjBalagha:  { label: "نهج البلاغة",    color: "#d4af37", emoji: "📜" },
  poetry:       { label: "شعر وأدب",       color: "#60a5fa", emoji: "🖋"  },
  mythology:    { label: "الميثيولوجيا",   color: "#a78bfa", emoji: "⚡"  },
  geography:    { label: "جغرافيا",        color: "#34d399", emoji: "🗺"  },
  philosophy:   { label: "حكمة الفلاسفة", color: "#f59e0b", emoji: "🏛"  },
  earthScience: { label: "علوم الأرض",     color: "#22d3ee", emoji: "🌍"  },
};

// ─── Word Sort ────────────────────────────────────────────────────────────────
function WordSort({ words, answer, onResult, playClick, playCorrect, playWrong }: {
  words: string[]; answer: string[];
  onResult: (c: boolean) => void;
  playClick: () => void; playCorrect: () => void; playWrong: () => void;
}) {
  const [avail, setAvail]       = useState([...words]);
  const [arranged, setArranged] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect]   = useState(false);

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
    setCorrect(ok); setSubmitted(true);
    ok ? playCorrect() : playWrong();
    setTimeout(() => onResult(ok), 1400);
  }
  function reset() {
    playClick();
    setAvail([...words]); setArranged([]); setSubmitted(false);
  }

  return (
    <div className="space-y-4" dir="rtl">
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
      <div className="flex flex-wrap gap-2 justify-center py-1">
        {avail.map((w, i) => (
          <motion.button key={`v-${i}-${w}`} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => pick(w, i)} disabled={submitted} whileTap={{ scale: 0.93 }}
            className="font-arabic text-sm px-4 py-2 rounded-xl font-bold active:scale-95 transition-all"
            style={{ background: "rgba(0,60,30,0.5)", border: "1.5px solid rgba(212,175,55,0.3)", color: "#e8e8e8" }}>
            {w}
          </motion.button>
        ))}
      </div>
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
  const shuffledOptions = useMemo(() => shuffled(options), []);

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
      <div className="grid grid-cols-2 gap-3">
        {shuffledOptions.map((opt) => {
          const isOpt = selected === opt;
          const isAns = opt === answer;
          let bg = "rgba(0,60,30,0.4)", border = "rgba(212,175,55,0.25)", color = "#e8e8e8";
          if (selected) {
            if (isAns)      { bg = "rgba(74,222,128,0.18)";  border = "#4ade80"; color = "#4ade80"; }
            else if (isOpt) { bg = "rgba(239,68,68,0.18)";   border = "#f87171"; color = "#f87171"; }
            else            { bg = "rgba(0,0,0,0.15)"; border = "rgba(255,255,255,0.06)"; color = "rgba(255,255,255,0.25)"; }
          }
          return (
            <motion.button key={opt} onClick={() => choose(opt)}
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
  const shuffledOptions = useMemo(() => shuffled(options), []);

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
      {shuffledOptions.map((opt) => {
        const isOpt = selected === opt;
        const isAns = opt === answer;
        let bg = "rgba(0,60,30,0.35)", border = "rgba(212,175,55,0.2)", color = "#e8e8e8";
        if (selected) {
          if (isAns)      { bg = "rgba(74,222,128,0.18)";  border = "#4ade80"; color = "#4ade80"; }
          else if (isOpt) { bg = "rgba(239,68,68,0.18)";   border = "#f87171"; color = "#f87171"; }
          else            { bg = "rgba(0,0,0,0.1)"; border = "rgba(255,255,255,0.05)"; color = "rgba(255,255,255,0.2)"; }
        }
        return (
          <motion.button key={opt} onClick={() => choose(opt)}
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

// ─── Stage Complete (Mandatory Ad Gate — every 5 levels) ───────────────────────
function StageGate({ stage, score, total, onWatch, adPhase, adError }: {
  stage: number; score: number; total: number;
  onWatch: () => void;
  adPhase: "idle" | "loading" | "showing" | "completed" | "dismissed" | "error";
  adError: string;
}) {
  const stars = Math.round((score / total) * 3);
  const isActive = adPhase === "loading" || adPhase === "showing";

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
        <p className="font-arabic text-white/30 text-xs mt-1">تُضاف فوراً عند اكتمال مشاهدة الإعلان</p>
      </div>

      {/* Ad gate info */}
      <div className="w-full rounded-2xl border border-purple-500/30 p-4"
        style={{ background: "rgba(88,28,135,0.2)" }}>
        <p className="font-arabic text-purple-200 font-bold text-sm mb-1">📺 شاهد واستمر في الرحلة</p>
        <p className="font-arabic text-purple-300/60 text-xs">
          يجب إكمال مشاهدة الإعلان لفتح المستوى التالي والحصول على النقاط
        </p>
      </div>

      {/* Phase feedback */}
      <AnimatePresence>
        {adPhase === "dismissed" && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="w-full rounded-xl p-3 flex items-center gap-2 font-arabic text-sm"
            style={{ background: "rgba(239,68,68,0.10)", border: "1.5px solid rgba(239,68,68,0.35)", color: "#f87171" }}>
            <XCircle className="w-4 h-4 flex-shrink-0" />
            لم تكتمل المشاهدة — يجب إكمالها للمتابعة
          </motion.div>
        )}
        {adPhase === "showing" && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="w-full rounded-xl p-3 flex items-center gap-2 font-arabic text-sm"
            style={{ background: "rgba(212,175,55,0.08)", border: "1.5px solid rgba(212,175,55,0.3)", color: "#d4af37" }}>
            <Tv className="w-4 h-4 flex-shrink-0" />
            شاهد الإعلان حتى النهاية ليُفتح المستوى
          </motion.div>
        )}
        {adError && adPhase !== "dismissed" && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="w-full rounded-xl p-3 text-center font-arabic text-sm"
            style={{ background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.35)", color: "#f87171" }}>
            {adError}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button onClick={onWatch}
        disabled={isActive}
        whileTap={!isActive ? { scale: 0.96 } : {}}
        className="w-full py-4 rounded-2xl font-arabic font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-70"
        style={{ background: "linear-gradient(135deg,#5b21b6,#7c3aed)", boxShadow: "0 5px 0 rgba(55,10,90,0.6)", color: "#e9d5ff" }}>
        {isActive ? (
          <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {adPhase === "loading" ? "يُحضَّر الإعلان..." : "جارٍ عرض الإعلان..."}</>
        ) : adPhase === "dismissed" ? (
          <>↺ حاول مشاهدة الإعلان مجدداً</>
        ) : (
          <>📺 شاهد وافتح المستوى التالي</>
        )}
      </motion.button>

    </motion.div>
  );
}

// ─── Between-Level Bonus Ad (Optional — non-stage levels) ─────────────────────
function BonusAdScreen({ level, onWatch, onSkip, adPhase }: {
  level: number;
  onWatch: () => void;
  onSkip: () => void;
  adPhase: "idle" | "loading" | "showing" | "completed" | "dismissed" | "error";
}) {
  const isActive = adPhase === "loading" || adPhase === "showing";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-5 px-5 py-8 text-center" dir="rtl">

      <motion.div className="text-5xl"
        animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
        ✅
      </motion.div>

      <div>
        <p className="font-arabic text-[#d4af37] font-bold text-xl mb-1">
          المستوى {level} مكتمل!
        </p>
        <p className="font-arabic text-white/40 text-sm">
          المستوى التالي جاهز
        </p>
      </div>

      {/* Bonus offer */}
      <div className="w-full rounded-2xl p-4 space-y-2"
        style={{ background: "rgba(212,175,55,0.06)", border: "1.5px solid rgba(212,175,55,0.25)" }}>
        <div className="flex items-center gap-2 justify-center">
          <Tv className="w-4 h-4 text-[#d4af37]" />
          <p className="font-arabic text-[#d4af37] font-bold text-sm">شاهد إعلاناً واحداً</p>
        </div>
        <p className="font-mono text-[#d4af37] font-bold text-2xl">+{BONUS_AD_POINTS} نقاط إضافية</p>
        <p className="font-arabic text-white/30 text-xs">
          اختياري — يُمنح فقط عند اكتمال المشاهدة
        </p>
      </div>

      {/* Phase feedback */}
      <AnimatePresence>
        {adPhase === "completed" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full rounded-xl p-3 flex items-center gap-2 font-arabic text-sm"
            style={{ background: "rgba(34,197,94,0.1)", border: "1.5px solid rgba(34,197,94,0.4)", color: "#4ade80" }}>
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            مشاهدة مكتملة! +{BONUS_AD_POINTS} نقاط أُضيفت
          </motion.div>
        )}
        {adPhase === "dismissed" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="w-full rounded-xl p-3 flex items-center gap-2 font-arabic text-sm"
            style={{ background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
            <XCircle className="w-4 h-4 flex-shrink-0" />
            لم تكتمل المشاهدة — لا تُمنح نقاط
          </motion.div>
        )}
        {adPhase === "showing" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="w-full rounded-xl p-3 flex items-center gap-2 font-arabic text-sm"
            style={{ background: "rgba(212,175,55,0.08)", border: "1.5px solid rgba(212,175,55,0.3)", color: "#d4af37" }}>
            <Tv className="w-4 h-4 flex-shrink-0" />
            شاهد حتى النهاية للحصول على النقاط 📺
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buttons */}
      <div className="w-full space-y-3">
        <motion.button onClick={onWatch}
          disabled={isActive || adPhase === "completed"}
          whileTap={!isActive ? { scale: 0.97 } : {}}
          className="w-full py-4 rounded-2xl font-arabic font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg,#d4af37 0%,#f0d060 50%,#d4af37 100%)",
            boxShadow: "0 5px 0 rgba(180,140,20,0.5)",
            color: "#002b1b",
          }}>
          {isActive ? (
            <>
              <motion.div className="w-5 h-5 border-[2px] border-[#002b1b] border-t-transparent rounded-full"
                animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} />
              {adPhase === "loading" ? "يُحضَّر الإعلان..." : "جارٍ العرض..."}
            </>
          ) : (
            <>
              <Tv className="w-5 h-5" />
              شاهد وادعم (+{BONUS_AD_POINTS} نقطة)
            </>
          )}
        </motion.button>

        <button onClick={onSkip}
          disabled={isActive}
          className="w-full py-3 rounded-2xl font-arabic text-sm text-white/35 border border-white/10 bg-transparent disabled:opacity-30 active:scale-95 transition-all">
          تخطّى — المتابعة بدون إعلان
        </button>
      </div>
    </motion.div>
  );
}

// ─── Honeycomb Hex Node ────────────────────────────────────────────────────────
function HexNode({ size, done, current, locked, isStage, level }: {
  size: number; done: boolean; current: boolean; locked: boolean;
  isStage: boolean; level: number;
}) {
  const r  = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  // Pointy-top hexagon: first vertex at 12 o'clock
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");

  const uid = `hx${level}`;

  const gColors: [string, string] | null =
    done    ? ["#16a34a", "#22c55e"]
    : current ? ["#8a6800", "#d4af37"]
    : null;

  const solidFill = locked ? "rgba(8,8,8,0.65)" : "rgba(0,40,20,0.65)";
  const stroke    = done    ? "#4ade80"
    : current ? "#f5d840"
    : locked  ? "rgba(212,175,55,0.10)"
    : "rgba(212,175,55,0.30)";
  const sw = current ? 3.5 : done ? 3 : 1.5;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>

      {/* Pulsing hex ring for current level */}
      {current && (
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: size + 14, height: size + 14,
            top: -7, left: -7,
            clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
            background: "rgba(212,175,55,0.20)",
          }}
          animate={{ scale: [1, 1.22, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
        />
      )}

      {/* SVG hexagon */}
      <svg width={size} height={size} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          {gColors && (
            <linearGradient id={`${uid}g`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gColors[0]} />
              <stop offset="100%" stopColor={gColors[1]} />
            </linearGradient>
          )}
          {(done || current) && (
            <filter id={`${uid}f`} x="-70%" y="-70%" width="240%" height="240%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={current ? "7" : "4"} result="bl" />
              <feMerge><feMergeNode in="bl" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          )}
        </defs>
        <polygon
          points={pts}
          fill={gColors ? `url(#${uid}g)` : solidFill}
          stroke={stroke}
          strokeWidth={sw}
          filter={(done || current) ? `url(#${uid}f)` : undefined}
        />
      </svg>

      {/* Icon / number overlay */}
      <div className="relative z-10 flex items-center justify-center">
        {done
          ? <CheckCircle className="w-5 h-5 text-white drop-shadow" />
          : locked
            ? <Lock className="w-3.5 h-3.5" style={{ color: "rgba(212,175,55,0.22)" }} />
            : (
              <span className="font-mono font-bold select-none" style={{
                fontSize: isStage ? "14px" : "12px",
                color: current ? "#001a0d" : "#d4af37",
                textShadow: current ? "none" : "0 0 8px rgba(212,175,55,0.5)",
              }}>
                {level}
              </span>
            )
        }
      </div>

      {/* Stage bee badge */}
      {isStage && !locked && (
        <span className="absolute -top-1.5 -right-0.5 text-sm leading-none z-20 select-none"
          style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }}>
          🐝
        </span>
      )}
    </div>
  );
}

// ─── Duolingo Winding Path ─────────────────────────────────────────────────────
const OFFSETS = [48, 20, 0, -20, -48, -20, 0, 20];
const LEVELS_PER_PAGE = 50;

function DuolingoMap({ totalLevels, completedLevels, currentLevel, onSelect }: {
  totalLevels: number; completedLevels: Set<number>; currentLevel: number;
  onSelect: (l: number) => void;
}) {
  const currentNodeRef = useRef<HTMLDivElement | null>(null);

  const [page, setPage] = useState(() => Math.ceil(currentLevel / LEVELS_PER_PAGE));
  const totalPages = Math.ceil(totalLevels / LEVELS_PER_PAGE);
  const startLevel = (page - 1) * LEVELS_PER_PAGE + 1;
  const endLevel   = Math.min(page * LEVELS_PER_PAGE, totalLevels);

  useEffect(() => {
    const targetPage = Math.ceil(currentLevel / LEVELS_PER_PAGE);
    setPage(targetPage);
  }, [currentLevel]);

  useEffect(() => {
    if (currentNodeRef.current) {
      setTimeout(() => {
        currentNodeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 350);
    }
  }, [currentLevel, page]);

  const levelRange = Array.from({ length: endLevel - startLevel + 1 }, (_, i) => startLevel + i);

  return (
    <div className="px-4 pb-28 relative">
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mb-4 px-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="font-arabic text-xs px-3 py-1.5 rounded-xl border border-white/10 text-white/50 disabled:opacity-20 active:scale-95 transition-all">
            ← السابق
          </button>
          <span className="font-arabic text-white/30 text-xs">
            صفحة {page} من {totalPages} · مستويات {startLevel}–{endLevel}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="font-arabic text-xs px-3 py-1.5 rounded-xl border border-white/10 text-white/50 disabled:opacity-20 active:scale-95 transition-all">
            التالي →
          </button>
        </div>
      )}

      <div className="relative flex flex-col items-center gap-0 pt-2">
        {levelRange.map((lvl, i) => {
          const done    = completedLevels.has(lvl);
          const current = lvl === currentLevel;
          const locked  = lvl > currentLevel && !done;
          const isStage = lvl % 5 === 0;
          const offsetX = OFFSETS[(lvl - 1) % OFFSETS.length];
          const nearby  = Math.abs(lvl - currentLevel) < 20;
          const nodeSize = isStage ? 72 : 58;

          return (
            <div key={lvl} ref={current ? currentNodeRef : undefined}
              className="flex flex-col items-center" style={{ width: "100%" }}>

              {/* Stage milestone banner */}
              {isStage && (lvl <= currentLevel + 1) && (
                <motion.div
                  initial={{ opacity: 0, scaleX: 0.8 }} animate={{ opacity: 1, scaleX: 1 }}
                  className="w-full max-w-[240px] rounded-xl py-2 px-4 mb-1 mt-1 text-center"
                  style={{
                    background: done ? "rgba(74,222,128,0.10)" : "rgba(212,175,55,0.08)",
                    border: `1px solid ${done ? "rgba(74,222,128,0.30)" : "rgba(212,175,55,0.22)"}`,
                  }}>
                  <p className="font-arabic text-xs font-bold" style={{ color: done ? "#4ade80" : "#d4af37" }}>
                    {done ? "✅" : "🐝"} محطة {lvl / 5} — الإعلان والدعم
                  </p>
                </motion.div>
              )}

              {/* Connector line */}
              {i > 0 && (
                <div className="w-0.5 h-6 rounded-full"
                  style={{
                    background: done || current
                      ? "linear-gradient(to bottom,rgba(212,175,55,0.5),rgba(212,175,55,0.2))"
                      : "rgba(255,255,255,0.06)",
                  }} />
              )}

              {/* Hex level node */}
              <motion.div
                onClick={() => !locked && onSelect(lvl)}
                initial={nearby ? { opacity: 0, scale: 0.7 } : false}
                animate={{ opacity: 1, scale: 1, x: offsetX }}
                transition={nearby ? { delay: i * 0.02, type: "spring", stiffness: 300, damping: 22 } : { duration: 0 }}
                whileTap={!locked ? { scale: 0.88 } : {}}
                style={{ cursor: locked ? "not-allowed" : "pointer" }}
              >
                <HexNode
                  size={nodeSize}
                  done={done}
                  current={current}
                  locked={locked}
                  isStage={isStage}
                  level={lvl}
                />
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Quiz Progress Bar ────────────────────────────────────────────────────────
function QuizProgress({ level, idx, total, catColor }: {
  level: number; idx: number; total: number; catColor: string;
}) {
  const pct = (idx / total) * 100;
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
      <div className="flex gap-1.5 justify-center">
        {[...Array(total)].map((_, i) => (
          <motion.div key={i} className="rounded-full transition-all"
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

  const [kb, setKb]                       = useState<KnowledgeBase | null>(null);
  const [loading, setLoading]             = useState(true);
  const [serverLevelLoaded, setServerLevelLoaded] = useState(false);

  const [completedLevels, setCompletedLevels] = useState<Set<number>>(new Set());
  const [currentLevel, setCurrentLevel]   = useState(1);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [qIdx, setQIdx]                   = useState(0);
  const [score, setScore]                 = useState(0);
  const [phase, setPhase]                 = useState<"map" | "quiz" | "bonus" | "stage">("map");
  const [adError, setAdError]             = useState("");
  const [totalPoints, setTotalPoints]     = useState(0);

  const stageAd = useRewardedAd(0, telegramId);
  const bonusAd = useRewardedAd(0, telegramId);

  // Quiz session token: obtained from /api/quiz/start-level when the user
  // selects a level and passed to /api/quiz/complete-level as server-side
  // proof that a quiz session was open before the reward is claimed.
  const quizChallengeRef = useRef<string>("");

  // ── Load KB from JSON ──
  useEffect(() => {
    fetch("/knowledge_base.json")
      .then(r => r.json())
      .then((d: KnowledgeBase) => { setKb(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Load saved level from server ──
  useEffect(() => {
    if (!telegramId) { setServerLevelLoaded(true); return; }
    apiFetch("/api/users/me")
      .then(r => r.ok ? r.json() : null)
      .then((u: { level: number; loyaltyPoints: number } | null) => {
        if (u && u.level >= 1) {
          const savedLevel = u.level;
          setCurrentLevel(savedLevel);
          // Mark all levels before savedLevel as completed
          const done = new Set<number>();
          for (let l = 1; l < savedLevel; l++) done.add(l);
          setCompletedLevels(done);
          setTotalPoints(u.loyaltyPoints);
        }
      })
      .catch(() => {})
      .finally(() => setServerLevelLoaded(true));
  }, [telegramId]);

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
    setAdError("");
    stageAd.reset();
    bonusAd.reset();
    quizChallengeRef.current = "";
    // Request a quiz session token before showing questions so the server can
    // verify the session was open for a realistic duration at completion time.
    if (telegramId) {
      apiFetch("/api/quiz/start-level", { method: "POST" })
        .then(r => r.ok ? r.json() as Promise<{ quizToken?: string }> : null)
        .then(data => { if (data?.quizToken) quizChallengeRef.current = data.quizToken; })
        .catch(() => {});
    }
    setPhase("quiz");
  }

  function handleAnswer(correct: boolean) {
    if (correct) setScore(s => s + 1);
    const qs = getLevelQuestions(selectedLevel!);
    if (qIdx + 1 >= qs.length) {
      const lvl = selectedLevel!;
      const isStage = lvl % 5 === 0;

      // Non-stage levels: persist completion immediately when the last question
      // is answered (before the bonus ad screen). Stage levels are persisted
      // after the mandatory ad in handleStageAdWatch.
      if (!isStage && telegramId) {
        const quizToken = quizChallengeRef.current;
        quizChallengeRef.current = "";
        if (quizToken) {
          apiFetch("/api/quiz/complete-level", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ levelCompleted: lvl, quizToken }),
          })
            .then(r => r.ok ? r.json() : null)
            .then((data: { level: number; loyaltyPoints: number } | null) => {
              if (data) {
                setCurrentLevel(data.level);
                setTotalPoints(data.loyaltyPoints);
              } else {
                // API rejected (token age / cooldown) — still advance locally
                setCurrentLevel(c => Math.max(c, lvl + 1));
              }
            })
            .catch(() => setCurrentLevel(c => Math.max(c, lvl + 1)));
        }
      }

      setTimeout(() => setPhase(isStage ? "stage" : "bonus"), 600);
    } else {
      setTimeout(() => setQIdx(i => i + 1), 900);
    }
  }

  async function handleStageAdWatch() {
    setAdError("");
    const completed = await stageAd.show();
    // Only block progress if the ad was actively dismissed (user can retry).
    // On any completed/timeout path we ALWAYS advance — user must never be stuck.
    if (!completed) return;

    const lvl = selectedLevel!;

    if (telegramId) {
      const quizToken = quizChallengeRef.current;
      quizChallengeRef.current = "";

      if (quizToken) {
        try {
          const res = await apiFetch("/api/quiz/complete-level", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ levelCompleted: lvl, quizToken }),
          });
          if (res.ok) {
            const data = await res.json() as { level: number; loyaltyPoints: number };
            // Sync level + points from server (source of truth)
            setCurrentLevel(data.level);
            setTotalPoints(data.loyaltyPoints);
          } else {
            // API error (cooldown, token age, sequence mismatch…).
            // Show a non-blocking message but always unlock the next level.
            const err = await res.json().catch(() => ({})) as { error?: string };
            setAdError(err.error ?? "لم تُضف النقاط — المستوى يُفتح رغم ذلك");
            setCurrentLevel(c => Math.max(c, lvl + 1));
          }
        } catch {
          setAdError("خطأ في الاتصال — المستوى يُفتح بدون نقاط");
          setCurrentLevel(c => Math.max(c, lvl + 1));
        }
      } else {
        // Level is beyond the quiz reward cap (or no token) — advance locally
        setCurrentLevel(c => Math.max(c, lvl + 1));
      }
    } else {
      // Dev / no-auth path
      setCurrentLevel(c => Math.max(c, lvl + 1));
      setTotalPoints(p => p + POINTS_PER_LEVEL);
    }

    // ⚠️ ALWAYS call completeLevel — the user watched the ad and must move forward
    completeLevel();
  }

  async function handleBonusAdWatch() {
    const token = await bonusAd.show();
    // `token` is a string (challengeToken) if ad completed, or false if dismissed
    if (token !== false && telegramId) {
      try {
        const res = await apiFetch("/api/ads/reward", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeToken: token }),
        });
        if (res.ok) {
          const data = await res.json() as { loyaltyPoints: number };
          setTotalPoints(data.loyaltyPoints);
        }
      } catch { /* non-critical — bonus points only */ }
    }
    // Ad completed → advance immediately (no points awarded if token was falsy)
    if (token !== false) {
      completeLevel();
    }
    // If dismissed (token === false) the BonusAdScreen stays visible so the user
    // can retry via onWatch or skip via onSkip (handleBonusSkip).
  }

  function handleBonusSkip() {
    completeLevel();
  }

  function completeLevel() {
    const lvl = selectedLevel!;
    setCompletedLevels(prev => {
      const next = new Set(prev);
      next.add(lvl);
      return next;
    });
    // Advance currentLevel so the next node on the map is unlocked immediately
    setCurrentLevel(c => (c <= lvl ? lvl + 1 : c));
    setPhase("map");
    setSelectedLevel(null);
  }

  const qs    = selectedLevel ? getLevelQuestions(selectedLevel) : [];
  const q     = qs[qIdx];
  const cat   = q ? (CAT[q.category] ?? { label: q.category, color: "#d4af37", emoji: "📖" }) : null;
  const stage = selectedLevel ? Math.ceil(selectedLevel / 5) : 0;

  const isReady = !loading && serverLevelLoaded;

  if (!isReady) {
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
    <div className="flex flex-col h-full"
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
          <h1 className="font-arabic font-bold text-[#d4af37] text-lg leading-tight">ادعم واربح طريق النحل 🐝</h1>
          <p className="font-arabic text-white/35 text-xs">
            {totalLevels} مستوى · {kb?.totalQuestions ?? 0} سؤال · المستوى الحالي: {currentLevel}
          </p>
        </div>
        {totalPoints > 0 && (
          <div className="flex items-center gap-1 rounded-full px-3 py-1"
            style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.4)" }}>
            <Star className="w-3.5 h-3.5 text-[#d4af37]" fill="#d4af37" />
            <span className="font-mono text-[#d4af37] text-sm font-bold">{totalPoints}</span>
          </div>
        )}
      </div>

      {/* ── Fixed info panel — visible only on map, never scrolls away ── */}
      {phase === "map" && (
        <div className="px-4 pt-4 pb-3 text-center flex-shrink-0"
          dir="rtl"
          style={{ borderBottom: "1px solid rgba(212,175,55,0.10)" }}>
          <motion.div className="text-4xl mb-2"
            animate={{ rotate: [0, -6, 6, -4, 4, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}>🧠</motion.div>
          <p className="font-arabic text-[#d4af37] font-bold text-lg mb-0.5">خريطة الرحلة</p>
          <p className="font-arabic text-white/40 text-xs mb-1">
            كل مستوى = إعلان + {POINTS_PER_LEVEL} نقاط ولاء
          </p>
          <p className="font-arabic text-white/25 text-[11px] mb-3">
            مكتمل: {completedLevels.size} / {totalLevels} مستوى
          </p>
          {/* Category legend */}
          <div className="flex flex-wrap justify-center gap-1.5 mb-1.5">
            {Object.values(kb?.categories ?? {}).map(c => (
              <span key={c.label} className="font-arabic text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: `${c.color}18`, border: `1px solid ${c.color}45`, color: c.color }}>
                {c.emoji} {c.label}
              </span>
            ))}
          </div>
          <div className="flex justify-center gap-2">
            {[["↔","ترتيب","#d4af37"],["📝","ملء فراغ","#60a5fa"],["✅","اختيار","#34d399"]].map(([ic,lb,cl]) => (
              <span key={String(lb)} className="font-arabic text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: `${cl}12`, border: `1px solid ${cl}30`, color: String(cl) }}>
                {ic} {lb}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>

          {/* ── MAP VIEW — only the scrollable level nodes ── */}
          {phase === "map" && (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }}>
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

              {q.category === "nahjBalagha" && (
                <div className="flex justify-end" dir="rtl">
                  <span className="font-arabic text-[10px] leading-relaxed text-[#d4af37]/50 text-right">
                    من كلام أمير المؤمنين علي بن أبي طالب كرم الله وجهه
                  </span>
                </div>
              )}

              <div className="flex justify-center">
                <span className="font-arabic text-xs px-3 py-1 rounded-full font-bold"
                  style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", color: "rgba(212,175,55,0.7)" }}>
                  {q.type === "sort" ? "↔ رتّب الكلمات" : q.type === "fill" ? "📝 أكمل الجملة" : "✅ اختر الإجابة"}
                </span>
              </div>

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

          {/* ── BONUS AD (optional, between non-stage levels) ── */}
          {phase === "bonus" && (
            <motion.div key="bonus" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} className="overflow-y-auto">
              <BonusAdScreen
                level={selectedLevel!}
                onWatch={handleBonusAdWatch}
                onSkip={handleBonusSkip}
                adPhase={bonusAd.phase}
              />
            </motion.div>
          )}

          {/* ── STAGE GATE (mandatory, every 5 levels) ── */}
          {phase === "stage" && (
            <motion.div key="stage" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}>
              <StageGate stage={stage} score={score} total={qs.length}
                onWatch={handleStageAdWatch} adPhase={stageAd.phase} adError={adError} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
