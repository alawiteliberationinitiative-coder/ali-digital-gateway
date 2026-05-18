import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Tv } from "lucide-react";
import { useTelegram } from "../../lib/telegram";
import { apiFetch } from "../../lib/api";

// ── Quiz sounds (Web Audio API — no external files needed) ────────────────────
function playCorrectSound() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    // arpeggio: do–mi–sol ascending chime
    [[523.25, 0], [659.25, 0.12], [783.99, 0.24]].forEach(([freq, delay]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + delay);
      gain.gain.setValueAtTime(0, t + delay);
      gain.gain.linearRampToValueAtTime(0.28, t + delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.45);
      osc.start(t + delay);
      osc.stop(t + delay + 0.5);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch { /* silent if audio blocked */ }
}

function playWrongSound() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    // two descending buzzes
    [[220, 0], [180, 0.18]].forEach(([freq, delay]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, t + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + delay + 0.22);
      gain.gain.setValueAtTime(0, t + delay);
      gain.gain.linearRampToValueAtTime(0.22, t + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.28);
      osc.start(t + delay);
      osc.stop(t + delay + 0.32);
    });
    setTimeout(() => ctx.close(), 900);
  } catch { /* silent if audio blocked */ }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuizState {
  stage:         number;
  tierName:      string;
  tierIcon:      string;
  tierColor:     string;
  tierIndex:     number;
  stageInTier:   number;
  correctCount:  number;
  totalCorrect:  number;
  totalAnswered: number;
  accuracyScore: number;
  loyaltyPoints: number;
}

interface QuizQuestion {
  id:           number;
  type:         "mc" | "fill" | "arrange";
  q:            string;
  options?:     string[];
  words?:       string[];
  pts:          number;
  source:       string;
  correctCount: number;
  totalInStage: number;
}

interface AnswerResult {
  correct:             boolean;
  correctAnswer:       string;
  explain?:            string;
  pts:                 number;
  correctCount:        number;
  stageComplete:       boolean;
  tierAdvanced:        boolean;
  newStage?:           number;
  loyaltyPointsAwarded: number;
  tierName:            string;
  tierIcon:            string;
  tierColor:           string;
}

type GameState = "loading" | "map" | "question" | "feedback" | "stage-done" | "setup-error";

// ── Animations ────────────────────────────────────────────────────────────────

const fadeUp = {
  initial:    { opacity: 0, y: 20 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -20 },
  transition: { duration: 0.28 },
};

// ── 3-D glass shield badge ────────────────────────────────────────────────────

function TierShield({ name, color, small = false }: {
  name: string; color: string; small?: boolean;
}) {
  const px  = small ? 28 : 48;
  const py  = Math.round(px * 1.14);
  const uid = `ts${color.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <div className="flex flex-col items-center" style={{ gap: small ? 2 : 4 }}>
      <svg width={px} height={py} viewBox="0 0 100 114" xmlns="http://www.w3.org/2000/svg"
        style={{ filter: `drop-shadow(0 ${small ? 2 : 4}px ${small ? 8 : 14}px ${color}88)` }}>
        <defs>
          {/* Vertical metallic gradient: bright top → mid → dark bottom */}
          <linearGradient id={`${uid}a`} x1="0.25" y1="0" x2="0.75" y2="1">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.42)" />
            <stop offset="40%"  stopColor="rgba(255,255,255,0.04)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
          </linearGradient>
          {/* Left-to-right bevel */}
          <linearGradient id={`${uid}b`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.18)" />
            <stop offset="55%"  stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
          </linearGradient>
        </defs>

        {/* ── Base shield (tier colour) ── */}
        <path d="M50 5 L92 20 L92 60 Q92 90 50 109 Q8 90 8 60 L8 20 Z"
              fill={color} />

        {/* ── Vertical sheen overlay ── */}
        <path d="M50 5 L92 20 L92 60 Q92 90 50 109 Q8 90 8 60 L8 20 Z"
              fill={`url(#${uid}a)`} />

        {/* ── Left–right bevel ── */}
        <path d="M50 5 L92 20 L92 60 Q92 90 50 109 Q8 90 8 60 L8 20 Z"
              fill={`url(#${uid}b)`} />

        {/* ── Top banner highlight ── */}
        <path d="M50 5 L92 20 L90 28 L50 14 L10 28 L8 20 Z"
              fill="rgba(255,255,255,0.45)" />

        {/* ── Left-side softer glow ── */}
        <path d="M50 14 L10 28 L8 60 Q8 90 50 109 L50 96 Q14 82 14 60 L14 31 Z"
              fill="rgba(255,255,255,0.07)" />

        {/* ── Glass lens shine (upper-left) ── */}
        <ellipse cx="33" cy="44" rx="12" ry="17"
                 fill="rgba(255,255,255,0.17)"
                 transform="rotate(-14 33 44)" />

        {/* ── Tiny top-left sparkle ── */}
        <ellipse cx="27" cy="22" rx="6" ry="4"
                 fill="rgba(255,255,255,0.38)"
                 transform="rotate(-22 27 22)" />

        {/* ── Inner engraved border ── */}
        <path d="M50 11 L87 25 L87 60 Q87 86 50 103 Q13 86 13 60 L13 25 Z"
              fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="1.5" />
      </svg>

      {/* ── Tier name label below shield ── */}
      <span className="font-arabic font-black leading-tight text-center"
            style={{
              color,
              fontSize: small ? 10 : 13,
              textShadow: `0 0 8px ${color}70`,
              letterSpacing: "0.02em",
            }}>
        {name}
      </span>
    </div>
  );
}

// ── Progress hearts ───────────────────────────────────────────────────────────

function ProgressHearts({ count, total = 5 }: { count: number; total?: number }) {
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: total }).map((_, i) => (
        <motion.span key={i}
          initial={i < count ? { scale: 1.4 } : { scale: 1 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.05, type: "spring", stiffness: 300 }}
          className={`text-lg ${i < count ? "" : "opacity-20"}`}
          style={{ filter: i < count ? "drop-shadow(0 0 4px #d4af37)" : "none" }}>
          {i < count ? "⭐" : "☆"}
        </motion.span>
      ))}
    </div>
  );
}

// ── Stage Ad Screen (شاشة الإعلان بين المراحل) ───────────────────────────────

function StageAdScreen({ stage, tierName, tierIcon, tierColor, loyaltyPoints, onDone }: {
  stage:         number;
  tierName:      string;
  tierIcon:      string;
  tierColor:     string;
  loyaltyPoints: number;
  onDone:        () => void;
}) {
  const [phase, setPhase]       = useState<"countdown" | "ad" | "done">("countdown");
  const [secs, setSecs]         = useState(3);
  const [skipSecs, setSkipSecs] = useState(10);
  const doneRef                 = useRef(false);
  const launchedRef             = useRef(false);

  const advance = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase("done");
    onDone();
  }, [onDone]);

  useEffect(() => {
    if (phase !== "countdown" || secs <= 0) return;
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, secs]);

  useEffect(() => {
    if (phase !== "countdown" || secs !== 0 || launchedRef.current) return;
    launchedRef.current = true;
    setPhase("ad");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adFn = (window as any).show_11001376;
    if (typeof adFn === "function") {
      try { Promise.resolve(adFn()).then(advance).catch(advance); } catch { advance(); }
    } else {
      setTimeout(advance, 2_000);
    }
  }, [phase, secs, advance]);

  useEffect(() => {
    if (phase !== "ad") return;
    const t = setTimeout(advance, 14_000);
    return () => clearTimeout(t);
  }, [phase, advance]);

  useEffect(() => {
    if (phase !== "ad" || skipSecs <= 0) return;
    const t = setTimeout(() => setSkipSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, skipSecs]);

  return (
    <motion.div key="stage-done"
      initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.35 }}
      className="flex flex-col items-center justify-center h-full gap-6 px-5 text-center"
      style={{ background: "linear-gradient(180deg,#060d1a 0%,#001a0f 100%)" }}>

      {/* Tier shield */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}>
        <TierShield name={tierName} color={tierColor} />
      </motion.div>

      {/* Big icon */}
      <motion.div className="w-28 h-28 rounded-full flex items-center justify-center relative"
        style={{ background: "linear-gradient(135deg,#002b1b,#004a2a)", border: "3px solid #d4af37", boxShadow: "0 0 50px rgba(212,175,55,0.4)" }}>
        <AnimatePresence mode="wait">
          {phase === "countdown" && (
            <motion.span key="secs" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
              className="font-mono font-black text-[#d4af37] text-4xl">{secs}</motion.span>
          )}
          {phase === "ad" && (
            <motion.div key="tv" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
              <Tv className="w-12 h-12 text-[#d4af37]" />
            </motion.div>
          )}
          {phase === "done" && (
            <motion.span key="done" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl">🏆</motion.span>
          )}
        </AnimatePresence>
        <motion.div className="absolute inset-0 rounded-full" style={{ border: "2px solid rgba(212,175,55,0.25)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} />
      </motion.div>

      {/* Text */}
      <div className="space-y-1">
        <motion.p key={phase} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="font-arabic font-black text-2xl" style={{ color: "#d4af37" }}>
          {phase === "countdown" && `🎉 أنجزت المرحلة ${stage}!`}
          {phase === "ad"        && "يُعرض الإعلان"}
          {phase === "done"      && "ممتاز! الانتقال..."}
        </motion.p>
        {phase === "countdown" && loyaltyPoints > 0 && (
          <p className="font-arabic text-sm" style={{ color: "#22c55e" }}>
            +{loyaltyPoints} نقطة ولاء 💚
          </p>
        )}
        {phase === "ad" && (
          <p className="font-arabic text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>مشاهدتك تدعم المبادرة</p>
        )}
      </div>

      {/* Ad warning */}
      {phase === "ad" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="w-full rounded-2xl px-4 py-3 space-y-1"
          style={{ background: "rgba(0,43,27,0.7)", border: "1px solid rgba(212,175,55,0.3)" }}>
          {["هذا الإعلان لا يمثّل توجهات المبادرة.","لا تنقر على الشاشة حتى لا تنتقل لروابط خارجية.","أغلقه فقط عند انتهاء العداد."].map((line, i) => (
            <p key={i} className="font-arabic text-xs flex gap-2 items-start text-right" style={{ color: "rgba(255,255,255,0.7)" }}>
              <span className="text-[#d4af37] flex-shrink-0">◈</span>{line}
            </p>
          ))}
        </motion.div>
      )}

      {phase === "ad" && (
        <motion.div className="w-7 h-7 border-[3px] border-[#d4af37] border-t-transparent rounded-full"
          animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.85, ease: "linear" }} />
      )}

      {phase === "ad" && skipSecs <= 0 && (
        <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          onClick={advance}
          className="font-arabic text-sm px-6 py-2.5 rounded-full border active:scale-95 transition-transform"
          style={{ borderColor: "rgba(212,175,55,0.4)", color: "rgba(212,175,55,0.8)", background: "rgba(212,175,55,0.08)" }}>
          تخطى ←
        </motion.button>
      )}
      {phase === "ad" && skipSecs > 0 && (
        <p className="font-arabic text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>يمكنك التخطي بعد {skipSecs}ث</p>
      )}
    </motion.div>
  );
}

// ── Map Screen (خريطة المستوى) ────────────────────────────────────────────────

function MapScreen({ state, onStart }: { state: QuizState | null; onStart: () => void }) {
  if (!state) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div {...fadeUp} className="flex flex-col gap-4 px-4 py-5 overflow-y-auto h-full" dir="rtl">

      {/* ── 1. زر العب الآن (أعلى الواجهة) ── */}
      <motion.button
        whileTap={{ scale: 0.97, y: 2 }}
        onClick={onStart}
        className="w-full rounded-2xl font-arabic font-black text-xl text-black relative overflow-hidden"
        style={{
          padding: "16px 0",
          background: "linear-gradient(135deg,#d4af37 0%,#f0c040 50%,#d4af37 100%)",
          boxShadow: "0 6px 28px rgba(212,175,55,0.5), inset 0 1px 0 rgba(255,255,255,0.4)",
        }}>
        <span className="relative z-10">العب الآن ◀</span>
        {/* shimmer sweep */}
        <motion.div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.35) 50%, transparent 80%)" }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "linear", repeatDelay: 1.2 }} />
      </motion.button>

      {/* ── 2. تبويب المستوى ── */}
      <div className="w-full rounded-2xl overflow-hidden"
        style={{ border: `1.5px solid ${state.tierColor}55`, background: `linear-gradient(135deg, ${state.tierColor}12, rgba(0,0,0,0.3))` }}>

        <div className="flex items-center gap-4 px-4 py-3">
          <motion.div className="flex-shrink-0"
            animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
            <TierShield name={state.tierName} color={state.tierColor} />
          </motion.div>
          <div className="flex-1 text-right">
            <p className="font-arabic text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
              المرحلة {state.stage} · {state.stageInTier}/5 مراحل في الرتبة
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. تقدم المرحلة ── */}
      <div className="w-full rounded-2xl p-4 flex flex-col gap-3"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between">
          <p className="font-arabic text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>تقدّم المرحلة الحالية</p>
          <p className="font-arabic text-sm font-bold" style={{ color: "#d4af37" }}>{state.correctCount}/5 صحيح</p>
        </div>
        <ProgressHearts count={state.correctCount} total={5} />
      </div>

      {/* ── 4. إحصائيات ── */}
      <div className="w-full grid grid-cols-2 gap-3">
        {[
          { label: "نقاط الولاء",       display: state.loyaltyPoints.toLocaleString(),                                                                              icon: "💚" },
          { label: "نسبة الدقة",        display: (state.totalAnswered > 0 ? Math.round(state.totalCorrect / state.totalAnswered * 100) : 0).toString() + "%",        icon: "🎯" },
          { label: "الإجابات الصحيحة", display: state.totalCorrect.toLocaleString(),                                                                               icon: "✅" },
          { label: "الإجابات",          display: state.totalAnswered.toLocaleString(),                                                                               icon: "📝" },
        ].map(({ label, display, icon }) => (
          <div key={label} className="rounded-2xl p-3 flex flex-col gap-1"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="font-arabic text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{icon} {label}</p>
            <p className="font-arabic font-black text-xl" style={{ color: "#d4af37" }}>{display}</p>
          </div>
        ))}
      </div>

    </motion.div>
  );
}

// ── Question renderers ────────────────────────────────────────────────────────

function McFillRenderer({ question, onAnswer, submitting }: {
  question:   QuizQuestion;
  onAnswer:   (idx: number) => void;
  submitting: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {(question.options ?? []).map((opt, i) => (
        <motion.button key={i}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
          whileTap={{ scale: 0.98 }}
          disabled={submitting}
          onClick={() => onAnswer(i)}
          className="w-full p-4 rounded-2xl text-right font-arabic text-base leading-relaxed active:scale-[0.98] transition-all disabled:opacity-60"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(212,175,55,0.25)", color: "rgba(255,255,255,0.9)" }}>
          <span className="font-bold text-[#d4af37] ml-2">{["أ","ب","ج","د"][i]})</span>
          {opt}
        </motion.button>
      ))}
    </div>
  );
}

function ArrangeRenderer({ question, onAnswer, submitting }: {
  question:   QuizQuestion;
  onAnswer:   (joined: string) => void;
  submitting: boolean;
}) {
  const [selected,  setSelected]  = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>(() => question.words ?? []);

  useEffect(() => {
    setSelected([]);
    setAvailable(question.words ?? []);
  }, [question.id, question.words]);

  function addWord(idx: number) {
    const word = available[idx];
    setSelected(p => [...p, word]);
    setAvailable(p => p.filter((_, i) => i !== idx));
  }

  function removeWord(idx: number) {
    const word = selected[idx];
    setSelected(p => p.filter((_, i) => i !== idx));
    setAvailable(p => [...p, word]);
  }

  const allPlaced = available.length === 0;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Builder area */}
      <div className="min-h-[70px] rounded-2xl p-3 flex flex-wrap gap-2 items-start content-start"
        style={{ background: "rgba(212,175,55,0.06)", border: "1px dashed rgba(212,175,55,0.35)" }}>
        {selected.length === 0 && (
          <p className="font-arabic text-sm w-full text-center my-2" style={{ color: "rgba(255,255,255,0.25)" }}>
            اضغط الكلمات لبناء الجملة
          </p>
        )}
        <AnimatePresence>
          {selected.map((word, i) => (
            <motion.button key={`${word}-${i}`}
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => removeWord(i)}
              className="px-3 py-1.5 rounded-xl font-arabic text-sm font-bold"
              style={{ background: "rgba(212,175,55,0.2)", border: "1px solid rgba(212,175,55,0.5)", color: "#d4af37" }}>
              {word}
              <span className="mr-1 text-[10px] opacity-50">✕</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Available chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        <AnimatePresence>
          {available.map((word, i) => (
            <motion.button key={`avail-${word}-${i}`}
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => addWord(i)}
              disabled={submitting}
              className="px-3 py-2 rounded-xl font-arabic text-sm font-bold disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.9)" }}>
              {word}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Submit button */}
      <motion.button
        animate={{ opacity: allPlaced ? 1 : 0.35 }}
        whileTap={{ scale: 0.97 }}
        disabled={!allPlaced || submitting}
        onClick={() => onAnswer(selected.join(" "))}
        className="w-full py-3.5 rounded-2xl font-arabic font-black text-base text-black disabled:cursor-not-allowed"
        style={{ background: allPlaced ? "linear-gradient(135deg,#d4af37,#f0c040)" : "rgba(212,175,55,0.3)" }}>
        {submitting ? "جاري التحقق..." : allPlaced ? "تأكيد الترتيب ✓" : "رتّب جميع الكلمات أولاً"}
      </motion.button>
    </div>
  );
}

// ── Question Screen ───────────────────────────────────────────────────────────

function QuestionScreen({ state, question, onAnswer, submitting, onBack }: {
  state:      QuizState | null;
  question:   QuizQuestion;
  onAnswer:   (ans: number | string) => void;
  submitting: boolean;
  onBack:     () => void;
}) {
  const correctCount = state?.correctCount ?? question.correctCount ?? 0;
  const tierColor    = state?.tierColor ?? "#d4af37";

  return (
    <motion.div {...fadeUp} className="flex flex-col h-full" dir="rtl">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(6,13,26,0.98)" }}>
        <button onClick={onBack}
          className="p-2 rounded-xl active:scale-95 transition-transform"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronRight className="w-5 h-5" style={{ color: "rgba(255,255,255,0.7)" }} />
        </button>
        <div className="flex-1 flex items-center justify-between">
          {state && <TierShield name={state.tierName} color={tierColor} small />}
          <ProgressHearts count={correctCount} total={5} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5" style={{ background: "rgba(255,255,255,0.05)" }}>
        <motion.div className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${tierColor}, #22c55e)` }}
          initial={{ width: 0 }}
          animate={{ width: `${(correctCount / 5) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* Stage info */}
        <p className="font-arabic text-xs text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
          المرحلة {state?.stage ?? "—"} • أجب صحيحاً على 5 أسئلة للتقدم
        </p>

        {/* Question card */}
        <motion.div key={question.id}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.18)" }}>

          {/* Type badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="font-arabic text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(212,175,55,0.12)", color: "rgba(212,175,55,0.7)", border: "1px solid rgba(212,175,55,0.2)" }}>
              {question.type === "fill" ? "أكمل الجملة" : question.type === "arrange" ? "رتّب الكلمات" : "اختر الجواب"}
            </span>
            <span className="font-arabic text-xs ml-auto" style={{ color: "rgba(212,175,55,0.5)" }}>+{question.pts} نقطة</span>
          </div>

          {/* Question text */}
          <p className="font-arabic text-lg font-bold leading-relaxed text-right"
            style={{ color: "rgba(255,255,255,0.95)", direction: "rtl" }}>
            {question.q}
          </p>
        </motion.div>

        {/* Answer area */}
        <AnimatePresence mode="wait">
          <motion.div key={question.id}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {question.type === "arrange" ? (
              <ArrangeRenderer question={question} onAnswer={onAnswer} submitting={submitting} />
            ) : (
              <McFillRenderer question={question} onAnswer={onAnswer as (i: number) => void} submitting={submitting} />
            )}
          </motion.div>
        </AnimatePresence>

        {submitting && (
          <div className="flex justify-center py-2">
            <motion.div className="w-6 h-6 border-[3px] border-[#d4af37] border-t-transparent rounded-full"
              animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Feedback Screen ───────────────────────────────────────────────────────────

function FeedbackScreen({ question, result, onContinue }: {
  question:   QuizQuestion | null;
  result:     AnswerResult;
  onContinue: () => void;
}) {
  return (
    <motion.div {...fadeUp} className="flex flex-col items-center justify-center h-full gap-5 px-5" dir="rtl">

      {/* Big result icon */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
        style={{
          background: result.correct ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          border: `3px solid ${result.correct ? "#22c55e" : "#ef4444"}`,
          boxShadow: `0 0 40px ${result.correct ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
        }}>
        {result.correct ? "✓" : "✗"}
      </motion.div>

      {/* Result label */}
      <div className="text-center space-y-1">
        <p className="font-arabic font-black text-2xl"
          style={{ color: result.correct ? "#22c55e" : "#ef4444" }}>
          {result.correct ? "إجابة صحيحة!" : "إجابة خاطئة"}
        </p>
        {result.correct && result.pts > 0 && (
          <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="font-arabic text-sm" style={{ color: "#d4af37" }}>
            +{result.pts} نقطة ⭐
          </motion.p>
        )}
      </div>

      {/* Correct answer (shown when wrong) */}
      {!result.correct && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="w-full rounded-2xl p-4"
          style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <p className="font-arabic text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>الجواب الصحيح:</p>
          <p className="font-arabic font-bold text-sm" style={{ color: "#f87171" }}>{result.correctAnswer}</p>
        </motion.div>
      )}

      {/* Explanation */}
      {result.explain && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="w-full rounded-2xl p-4"
          style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)" }}>
          <p className="font-arabic text-xs mb-1" style={{ color: "rgba(212,175,55,0.5)" }}>💡 تفسير</p>
          <p className="font-arabic text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            {result.explain}
          </p>
        </motion.div>
      )}

      {/* Stage complete banner */}
      {result.stageComplete && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}
          className="w-full rounded-2xl p-4 text-center"
          style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.05))", border: "1px solid rgba(212,175,55,0.4)" }}>
          <p className="font-arabic font-black text-lg" style={{ color: "#d4af37" }}>🎉 أتممت المرحلة!</p>
          {result.loyaltyPointsAwarded > 0 && (
            <p className="font-arabic text-sm mt-1" style={{ color: "#22c55e" }}>+{result.loyaltyPointsAwarded} نقطة ولاء</p>
          )}
          {result.tierAdvanced && (
            <div className="flex flex-col items-center gap-1 mt-2">
              <TierShield name={result.tierName} color={result.tierColor} />
              <p className="font-arabic text-sm" style={{ color: result.tierColor }}>
                ارتقيت لهذه الرتبة!
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Continue button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        whileTap={{ scale: 0.97 }}
        onClick={onContinue}
        className="w-full py-4 rounded-2xl font-arabic font-black text-base text-black"
        style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)" }}>
        {result.stageComplete ? "الاحتفال 🎊" : "السؤال التالي ←"}
      </motion.button>

      {/* Question count indicator */}
      {!result.stageComplete && (
        <p className="font-arabic text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
          {result.correctCount}/5 إجابة صحيحة
        </p>
      )}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PlaySection({ onBack }: { onBack: () => void }) {
  const { user }   = useTelegram();
  const telegramId = user?.id?.toString() ?? "";

  const [gameState,    setGameState]   = useState<GameState>("loading");
  const [quizState,    setQuizState]   = useState<QuizState | null>(null);
  const [question,     setQuestion]    = useState<QuizQuestion | null>(null);
  const [answerResult, setAnswerResult]= useState<AnswerResult | null>(null);
  const [submitting,   setSubmitting]  = useState(false);
  const [error,        setError]       = useState<string | null>(null);

  // ── Safe fetch helper — throws on non-2xx ───────────────────────────────
  async function safeFetch<T>(url: string, init?: RequestInit): Promise<T> {
    const r = await apiFetch(url, init as Parameters<typeof apiFetch>[1]);
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({})) as { error?: string };
      throw new Error(errBody.error ?? `HTTP ${r.status}`);
    }
    return r.json() as Promise<T>;
  }

  // ── Load initial data ────────────────────────────────────────────────────
  useEffect(() => {
    if (!telegramId) return;
    let cancelled = false;

    Promise.all([
      safeFetch<QuizState>("/api/quiz/state"),
      safeFetch<QuizQuestion>("/api/quiz/question"),
    ])
      .then(([s, q]) => {
        if (cancelled) return;
        setQuizState(s);
        setQuestion(q);
        setGameState("map");
      })
      .catch((err: Error) => {
        if (cancelled) return;
        const msg = err?.message ?? "";
        if (msg.includes("quiz_progress") || msg.includes("relation") || msg.includes("does not exist")) {
          setError("setup");
        } else {
          setError(msg || "تعذّر الاتصال بالخادم");
        }
        setGameState("setup-error");
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telegramId]);

  // ── Load next question (after answer or stage done) ──────────────────────
  async function loadNextQuestion() {
    setError(null);
    try {
      const [s, q] = await Promise.all([
        safeFetch<QuizState>("/api/quiz/state"),
        safeFetch<QuizQuestion>("/api/quiz/question"),
      ]);
      setQuizState(s);
      setQuestion(q);
      setAnswerResult(null);
      setGameState("question");
    } catch (err) {
      setError((err as Error)?.message || "تعذّر تحميل السؤال");
    }
  }

  // ── Submit answer ────────────────────────────────────────────────────────
  async function handleAnswer(answer: number | string) {
    if (!question || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await safeFetch<AnswerResult>("/api/quiz/answer", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ questionId: question.id, answer }),
      });
      if (result.correct) playCorrectSound();
      else playWrongSound();
      setAnswerResult(result);
      setGameState("feedback");
    } catch (err) {
      setError((err as Error)?.message || "حدث خطأ. حاول مجدداً.");
    }
    setSubmitting(false);
  }

  // ── After feedback ───────────────────────────────────────────────────────
  function handleFeedbackContinue() {
    if (answerResult?.stageComplete) {
      setGameState("stage-done");
    } else {
      loadNextQuestion();
    }
  }

  // ── After stage done (ad completed) ─────────────────────────────────────
  const handleStageDone = useCallback(() => {
    loadNextQuestion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  if (gameState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <motion.div className="w-10 h-10 border-4 border-[#d4af37] border-t-transparent rounded-full"
          animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} />
        <p className="font-arabic text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>جاري التحميل...</p>
      </div>
    );
  }

  if (gameState === "setup-error") {
    const isSetup = error === "setup";
    return (
      <motion.div {...fadeUp} className="flex flex-col items-center justify-center h-full gap-5 px-5 text-center" dir="rtl">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
          style={{ background: "rgba(239,68,68,0.1)", border: "2px solid rgba(239,68,68,0.3)" }}>
          {isSetup ? "🔧" : "⚠️"}
        </div>
        <div className="space-y-2">
          <h3 className="font-arabic font-black text-xl" style={{ color: "#f87171" }}>
            {isSetup ? "النظام قيد الإعداد" : "تعذّر تحميل المسابقة"}
          </h3>
          <p className="font-arabic text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            {isSetup
              ? "قاعدة بيانات المسابقة لم تُهيَّأ بعد. يرجى التواصل مع المسؤول."
              : (error ?? "حدث خطأ غير متوقع. حاول مجدداً.")}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            setGameState("loading");
            setError(null);
            Promise.all([
              safeFetch<QuizState>("/api/quiz/state"),
              safeFetch<QuizQuestion>("/api/quiz/question"),
            ]).then(([s, q]) => {
              setQuizState(s); setQuestion(q); setGameState("map");
            }).catch((err: Error) => {
              setError(err?.message || "تعذّر الاتصال");
              setGameState("setup-error");
            });
          }}
          className="px-8 py-3 rounded-2xl font-arabic font-bold text-sm"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
          إعادة المحاولة ↺
        </motion.button>
        <button onClick={onBack}
          className="font-arabic text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          رجوع
        </button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full" dir="rtl">

      {/* Header (shown outside question/stage-done screens) */}
      {gameState !== "question" && gameState !== "stage-done" && (
        <div className="sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(6,13,26,0.98)", backdropFilter: "blur(10px)" }}>
          <button onClick={onBack}
            className="p-2 rounded-xl active:scale-95 transition-transform"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <ChevronRight className="w-5 h-5" style={{ color: "rgba(255,255,255,0.7)" }} />
          </button>
          <div className="flex-1">
            <h2 className="font-arabic font-black text-base" style={{ color: "#d4af37" }}>طريق النحل</h2>
            {quizState && (
              <p className="font-arabic text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                المرحلة {quizState.stage} · {quizState.tierName}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="mx-4 mt-2 rounded-xl p-3 text-center"
          style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <p className="font-arabic text-sm" style={{ color: "#f87171" }}>{error}</p>
        </div>
      )}

      {/* Screen */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {gameState === "map" && (
            <motion.div key="map" className="h-full" {...fadeUp}>
              <MapScreen state={quizState} onStart={() => {
                if (question) setGameState("question");
                else loadNextQuestion();
              }} />
            </motion.div>
          )}

          {gameState === "question" && question && (
            <motion.div key={`q-${question.id}`} className="h-full" {...fadeUp}>
              <QuestionScreen
                state={quizState}
                question={question}
                onAnswer={handleAnswer}
                submitting={submitting}
                onBack={() => setGameState("map")}
              />
            </motion.div>
          )}

          {gameState === "feedback" && answerResult && (
            <motion.div key="feedback" className="h-full" {...fadeUp}>
              <FeedbackScreen
                question={question}
                result={answerResult}
                onContinue={handleFeedbackContinue}
              />
            </motion.div>
          )}

          {gameState === "stage-done" && answerResult && (
            <motion.div key="stage-done" className="h-full" {...fadeUp}>
              <StageAdScreen
                stage={answerResult.newStage ? answerResult.newStage - 1 : (quizState?.stage ?? 1)}
                tierName={answerResult.tierName}
                tierIcon={answerResult.tierIcon}
                tierColor={answerResult.tierColor}
                loyaltyPoints={answerResult.loyaltyPointsAwarded}
                onDone={handleStageDone}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
