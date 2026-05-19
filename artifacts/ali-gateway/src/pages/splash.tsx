import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";
import { setArticlesCache, type RawArticle } from "@/lib/prefetch-cache";
import { isNativeContext } from "@/lib/env";

const TG_BOT      = "ALI_MDD_BOT";
const TG_APP      = "app";
const TG_DEEP_LINK = `https://t.me/${TG_BOT}/${TG_APP}`;

// ── صفحة الهبوط — تُعرض عند فتح التطبيق من المتصفح بدون سياق تيليغرام ──────
function TelegramLandingPage() {
  const [count, setCount] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => {
        if (c <= 1) {
          clearInterval(interval);
          window.location.href = TG_DEEP_LINK;
          return 0;
        }
        return c - 1;
      });
    }, 1_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(160deg, #001a10 0%, #002b1b 55%, #001208 100%)" }}
      dir="rtl"
    >
      {/* خلفية نجمية */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i}
            className="absolute rounded-full"
            style={{
              width: i % 4 === 0 ? 3 : 2,
              height: i % 4 === 0 ? 3 : 2,
              top: `${Math.sin(i * 37.7) * 40 + 50}%`,
              left: `${Math.cos(i * 47.3) * 45 + 50}%`,
              background: "#d4af37",
              opacity: 0.15 + (i % 5) * 0.06,
            }} />
        ))}
      </div>

      {/* الشعار */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center mb-10"
      >
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-5"
          style={{
            background: "radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.04) 70%)",
            border: "1.5px solid rgba(212,175,55,0.35)",
            boxShadow: "0 0 40px rgba(212,175,55,0.15)",
          }}
        >
          <span className="font-mono text-3xl font-bold" style={{ color: "#d4af37", letterSpacing: "0.05em" }}>
            ALI
          </span>
        </div>
        <h1 className="text-3xl font-serif mb-1" style={{ color: "#d4af37", letterSpacing: "0.25em" }}>
          A.L.I.
        </h1>
        <p className="text-xs font-mono text-white/40 tracking-widest uppercase mb-1">
          Alawite Liberation Initiative
        </p>
        <p className="text-xs font-arabic text-white/30">
          بوابة التوثيق الرقمي الحر
        </p>
      </motion.div>

      {/* الرسالة الرئيسية */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="flex flex-col items-center gap-5 w-full max-w-xs px-6"
      >
        <p className="text-center font-arabic text-white/60 text-sm leading-relaxed">
          هذا التطبيق يعمل داخل <span style={{ color: "#d4af37" }}>تيليغرام</span> فقط.
          <br />سيتم فتحه تلقائياً خلال ثوانٍ...
        </p>

        {/* زر الفتح الرئيسي */}
        <motion.a
          href={TG_DEEP_LINK}
          whileTap={{ scale: 0.96 }}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-arabic font-bold text-base text-black"
          style={{
            background: "linear-gradient(135deg, #d4af37 0%, #f0d060 50%, #b8962a 100%)",
            boxShadow: "0 6px 32px rgba(212,175,55,0.35)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          افتح في تيليغرام
        </motion.a>

        {/* عداد تنازلي */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold"
            style={{ background: "rgba(212,175,55,0.12)", color: "#d4af37", border: "1px solid rgba(212,175,55,0.3)" }}
          >
            {count}
          </div>
          <span className="text-xs font-arabic text-white/30">سيفتح تيليغرام تلقائياً</span>
        </div>

        {/* فاصل */}
        <div className="flex items-center gap-3 w-full mt-1">
          <div className="flex-1 h-px" style={{ background: "rgba(212,175,55,0.12)" }} />
          <span className="text-xs text-white/20 font-arabic">أو</span>
          <div className="flex-1 h-px" style={{ background: "rgba(212,175,55,0.12)" }} />
        </div>

        {/* تعليمات إضافة للشاشة الرئيسية */}
        <div
          className="w-full rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.1)" }}
        >
          <p className="font-arabic text-center text-white/50 text-xs mb-3">
            إضافة اختصار التطبيق للشاشة الرئيسية
          </p>
          <div className="space-y-2">
            {[
              { icon: "🍎", label: "iOS Safari", steps: "اضغط على زر المشاركة ↑ ← «إضافة إلى الشاشة الرئيسية»" },
              { icon: "🤖", label: "Android Chrome", steps: "اضغط القائمة ⋮ ← «إضافة إلى الشاشة الرئيسية»" },
            ].map(({ icon, label, steps }) => (
              <div key={label} className="flex items-start gap-2">
                <span className="text-base mt-0.5 flex-shrink-0">{icon}</span>
                <div>
                  <span className="text-xs font-mono text-white/40 block">{label}</span>
                  <span className="text-[11px] font-arabic text-white/30 leading-relaxed">{steps}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="font-arabic text-center text-white/30 text-[10px] mt-3 leading-relaxed">
            عند الفتح من الشاشة الرئيسية سينقلك مباشرةً إلى التطبيق داخل تيليغرام
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Human Verification ────────────────────────────────────────────────────────
type Op = "+" | "−" | "×";

interface Challenge {
  question: string;
  answer: number;
  options: number[];
}

function generateChallenge(): Challenge {
  const ops: Op[] = ["+", "−", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  if (op === "+") {
    a = Math.floor(Math.random() * 14) + 3;
    b = Math.floor(Math.random() * 14) + 3;
    answer = a + b;
  } else if (op === "−") {
    a = Math.floor(Math.random() * 12) + 10;
    b = Math.floor(Math.random() * (a - 2)) + 1;
    answer = a - b;
  } else {
    a = Math.floor(Math.random() * 7) + 2;
    b = Math.floor(Math.random() * 7) + 2;
    answer = a * b;
  }

  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const delta = Math.floor(Math.random() * 9) - 4;
    const w = answer + (delta === 0 ? 1 : delta);
    if (w !== answer && w > 0) wrongs.add(w);
  }

  const options = [...Array.from(wrongs), answer].sort(() => Math.random() - 0.5);
  return { question: `${a} ${op} ${b}`, answer, options };
}

function HumanVerify({ onVerified }: { onVerified: () => void }) {
  const [challenge, setChallenge] = useState<Challenge>(generateChallenge);
  const [selected, setSelected]   = useState<number | null>(null);
  const [shake, setShake]         = useState(false);
  const [success, setSuccess]     = useState(false);

  function pick(opt: number) {
    if (selected !== null || success) return;
    setSelected(opt);

    if (opt === challenge.answer) {
      setSuccess(true);
      setTimeout(onVerified, 950);
    } else {
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setSelected(null);
        setChallenge(generateChallenge());
      }, 850);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.45 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: "linear-gradient(160deg,#000e08 0%,#001a10 50%,#000a05 100%)" }}>

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 65% 45% at 50% 48%, rgba(212,175,55,0.07) 0%, transparent 70%)" }} />

      <motion.div
        animate={shake ? { x: [-14, 14, -11, 11, -7, 7, -3, 3, 0] } : {}}
        transition={{ duration: 0.55 }}
        className="w-full max-w-[300px] rounded-3xl p-6 relative"
        style={{
          background: "rgba(0,25,12,0.9)",
          border: "1.5px solid rgba(212,175,55,0.22)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 50px rgba(212,175,55,0.05)",
        }}
        dir="rtl">

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 280, damping: 20 }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(212,175,55,0.09)", border: "1.5px solid rgba(212,175,55,0.28)" }}>
          {success
            ? <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }} className="text-3xl">✅</motion.span>
            : <Shield className="w-7 h-7 text-[#d4af37]" />}
        </motion.div>

        <p className="font-arabic text-[#d4af37] font-bold text-base text-center mb-1">
          {success ? "تم التحقق بنجاح!" : "التحقق من الهوية"}
        </p>
        <p className="font-arabic text-white/38 text-xs text-center mb-5">
          {success ? "جارٍ الدخول إلى البوابة الآمنة..." : "حل المسألة للتأكد من أنك إنسان"}
        </p>

        <AnimatePresence mode="wait">
          {!success && (
            <motion.div key={challenge.question}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

              <div className="rounded-2xl py-4 px-5 mb-5 text-center"
                style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.18)" }}>
                <p dir="ltr" className="font-mono text-[#d4af37] text-3xl font-black tracking-widest">
                  {challenge.question} = ?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {challenge.options.map((opt) => {
                  const isSelected = selected === opt;
                  const isCorrect  = selected !== null && opt === challenge.answer;
                  const isWrong    = isSelected && opt !== challenge.answer;
                  return (
                    <motion.button key={`${opt}-${challenge.question}`}
                      onClick={() => pick(opt)}
                      whileTap={{ scale: 0.93 }}
                      className="py-4 rounded-2xl font-mono text-2xl font-bold transition-colors"
                      style={{
                        background: isCorrect ? "rgba(74,222,128,0.2)"
                          : isWrong ? "rgba(239,68,68,0.18)"
                          : "rgba(0,55,28,0.55)",
                        border: `2px solid ${isCorrect ? "#4ade80" : isWrong ? "#f87171" : "rgba(212,175,55,0.22)"}`,
                        color:  isCorrect ? "#4ade80" : isWrong ? "#f87171" : "#e8e0cc",
                        boxShadow: isCorrect ? "0 0 18px rgba(74,222,128,0.22)" : "none",
                      }}>
                      {opt}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!success && (
          <p className="font-arabic text-white/18 text-[10px] text-center mt-5">
            🔒 بوابة A.L.I الآمنة — مبادرة التحرير العلوي
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Fetch with retry + per-attempt timeout ────────────────────────────────────
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  attemptTimeout = 12_000,
): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), attemptTimeout);
    try {
      const res = await fetch(url, { ...options, signal: ctrl.signal });
      clearTimeout(tid);
      return res;
    } catch {
      clearTimeout(tid);
      if (i === retries) throw new Error("max-retries");
      await new Promise<void>((r) => setTimeout(r, 1_500 * (i + 1)));
    }
  }
  throw new Error("unreachable");
}

// ─── Splash ────────────────────────────────────────────────────────────────────
export default function Splash() {
  const [, setLocation] = useLocation();

  // مفتاح التحقق مرتبط بـ Telegram ID — يُحفظ في localStorage ليبقى بين الجلسات
  const humanCheckKey = (() => {
    const id = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    return id ? `ali_human_check_${id}` : "ali_human_check";
  })();

  const [verified, setVerified] = useState<boolean>(
    () => localStorage.getItem(humanCheckKey) === "1"
  );
  const [showLanding, setShowLanding] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("جاري تهيئة البوابة الآمنة...");

  const initCalled = useRef(false);
  const navRef     = useRef(setLocation);
  useEffect(() => { navRef.current = setLocation; }, [setLocation]);

  // ── Main init: fires as soon as verified, reads DIRECTLY from window ──────
  // لا ننتظر React context — نقرأ من window.Telegram.WebApp مباشرةً
  // هذا يمنع التعليق التام حتى لو تأخّر الـ Context في الإقلاع
  useEffect(() => {
    if (!verified) return;
    if (initCalled.current) return;
    initCalled.current = true;

    const go = (path: string) => navRef.current(path);

    // ── قراءة بيانات Telegram مباشرةً من window (متاحة فور تحميل السكريبت) ──
    const webApp      = window.Telegram?.WebApp;
    const initData    = webApp?.initData    ?? "";
    const initUnsafe  = webApp?.initDataUnsafe;
    const telegramUser = initUnsafe?.user;
    const telegramId  = telegramUser?.id?.toString() ?? null;
    const startParam  =
      initUnsafe?.start_param ??
      new URLSearchParams(window.location.search).get("startapp") ??
      null;

    // حفظ روابط التوجيه العميق (المجلس / الرسائل) في sessionStorage
    const isNavLink = startParam?.startsWith("space_") || startParam?.startsWith("msg_");
    if (isNavLink && startParam) {
      sessionStorage.setItem("ali_pending_nav", startParam);
    }

    console.log("[ALI] Splash init — telegramId:", telegramId, "| initData:", !!initData);

    // لا سياق Telegram:
    //   في بيئة Capacitor (أندرويد/iOS) → تخطَّ صفحة الهبوط بالكامل؛
    //     المصادقة تتم عبر JWT من شاشة NativeLoginScreen
    //   في بيئة التطوير → dashboard مباشرةً (للاختبار)
    //   في الإنتاج (متصفح عادي) → صفحة هبوط تُعيد التوجيه لـ t.me
    if (!initData && !telegramId) {
      if (isNativeContext()) {
        // بيئة Capacitor بدون initData → NativeAuthGate في App.tsx يتولى الأمر
        console.log("[ALI] No Telegram context — Capacitor native → letting NativeAuthGate handle auth");
        return;
      }
      if (import.meta.env.DEV) {
        console.log("[ALI] No Telegram context → /dashboard (dev mode)");
        setTimeout(() => go("/dashboard"), 500);
      } else {
        console.log("[ALI] No Telegram context in production → showing landing page");
        setShowLanding(true);
      }
      return;
    }

    // ── بدء تسجيل المستخدم مع شريط تحميل ───────────────────────────────────
    (async () => {
      // 3 ثوانٍ كحدٍّ أدنى — تتيح للمستخدم رؤية الشعار وقراءة العنوان،
      // وتُستغلّ في الخلفية لتحميل مؤقت للمقالات/الريلزات قبل فتح الداشبورد.
      const MIN_DISPLAY_MS = 3_000;
      const startTime = Date.now();

      // ── رسائل تحميل متدرّجة (3 مراحل خلال الـ 3 ثواني) ─────────────────────
      setLoadingMsg("جاري الاتصال بالبوابة...");
      const msg2Timer = setTimeout(() => setLoadingMsg("جاري تحميل المحتوى..."),   1_200);
      const msg3Timer = setTimeout(() => setLoadingMsg("البوابة جاهزة، تفضّل..."), 2_500);

      // ── تحميل مؤقت للمقالات في الخلفية (fire-and-forget) ────────────────────
      // يُدفأ module-level cache حتى تظهر الريلزات فورياً بلا طلب جديد
      if (initData) {
        fetch("/api/articles", { headers: { "x-telegram-init-data": initData } })
          .then(r => r.ok ? r.json() as Promise<RawArticle[]> : null)
          .then(data => { if (Array.isArray(data)) setArticlesCache(data); })
          .catch(() => {});
      }

      const minDelayPromise = new Promise<void>((r) => setTimeout(r, MIN_DISPLAY_MS));

      try {
        const [res] = await Promise.all([
          fetchWithRetry(
            "/api/users/register",
            {
              method: "POST",
              headers: {
                "Content-Type":         "application/json",
                "x-telegram-init-data": initData,
              },
              body: JSON.stringify({
                telegramUsername: telegramUser?.username   ?? null,
                firstName:        telegramUser?.first_name ?? null,
                lastName:         telegramUser?.last_name  ?? null,
                referredBy:       isNavLink ? null : (startParam?.startsWith("invite_") ? startParam.slice(7) : startParam),
              }),
            },
            3,
            10_000,
          ),
          minDelayPromise,
        ]);

        clearTimeout(msg2Timer);
        clearTimeout(msg3Timer);
        if (res.ok) {
          const data = await res.json() as { keysConfirmed?: boolean };
          // Fire-and-forget ping to record last_seen in users_activity
          fetchWithRetry(
            "/api/users/ping",
            { method: "POST", headers: { "x-telegram-init-data": initData } },
            1,
            4_000,
          ).catch(() => {});
          go(data.keysConfirmed ? "/dashboard" : "/onboarding");
        } else {
          // 4xx/5xx → go to dashboard anyway, don't leave user stuck
          console.warn("[ALI] register returned", res.status, "→ /dashboard");
          await minDelayPromise; // ensure min visual time even on fast errors
          go("/dashboard");
        }
      } catch (err) {
        // Network failure after retries → go to dashboard
        console.warn("[ALI] register failed:", err, "→ /dashboard");
        clearTimeout(msg2Timer);
        clearTimeout(msg3Timer);
        const elapsed = Date.now() - startTime;
        if (elapsed < MIN_DISPLAY_MS) {
          await new Promise<void>((r) => setTimeout(r, MIN_DISPLAY_MS - elapsed));
        }
        go("/dashboard");
      }
    })();
  }, [verified]);

  function handleVerified() {
    localStorage.setItem(humanCheckKey, "1");
    setVerified(true);
  }

  // عرض صفحة الهبوط عند الفتح من المتصفح خارج تيليغرام (إنتاج فقط)
  if (showLanding) return <TelegramLandingPage />;

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-black">

      <motion.img
        src="/ali-emblem.jpg"
        alt="A.L.I. Emblem"
        className="absolute inset-0 w-full h-full object-cover object-center"
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: verified ? 1 : 0.18, scale: 1 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        draggable={false}
      />

      <motion.div
        className="absolute inset-x-0 bottom-0 h-2/5"
        style={{ background: "linear-gradient(to top, rgba(0,43,27,0.97) 0%, rgba(0,43,27,0.7) 55%, transparent 100%)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: verified ? 1 : 0 }}
        transition={{ delay: 0.8, duration: 1 }}
      />

      <div className="absolute inset-x-0 top-0 h-1/4 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)" }} />

      <AnimatePresence>
        {verified && (
          <motion.div
            key="splash-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center pb-14 px-6">

            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, duration: 0.9 }}
              className="text-center mb-8">
              <h1 className="text-4xl font-serif text-[#d4af37] tracking-[0.3em] uppercase mb-2">A.L.I.</h1>
              <p className="text-sm font-mono text-[#d4af37]/80 tracking-[0.2em] uppercase mb-1">
                Alawite Liberation Initiative
              </p>
              <p className="text-[11px] font-mono text-white/40 tracking-widest uppercase">
                Management of Diversified Development
              </p>
            </motion.div>

            <motion.div
              className="w-48 h-[2px] bg-white/10 rounded-full overflow-hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.4 }}>
              <motion.div
                className="h-full bg-[#d4af37]"
                initial={{ width: "0%" }} animate={{ width: "100%" }}
                transition={{ delay: 0.8, duration: 2.5, ease: "easeInOut" }} />
            </motion.div>

            <motion.p
              key={loadingMsg}
              className="mt-3 text-[10px] font-mono text-white/30 tracking-widest uppercase"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}>
              {loadingMsg}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!verified && <HumanVerify key="verify" onVerified={handleVerified} />}
      </AnimatePresence>
    </div>
  );
}
