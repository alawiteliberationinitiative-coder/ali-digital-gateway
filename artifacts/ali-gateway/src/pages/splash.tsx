import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";

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

    // بيئة التطوير أو حالة عدم توفر initData → توجيه مباشر للـ Dashboard
    if (!initData && !telegramId) {
      console.log("[ALI] No Telegram context → /dashboard (dev mode)");
      setTimeout(() => go("/dashboard"), 1_500);
      return;
    }

    // ── بدء تسجيل المستخدم مع شريط تحميل ───────────────────────────────────
    (async () => {
      // نتيح للـ splash animation وقتاً قصيراً للظهور
      await new Promise<void>((r) => setTimeout(r, 1_500));
      setLoadingMsg("جاري الاتصال بالبوابة...");

      try {
        const res = await fetchWithRetry(
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
              referredBy:       isNavLink ? null : startParam,
            }),
          },
          3,
          10_000,
        );

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
          go("/dashboard");
        }
      } catch (err) {
        // Network failure after retries → go to dashboard
        console.warn("[ALI] register failed:", err, "→ /dashboard");
        go("/dashboard");
      }
    })();
  }, [verified]);

  function handleVerified() {
    localStorage.setItem(humanCheckKey, "1");
    setVerified(true);
  }

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
                transition={{ delay: 1.8, duration: 2.4, ease: "easeInOut" }} />
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
