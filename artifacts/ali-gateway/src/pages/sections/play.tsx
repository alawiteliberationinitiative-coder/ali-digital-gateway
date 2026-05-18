import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Zap, Star, Trophy, Tv, CheckCircle2 } from "lucide-react";
import { useTelegram } from "../../lib/telegram";
import { useRewardedAd } from "../../hooks/use-rewarded-ad";
import { apiFetch } from "../../lib/api";

const slide = {
  initial: { x: -40, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit:    { x: 40, opacity: 0 },
  transition: { duration: 0.25 },
};

interface Question {
  q:       string;
  options: string[];
  correct: number;
  pts:     number;
}

// ── 5 مراحل × 5 أسئلة ─────────────────────────────────────────────────────
const LEVELS: Question[][] = [
  [
    { q: "ماذا تعني ALI في اسم المبادرة؟", options: ["Alawite Liberation Initiative","Arab Leadership Institute","Advanced Liberty Index","Alliance Leaders Initiative"], correct: 0, pts: 50 },
    { q: "ما هو رمز عملة المبادرة الرقمية؟", options: ["$ALI","$ALE","$MDD","$TLV"], correct: 2, pts: 50 },
    { q: "ما اسم مشروع التوثيق السري في المبادرة؟", options: ["Sentinel","Bargylos","Nexus","Arcos"], correct: 1, pts: 75 },
    { q: "كم دولة تغطيها شبكة سفراء القضية؟", options: ["أكثر من ١٠","أكثر من ٢٠","أكثر من ٤٠","أكثر من ١٠٠"], correct: 2, pts: 50 },
    { q: "ما شعار المبادرة؟", options: ["نحو الحرية","حقٌّ لا يموت","الوحدة قوة","الأرض للأحرار"], correct: 1, pts: 100 },
  ],
  [
    { q: "ما الهدف الرئيسي لمبادرة ALI؟", options: ["تقديم خدمات مالية","توثيق انتهاكات حقوق الإنسان","تطوير تطبيقات ترفيهية","بيع العملات الرقمية"], correct: 1, pts: 50 },
    { q: "ما منصة التواصل الرسمية لمجتمع المبادرة؟", options: ["Discord","Telegram","WhatsApp","Signal"], correct: 1, pts: 50 },
    { q: "ما اسم نظام النقاط في المبادرة؟", options: ["نقاط المشاركة","نقاط الولاء","نقاط الإنجاز","نقاط الدعم"], correct: 1, pts: 75 },
    { q: "ما الغرض من عملة $MDD؟", options: ["المضاربة","دعم منظومة المبادرة الرقمية","الاستثمار العقاري","تمويل الأفلام"], correct: 1, pts: 50 },
    { q: "ما دور سفراء القضية؟", options: ["جمع التبرعات المالية","نشر الوعي وتوثيق الانتهاكات","إدارة الاستثمارات","تطوير التطبيق"], correct: 1, pts: 100 },
  ],
  [
    { q: "ما مشروع الأرشفة الرقمية في المبادرة؟", options: ["Bargylos","Arcos","Sentinel","Nexus"], correct: 0, pts: 60 },
    { q: "في أي منطقة جغرافية تركّز المبادرة جهودها الأساسية؟", options: ["أفريقيا","أمريكا اللاتينية","الشرق الأوسط وشمال أفريقيا","جنوب شرق آسيا"], correct: 2, pts: 60 },
    { q: "ما الذي يميز نقاط الولاء عن العملة الرقمية $MDD؟", options: ["نقاط الولاء قابلة للتداول","$MDD داخلية فقط","نقاط الولاء داخل التطبيق فقط","لا فرق بينهما"], correct: 2, pts: 75 },
    { q: "ما النظام الذي يعتمد عليه بوت المبادرة؟", options: ["WhatsApp API","Telegram Bot API","Facebook Messenger","Discord Bot"], correct: 1, pts: 60 },
    { q: "كيف يمكن للمستخدم رفع مستوى مشاركته؟", options: ["بدفع رسوم","بإنجاز التحديات والمراحل","بالتسجيل يومياً فقط","بمشاركة الإعلانات"], correct: 1, pts: 100 },
  ],
  [
    { q: "ما آلية التحقق من صحة الشهادات في المبادرة؟", options: ["الزمن الفعلي","التوثيق المتقاطع","التحكيم الخارجي","الذكاء الاصطناعي"], correct: 1, pts: 70 },
    { q: "ما مبدأ المبادرة في التعامل مع البيانات الحساسة؟", options: ["المركزية الكاملة","اللامركزية والتشفير","التخزين السحابي المفتوح","المشاركة العلنية الفورية"], correct: 1, pts: 70 },
    { q: "ما العلاقة بين مشاهدة الإعلانات ودعم المبادرة؟", options: ["لا علاقة","عائد الإعلانات يموّل المبادرة","الإعلانات دعاية خارجية فقط","تُستخدم لتحليل سلوك المستخدم"], correct: 1, pts: 75 },
    { q: "ما أبرز ميزة لنظام الإحالة في المبادرة؟", options: ["الحصول على جوائز مادية","نشر الشبكة وتوسيع المجتمع","زيادة عائد الإعلانات","تخفيض رسوم المعاملات"], correct: 1, pts: 70 },
    { q: "الفرق بين مرحلة الإطلاق والتوسع في خارطة الطريق؟", options: ["لا فرق","الإطلاق للتجربة، التوسع لاستقطاب مجتمعات أوسع","التوسع قبل الإطلاق","الإطلاق للمطورين فقط"], correct: 1, pts: 100 },
  ],
  [
    { q: "ما الرؤية بعيدة المدى لمبادرة ALI؟", options: ["بناء منصة ترفيه رقمية","أرشيف رقمي عالمي محمي ومنظومة حقوق متكاملة","إطلاق بورصة عملات رقمية","تأسيس شركة تقنية ربحية"], correct: 1, pts: 80 },
    { q: "ما الميزة التي يمنحها النظام لأصحاب المراحل المتقدمة؟", options: ["وصول مبكر لتحديثات المبادرة","خصم على الاشتراكات","صلاحيات إدارية كاملة","تحويل النقاط لأموال نقداً"], correct: 0, pts: 80 },
    { q: "لماذا تُعدّ اللامركزية ركيزة أساسية في المبادرة؟", options: ["لتجنب دفع الضرائب","لمنع سيطرة جهة واحدة على البيانات والقرار","لتسريع المعاملات","لتقليل تكاليف التشغيل"], correct: 1, pts: 80 },
    { q: "ما الالتزام الأخلاقي الأساسي لمستخدمي المبادرة؟", options: ["الصمت التام","عدم مشاركة أي معلومات","الأمانة في التوثيق وعدم نشر معلومات مضللة","دفع الاشتراك الشهري"], correct: 2, pts: 80 },
    { q: "كيف تُعزّز المبادرة حماية هوية الشهود والضحايا؟", options: ["بالإعلان عن أسمائهم","بنشر شهاداتهم مباشرةً","بالتشفير والأرشفة الآمنة","بالتحقق منهم ميدانياً فقط"], correct: 2, pts: 100 },
  ],
];

const MAX_LEVEL = LEVELS.length;

type GameState  = "loading" | "level-select" | "ready" | "playing" | "answered" | "ad-break" | "next-level" | "all-done";
type DoubleState = "idle" | "loading" | "done" | "error";

// ── شاشة الإعلان بين المراحل ─────────────────────────────────────────────
// onDone يجب أن يكون مرجعاً مستقراً (useCallback مع [] في المكوّن الأب)
function StageAdScreen({ score, levelNum, onDone }: {
  score:    number;
  levelNum: number;
  onDone:   () => void;
}) {
  const [phase,    setPhase]    = useState<"countdown" | "ad" | "done">("countdown");
  const [secs,     setSecs]     = useState(3);
  const [skipSecs, setSkipSecs] = useState(10);
  const doneRef    = useRef(false);
  const launchedRef = useRef(false);

  // الاستدعاء الآمن — يُنفَّذ مرة واحدة فقط مهما تعددت المسارات
  const advance = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase("done");
    // استدعاء فوري دون تأخير لمنع أي race condition
    onDone();
  }, [onDone]);

  // ── عداد تنازلي 3→0 ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "countdown" || secs <= 0) return;
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, secs]);

  // ── عندما يصل العداد لـ 0: أطلق الإعلان ─────────────────────────────
  useEffect(() => {
    if (phase !== "countdown" || secs !== 0 || launchedRef.current) return;
    launchedRef.current = true;
    setPhase("ad");

    // استدعاء مباشر لشبكة الإعلانات — لا نعتمد على hook خارجي
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adFn = (window as any).show_11001376;
    if (typeof adFn === "function") {
      try {
        Promise.resolve(adFn()).then(advance).catch(advance);
      } catch {
        advance();
      }
    } else {
      // بيئة تطوير: تأخير 2 ثانية كمحاكاة
      setTimeout(advance, 2_000);
    }
  }, [phase, secs, advance]);

  // ── مؤقت صلب: تقدّم تلقائياً بعد 14 ثانية من بدء الإعلان ──────────
  useEffect(() => {
    if (phase !== "ad") return;
    const t = setTimeout(advance, 14_000);
    return () => clearTimeout(t);
  }, [phase, advance]);

  // ── عداد زر التخطي ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "ad" || skipSecs <= 0) return;
    const t = setTimeout(() => setSkipSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, skipSecs]);

  const questions = LEVELS[Math.min(levelNum - 1, MAX_LEVEL - 1)];

  return (
    <motion.div
      key={`stage-ad-${levelNum}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center justify-center h-full gap-7 px-6 text-center"
      style={{ background: "linear-gradient(180deg,#060d1a 0%,#001a0f 100%)" }}>

      {/* أيقونة مركزية */}
      <motion.div
        animate={phase === "countdown" ? { scale: [1, 1.08, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.6 }}
        className="w-28 h-28 rounded-full flex items-center justify-center relative"
        style={{ background: "linear-gradient(135deg,#002b1b,#004a2a)", border: "3px solid #d4af37", boxShadow: "0 0 50px rgba(212,175,55,0.4)" }}>
        <AnimatePresence>
          {phase === "countdown" && (
            <motion.span key="secs"
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
              className="font-mono font-black text-[#d4af37] text-4xl">{secs}</motion.span>
          )}
          {phase === "ad" && (
            <motion.div key="tv"
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
              <Tv className="w-12 h-12 text-[#d4af37]" />
            </motion.div>
          )}
          {phase === "done" && (
            <motion.span key="check"
              initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-5xl">🏆</motion.span>
          )}
        </AnimatePresence>
        <motion.div className="absolute inset-0 rounded-full"
          style={{ border: "2px solid rgba(212,175,55,0.25)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }} />
      </motion.div>

      {/* النص */}
      <div className="space-y-2">
        <motion.p key={phase} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="font-arabic font-black text-2xl" style={{ color: "#d4af37" }}>
          {phase === "countdown" && `🎉 أنجزت المرحلة ${levelNum}!`}
          {phase === "ad"        && "يُعرض الإعلان"}
          {phase === "done"      && "ممتاز! الانتقال..."}
        </motion.p>
        <p className="font-arabic text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          {phase === "countdown" && `نقاطك: ${score} نقطة`}
          {phase === "ad"        && "مشاهدتك تدعم المبادرة 💚"}
        </p>
      </div>

      {/* نقاط المرحلة */}
      <div className="flex gap-2.5">
        {questions.map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full"
            style={{ backgroundColor: "#d4af37", boxShadow: "0 0 6px rgba(212,175,55,0.5)" }} />
        ))}
      </div>

      {/* تحذير الإعلان */}
      {phase === "ad" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="w-full rounded-2xl px-4 py-3 space-y-1"
          style={{ background: "rgba(0,43,27,0.7)", border: "1px solid rgba(212,175,55,0.3)" }}>
          {[
            "هذا الإعلان لا يمثّل توجهات المبادرة.",
            "لا تنقر على الشاشة حتى لا تنتقل لروابط خارجية.",
            "أغلقه فقط عند انتهاء العداد.",
          ].map((line, i) => (
            <p key={i} className="font-arabic text-xs flex gap-2 items-start text-right"
              style={{ color: "rgba(255,255,255,0.7)" }}>
              <span className="text-[#d4af37] flex-shrink-0">◈</span>{line}
            </p>
          ))}
        </motion.div>
      )}

      {phase === "ad" && (
        <motion.div className="w-7 h-7 border-[3px] border-[#d4af37] border-t-transparent rounded-full"
          animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.85, ease: "linear" }} />
      )}

      {/* زر التخطي بعد 10 ثوانٍ */}
      {phase === "ad" && skipSecs <= 0 && (
        <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          onClick={advance}
          className="font-arabic text-sm px-6 py-2.5 rounded-full border active:scale-95 transition-transform"
          style={{ borderColor: "rgba(212,175,55,0.4)", color: "rgba(212,175,55,0.8)", background: "rgba(212,175,55,0.08)" }}>
          تخطى ←
        </motion.button>
      )}
      {phase === "ad" && skipSecs > 0 && (
        <p className="font-arabic text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          يمكنك التخطي بعد {skipSecs}ث
        </p>
      )}

      {phase === "countdown" && (
        <p className="font-arabic text-xs text-muted-foreground/40">
          إعلان قصير قبل المرحلة التالية
        </p>
      )}
    </motion.div>
  );
}

// ── المكوّن الرئيسي ───────────────────────────────────────────────────────
export function PlaySection({ onBack }: { onBack: () => void }) {
  const { user }   = useTelegram();
  const telegramId = user?.id?.toString() ?? "";

  const [gameState,    setGameState]    = useState<GameState>("loading");
  const [playingLevel, setPlayingLevel] = useState(1);
  const [current,      setCurrent]      = useState(0);
  const [selected,     setSelected]     = useState<number | null>(null);
  const [score,        setScore]        = useState(0);
  const [streak,       setStreak]       = useState(0);
  const [doubleState,  setDoubleState]  = useState<DoubleState>("idle");
  const [doubledScore, setDoubledScore] = useState(0);

  const doubleAd = useRewardedAd(0, telegramId);

  // Challenge token for the inter-level ad-break reward.
  // Fetched when the game enters ad-break state and consumed by advanceLevel.
  const levelChallengeRef = useRef<string>("");

  // Quiz session token: obtained from /api/quiz/start-level when the user
  // presses "Start" and passed to /api/quiz/complete-level as server-side
  // proof that a quiz session was open before the reward is claimed.
  const quizChallengeRef = useRef<string>("");

  // ── Refs للوصول الآمن في callbacks بدون stale closure ──────────────────
  const playingLevelRef = useRef(1);
  const telegramIdRef   = useRef("");
  useEffect(() => { playingLevelRef.current = playingLevel; }, [playingLevel]);
  useEffect(() => { telegramIdRef.current   = telegramId;   }, [telegramId]);

  // ── تحميل مستوى المستخدم من الخادم ────────────────────────────────────
  useEffect(() => {
    if (!telegramId) return;
    apiFetch("/api/users/me")
      .then(r => r.ok ? r.json() : { level: 1 })
      .then((data: { level?: number }) => {
        const lvl = Math.min(data.level ?? 1, MAX_LEVEL);
        setPlayingLevel(lvl);
        setGameState("level-select");
      })
      .catch(() => {
        setPlayingLevel(1);
        setGameState("level-select");
      });
  }, [telegramId]);

  // ── انتقال تلقائي للعب بعد شاشة "المرحلة التالية" ─────────────────────
  // يطلب quiz token للمستوى الجديد قبل الانتقال لضمان عمل نظام المكافآت
  useEffect(() => {
    if (gameState !== "next-level") return;
    const t = setTimeout(() => {
      quizChallengeRef.current = "";
      apiFetch("/api/quiz/start-level", { method: "POST" })
        .then(r => r.ok ? r.json() as Promise<{ quizToken?: string }> : null)
        .then(data => { if (data?.quizToken) quizChallengeRef.current = data.quizToken; })
        .catch(() => {});
      setGameState("playing");
    }, 2_000);
    return () => clearTimeout(t);
  }, [gameState]);

  // ── Fetch a challenge token as soon as the ad-break begins ───────────────
  // This must happen *before* the ad is shown so the server can measure the
  // elapsed time between challenge issuance and reward claim.
  useEffect(() => {
    if (gameState !== "ad-break") return;
    levelChallengeRef.current = "";
    apiFetch("/api/ads/challenge", { method: "POST" })
      .then(r => r.ok ? r.json() as Promise<{ challengeToken?: string }> : null)
      .then(data => { if (data?.challengeToken) levelChallengeRef.current = data.challengeToken; })
      .catch(() => {});
  }, [gameState]);

  // ── ضمان صلب: إذا ظل في ad-break أكثر من 20 ثانية انتقل قسراً ────────
  // (يعمل كطبقة احتياط خلف المؤقت الداخلي في StageAdScreen)
  useEffect(() => {
    if (gameState !== "ad-break") return;
    const t = setTimeout(() => {
      setCurrent(0);
      setSelected(null);
      setScore(0);
      setStreak(0);
      setDoubleState("idle");
      setDoubledScore(0);
      setGameState("level-select");
    }, 20_000);
    return () => clearTimeout(t);
  }, [gameState]);

  // ── advanceLevel: مستقر تماماً (useCallback بـ [] فارغة) ─────────────
  // يقرأ القيم الحالية من الـ refs دائماً — لا stale closure
  const advanceLevel = useCallback(() => {
    const lvl   = playingLevelRef.current;
    const tid   = telegramIdRef.current;
    const token = levelChallengeRef.current;

    if (tid) {
      if (token) {
        apiFetch("/api/ads/reward", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ challengeToken: token }),
        }).catch(() => {});
        levelChallengeRef.current = ""; // consume the token
      }
      const quizToken = quizChallengeRef.current;
      quizChallengeRef.current = ""; // consume the quiz token
      apiFetch("/api/quiz/complete-level", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ levelCompleted: lvl, quizToken }),
      }).catch(() => {});
    }

    setCurrent(0);
    setSelected(null);
    setScore(0);
    setStreak(0);
    setDoubleState("idle");
    setDoubledScore(0);
    setGameState("level-select");
  }, []); // ← مقصودة: القيم تأتي من الـ refs

  const questions = LEVELS[Math.min(playingLevel - 1, MAX_LEVEL - 1)];
  const q         = questions[current];
  const isLast    = current === questions.length - 1;

  function startLevel(lvl: number) {
    setPlayingLevel(lvl);
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setStreak(0);
    setDoubleState("idle");
    setDoubledScore(0);
    quizChallengeRef.current = "";
    const tid = telegramIdRef.current;
    if (tid) {
      apiFetch("/api/quiz/start-level", { method: "POST" })
        .then(r => r.ok ? r.json() as Promise<{ quizToken?: string }> : null)
        .then(data => { if (data?.quizToken) quizChallengeRef.current = data.quizToken; })
        .catch(() => {});
    }
    setGameState("playing");
  }

  function handleStart() {
    startLevel(playingLevel);
  }

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
      setGameState("ad-break");
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setGameState("playing");
    }
  }

  async function handleDoublePoints() {
    if (doubleState !== "idle" || !score) return;
    setDoubleState("loading");
    const token = await doubleAd.show();
    if (token) {
      const doubled = score * 2;
      setDoubledScore(doubled);
      setScore(doubled);
      if (telegramId) {
        apiFetch("/api/ads/reward", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ challengeToken: token }),
        }).catch(() => {});
      }
      setDoubleState("done");
    } else {
      setDoubleState("error");
      setTimeout(() => setDoubleState("idle"), 2_500);
    }
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

      {/* ── الترويسة ── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack}
          className="p-2 rounded-xl bg-primary/10 text-primary active:scale-95 transition-transform">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-arabic font-bold text-primary text-lg leading-tight">طريق النحل 🐝</h1>
          <p className="font-arabic text-muted-foreground text-xs">
            {gameState === "loading"      ? "جاري التحميل..." :
             gameState === "level-select" ? "اختر مرحلتك 🗺️" :
             gameState === "all-done"     ? "أكملت المرحلة 🏆 — العودة للخريطة" :
             `المرحلة ${playingLevel} من ${MAX_LEVEL}`}
          </p>
        </div>
        {(gameState === "playing" || gameState === "answered") && (
          <div className="flex items-center gap-1 bg-[#d4af37]/15 border border-[#d4af37]/40 rounded-full px-3 py-1">
            <Star className="w-3.5 h-3.5 text-[#d4af37]" fill="#d4af37" />
            <span className="font-mono text-[#d4af37] text-sm font-bold">{score}</span>
          </div>
        )}
      </div>

      {/* ── الشاشات ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence>

          {/* تحميل */}
          {gameState === "loading" && (
            <motion.div key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full gap-4">
              <motion.div className="w-10 h-10 border-[3px] border-[#d4af37] border-t-transparent rounded-full"
                animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }} />
              <p className="font-arabic text-muted-foreground text-sm">جاري تحميل مرحلتك...</p>
            </motion.div>
          )}

          {/* ── خريطة المراحل — Duolingo Style ── */}
          {gameState === "level-select" && (
            <motion.div key="level-select"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>

              <div className="flex flex-col items-center pt-5 pb-24 px-4">

                <div className="mb-6 text-center">
                  <p className="font-arabic text-[#d4af37]/60 text-xs mb-1">اختر مرحلتك وابدأ التحدي</p>
                  <h2 className="font-arabic font-black text-2xl text-white">طريق النحل 🐝</h2>
                  <p className="font-arabic text-white/30 text-xs mt-1">جميع المراحل متاحة — يمكنك إعادة اللعب دائماً</p>
                </div>

                {LEVELS.map((qs, i) => {
                  const lvlNum = i + 1;
                  const isRight = i % 2 === 0;
                  const totalPts = qs.reduce((s, q) => s + q.pts, 0);
                  const cfg = [
                    { grad: "linear-gradient(145deg,#c9991a,#f0d060,#c9991a)", shadow: "rgba(212,175,55,0.65)", text: "#002b1b", icon: "🎯", name: "البداية" },
                    { grad: "linear-gradient(145deg,#16a34a,#4ade80,#16a34a)", shadow: "rgba(34,197,94,0.65)",  text: "#002b1b", icon: "⭐", name: "المعرفة" },
                    { grad: "linear-gradient(145deg,#2563eb,#60a5fa,#2563eb)", shadow: "rgba(59,130,246,0.65)", text: "#fff",    icon: "🔥", name: "التعمق" },
                    { grad: "linear-gradient(145deg,#9333ea,#c084fc,#9333ea)", shadow: "rgba(168,85,247,0.65)", text: "#fff",    icon: "💎", name: "الإتقان" },
                    { grad: "linear-gradient(145deg,#dc2626,#f87171,#dc2626)", shadow: "rgba(239,68,68,0.65)",  text: "#fff",    icon: "🏆", name: "الخبرة" },
                  ][i];

                  return (
                    <div key={i} className="flex flex-col items-center w-full">
                      <div className={`flex items-center w-full gap-4 ${isRight ? "" : "flex-row-reverse"}`}>

                        {/* زر المرحلة */}
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.88 }}
                          onClick={() => startLevel(lvlNum)}
                          className="flex-shrink-0 w-[88px] h-[88px] rounded-full flex flex-col items-center justify-center relative"
                          style={{
                            background: cfg.grad,
                            boxShadow: `0 7px 0 ${cfg.shadow}cc, 0 12px 28px ${cfg.shadow}55`,
                          }}>
                          <span className="text-[28px] leading-none">{cfg.icon}</span>
                          <span className="font-arabic font-black text-[11px] mt-0.5" style={{ color: cfg.text }}>{lvlNum}</span>
                          <motion.div
                            className="absolute inset-0 rounded-full"
                            style={{ border: "2px solid rgba(255,255,255,0.25)" }}
                            animate={{ opacity: [0.4, 0.8, 0.4] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }} />
                        </motion.button>

                        {/* بطاقة المعلومات */}
                        <div className={`flex-1 rounded-2xl px-4 py-3 ${isRight ? "text-right" : "text-left"}`}
                          style={{
                            background: "linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}>
                          <p className="font-arabic font-black text-sm text-white">{cfg.name}</p>
                          <p className="font-arabic text-xs text-white/40 mt-0.5">
                            {qs.length} أسئلة · حتى {totalPts} نقطة
                          </p>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => startLevel(lvlNum)}
                            className="mt-2 font-arabic font-black text-[11px] px-4 py-1.5 rounded-full"
                            style={{
                              background: cfg.grad,
                              color: cfg.text,
                              boxShadow: `0 3px 0 ${cfg.shadow}aa`,
                            }}>
                            العب الآن ▶
                          </motion.button>
                        </div>
                      </div>

                      {/* رابط بين المراحل */}
                      {i < LEVELS.length - 1 && (
                        <div className={`flex flex-col items-center gap-1 py-2 ${isRight ? "ml-[44px]" : "mr-[44px]"}`}>
                          {[0,1,2].map(j => (
                            <motion.div key={j} className="w-2.5 h-2.5 rounded-full"
                              style={{ background: "rgba(212,175,55,0.25)" }}
                              animate={{ opacity: [0.3, 0.8, 0.3] }}
                              transition={{ repeat: Infinity, duration: 1.8, delay: j * 0.3 }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* جاهز */}
          {gameState === "ready" && (
            <motion.div key="ready"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center gap-6 pt-8 px-4 overflow-y-auto pb-6">

              <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                className="w-32 h-32 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#002b1b,#003d26)", border: "3px solid #d4af37", boxShadow: "0 0 40px rgba(212,175,55,0.3)" }}>
                <span className="text-5xl">🎯</span>
              </motion.div>

              <div>
                <p className="font-arabic text-[#d4af37]/70 text-sm mb-1">المرحلة {playingLevel} من {MAX_LEVEL}</p>
                <h2 className="font-arabic font-bold text-foreground text-2xl mb-2">طريق النحل 🐝</h2>
                <p className="font-arabic text-muted-foreground text-sm leading-6 max-w-xs">
                  أجب على {questions.length} أسئلة عن المبادرة<br />
                  واكسب نقاط ولاء تُضاف لرصيدك فوراً
                </p>
              </div>

              {/* مؤشر المراحل */}
              <div className="flex gap-2 items-center">
                {LEVELS.map((_, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full transition-all" style={{
                    backgroundColor: i < playingLevel - 1 ? "#22c55e" : i === playingLevel - 1 ? "#d4af37" : "rgba(255,255,255,0.15)",
                    boxShadow: i === playingLevel - 1 ? "0 0 8px rgba(212,175,55,0.6)" : "none",
                  }} />
                ))}
              </div>

              <div className="w-full grid grid-cols-3 gap-3">
                {[["🎯", `${questions.length} أسئلة`, "تحدّيات"], ["⭐", "٣٢٥+", "نقطة بالكامل"], ["🔥", "بونص", "لكل سلسلة"]].map(([ic, v, l]) => (
                  <div key={l} className="bg-card border border-border rounded-2xl p-3 text-center">
                    <div className="text-2xl mb-1">{ic}</div>
                    <div className="font-mono font-bold text-primary text-sm">{v}</div>
                    <div className="font-arabic text-muted-foreground text-[10px]">{l}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full rounded-xl px-3 py-2"
                style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)" }}>
                <Tv className="w-3.5 h-3.5 text-[#d4af37] flex-shrink-0" />
                <p className="font-arabic text-[11px] text-[#d4af37]/80">
                  إعلان قصير بعد كل مرحلة — مشاهدتك تدعم المبادرة مباشرةً
                </p>
              </div>

              <motion.button onClick={handleStart} whileTap={{ scale: 0.96 }}
                className="w-full py-5 rounded-3xl font-arabic font-bold text-2xl"
                style={{ background: "linear-gradient(135deg,#d4af37,#f0d060)", boxShadow: "0 6px 0 rgba(180,140,20,0.6)", color: "#002b1b" }}>
                {playingLevel > 1 ? `ابدأ المرحلة ${playingLevel} ▶` : "ابدأ اللعب ▶"}
              </motion.button>
            </motion.div>
          )}

          {/* شاشة الإعلان */}
          {gameState === "ad-break" && (
            <StageAdScreen
              key={`ad-${playingLevel}`}
              score={score}
              levelNum={playingLevel}
              onDone={advanceLevel}
            />
          )}

          {/* انتقال للمرحلة التالية */}
          {gameState === "next-level" && (
            <motion.div key={`next-${playingLevel}`}
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center"
              style={{ background: "linear-gradient(180deg,#060d1a 0%,#001a0f 100%)" }}>
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
                className="text-8xl">🚀</motion.div>
              <div>
                <p className="font-arabic text-[#d4af37] text-sm mb-1">انتقلت إلى</p>
                <h2 className="font-arabic font-black text-3xl text-white">المرحلة {playingLevel}</h2>
                <p className="font-arabic mt-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>تبدأ تلقائياً...</p>
              </div>
              <div className="flex gap-2">
                {LEVELS.map((_, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full" style={{
                    backgroundColor: i < playingLevel ? "#22c55e" : "rgba(255,255,255,0.15)",
                    boxShadow: i === playingLevel - 1 ? "0 0 8px rgba(34,197,94,0.6)" : "none",
                  }} />
                ))}
              </div>
            </motion.div>
          )}

          {/* الأسئلة */}
          {(gameState === "playing" || gameState === "answered") && (
            <motion.div key={`q-${playingLevel}-${current}`}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="flex flex-col h-full">

              <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-4"
                style={{ paddingBottom: gameState === "answered" ? "8px" : "16px" }}>

                <div className="space-y-2">
                  <div className="flex justify-between font-arabic text-xs text-muted-foreground">
                    <span>السؤال {current + 1} من {questions.length}</span>
                    {streak >= 2 && <span className="text-orange-400 font-bold">🔥 سلسلة ×{streak}</span>}
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full bg-primary"
                      animate={{ width: `${((current + (gameState === "answered" ? 1 : 0)) / questions.length) * 100}%` }}
                      transition={{ duration: 0.4 }} />
                  </div>
                </div>

                <div className="bg-card border-2 border-primary/30 rounded-3xl p-5 text-center"
                  style={{ boxShadow: "0 4px 0 rgba(0,43,27,0.5)" }}>
                  <div className="text-3xl mb-2">❓</div>
                  <p className="font-arabic font-bold text-foreground text-lg leading-relaxed">{q.q}</p>
                  <div className="mt-2 inline-flex items-center gap-1 bg-[#d4af37]/10 rounded-full px-3 py-1">
                    <Zap className="w-3 h-3 text-[#d4af37]" />
                    <span className="font-mono text-[#d4af37] text-xs">+{q.pts} نقطة</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {q.options.map((opt, idx) => {
                    const col = optionColor(idx);
                    return (
                      <motion.button key={idx} onClick={() => handleAnswer(idx)} whileTap={{ scale: 0.97 }}
                        disabled={gameState === "answered"}
                        className="w-full p-3.5 rounded-2xl border-2 font-arabic text-base text-right transition-all"
                        style={{
                          backgroundColor: col ? col.bg     : "var(--card)",
                          borderColor:     col ? col.border  : "var(--border)",
                          color:           col ? col.text    : "var(--foreground)",
                          boxShadow:       col ? undefined   : "0 3px 0 rgba(0,0,0,0.2)",
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

              {/* زر التالي / الإنهاء */}
              <AnimatePresence>
                {gameState === "answered" && (
                  <motion.div
                    initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 340, damping: 28 }}
                    className="flex-shrink-0 px-4 py-3 border-t border-border"
                    style={{
                      background: selected === q.correct
                        ? "linear-gradient(to top, rgba(5,46,22,0.97), rgba(5,46,22,0.92))"
                        : "linear-gradient(to top, rgba(69,10,10,0.97), rgba(69,10,10,0.92))",
                    }}>
                    <div className="flex gap-3 items-stretch">
                      <div className={`flex-1 rounded-2xl px-4 py-3 flex flex-col justify-center border ${selected === q.correct ? "border-green-600/40 bg-green-950/60" : "border-red-600/40 bg-red-950/60"}`}>
                        <p className="font-arabic font-bold text-base leading-tight">
                          {selected === q.correct ? "🎉 إجابة صحيحة!" : "❌ إجابة خاطئة"}
                        </p>
                        {selected === q.correct && streak >= 2 && (
                          <p className="font-arabic text-orange-400 text-xs mt-0.5">🔥 بونص +{Math.floor(q.pts * 0.5)} نقطة</p>
                        )}
                        {selected !== q.correct && (
                          <p className="font-arabic text-white/50 text-xs mt-0.5">الإجابة: {q.options[q.correct]}</p>
                        )}
                        {isLast && (
                          <p className="font-arabic text-[10px] text-[#d4af37]/70 mt-1 flex items-center gap-1">
                            <Tv className="w-3 h-3" />
                            {playingLevel < MAX_LEVEL ? "إعلان قصير ثم المرحلة التالية" : "إعلان قصير ثم نتائجك النهائية"}
                          </p>
                        )}
                      </div>

                      <motion.button onClick={handleNext} whileTap={{ scale: 0.94 }}
                        className="flex-shrink-0 w-28 rounded-2xl font-arabic font-bold text-base flex flex-col items-center justify-center gap-1"
                        style={{ background: "linear-gradient(135deg,#002b1b,#004a2a)", boxShadow: "0 4px 0 rgba(0,0,0,0.5)", border: "1.5px solid rgba(212,175,55,0.5)", color: "#d4af37" }}>
                        <span className="text-xl">{isLast ? "★" : "←"}</span>
                        <span className="text-xs">{isLast ? "إنهاء" : "التالي"}</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* أكملت كل المراحل */}
          {gameState === "all-done" && (
            <motion.div key="all-done"
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center gap-5 pt-6 px-4 overflow-y-auto pb-20">

              <motion.div animate={{ rotate: [0, -10, 10, -5, 0] }} transition={{ delay: 0.3, duration: 0.6 }}
                className="text-7xl">🏆</motion.div>

              <div>
                <p className="font-arabic text-[#d4af37] font-bold text-sm mb-1">أكملت جميع المراحل!</p>
                {finalScore > 0 && (
                  <>
                    <p className="font-arabic text-muted-foreground text-sm mb-1">نقاطك في هذه الجلسة</p>
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
                  </>
                )}
              </div>

              <div className="w-full bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-[#d4af37]" />
                  <span className="font-arabic font-bold text-foreground text-sm">المراحل المنجزة</span>
                </div>
                <div className="flex gap-3 justify-center">
                  {LEVELS.map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.5)" }}>
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="font-arabic text-muted-foreground text-sm leading-6">
                شكراً لدعمك القضية! نقاطك ستُضاف<br />إلى رصيدك خلال لحظات.
              </p>

              {doubleState !== "done" && finalScore > 0 && (
                <motion.button onClick={handleDoublePoints}
                  disabled={doubleState === "loading"}
                  whileTap={{ scale: 0.96 }}
                  className="w-full py-4 rounded-2xl font-arabic font-bold text-base flex items-center justify-center gap-3"
                  style={{
                    background: doubleState === "error" ? "rgba(239,68,68,0.12)" : "linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.08))",
                    border:  doubleState === "error" ? "1.5px solid rgba(239,68,68,0.4)" : "1.5px solid rgba(212,175,55,0.5)",
                    color:   doubleState === "error" ? "#f87171" : "#d4af37",
                    opacity: doubleState === "loading" ? 0.7 : 1,
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
                        {finalScore} ← {finalScore * 2}
                      </span>
                    </>
                  )}
                </motion.button>
              )}

              <div className="flex gap-3 w-full">
                <motion.button whileTap={{ scale: 0.96 }}
                  onClick={() => { setScore(0); setDoubleState("idle"); setDoubledScore(0); setGameState("level-select"); }}
                  className="flex-1 py-3 rounded-2xl font-arabic font-bold text-sm"
                  style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.2),rgba(212,175,55,0.08))", border: "1.5px solid rgba(212,175,55,0.5)", color: "#d4af37" }}>
                  🗺️ خريطة المراحل
                </motion.button>
                <button onClick={onBack}
                  className="flex-1 py-3 rounded-2xl font-arabic text-muted-foreground text-sm border border-border bg-card">
                  الرئيسية
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
