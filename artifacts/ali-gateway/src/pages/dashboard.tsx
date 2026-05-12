import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTelegram } from "@/lib/telegram";
import { useGetMe } from "@workspace/api-client-react";
import { AliEmblem } from "@/components/ui/ali-emblem";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Hexagon, ShieldAlert, Cpu, KeyRound } from "lucide-react";

const mockMddData = [
  { date: "١", balance: 0 },
  { date: "٢", balance: 120 },
  { date: "٣", balance: 145 },
  { date: "٤", balance: 210 },
  { date: "٥", balance: 350 },
  { date: "٦", balance: 480 },
  { date: "٧", balance: 650 },
];

function WelcomePopup({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"main" | "slogan" | "exit">("main");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("slogan"), 4000);
    const t2 = setTimeout(() => setPhase("exit"), 6200);
    const t3 = setTimeout(() => onDone(), 7000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center pb-10 px-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === "exit" ? 0 : 1 }}
      transition={{ duration: 0.6 }}
      style={{ pointerEvents: "none" }}
    >
      {/* Backdrop blur behind card only */}
      <motion.div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(0,43,27,0.97) 0%, rgba(0,30,20,0.99) 100%)",
          border: "1px solid rgba(212,175,55,0.35)",
          boxShadow: "0 0 40px rgba(212,175,55,0.15), 0 20px 60px rgba(0,0,0,0.6)",
        }}
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <AnimatePresence mode="wait">
          {phase !== "slogan" && (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45 }}
              className="p-6 text-center"
            >
              {/* Decorative gold line */}
              <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mx-auto mb-5" />

              <p className="font-arabic text-[#d4af37] text-xl font-bold leading-snug mb-1">
                مبادرة التحرير العلوي
              </p>
              <p className="text-[#d4af37] text-lg font-bold tracking-widest mb-4">
                A.L.I
              </p>

              <div className="w-10 h-[1px] bg-[#d4af37]/30 mx-auto mb-4" />

              <p className="text-white/70 text-xs tracking-widest uppercase mb-1">
                Alawite Liberation Initiative
              </p>
              <p className="text-white/50 text-xs tracking-wider mb-3">
                Management of Diversified Development
              </p>

              <div className="inline-block px-4 py-1 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10">
                <span className="text-[#d4af37] font-mono font-bold text-sm tracking-widest">$MDD</span>
              </div>

              <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mx-auto mt-5" />
            </motion.div>
          )}

          {phase === "slogan" && (
            <motion.div
              key="slogan"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="p-8 text-center"
            >
              <p
                className="font-arabic text-[#d4af37] text-3xl font-bold"
                style={{ textShadow: "0 0 30px rgba(212,175,55,0.5)" }}
              >
                حقٌّ لا يموت
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useTelegram();
  const telegramId = user?.id?.toString() || "";
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeDone, setWelcomeDone] = useState(false);

  const { data: userData, isLoading } = useGetMe({
    request: { headers: { "X-Telegram-ID": telegramId } },
    query: { enabled: !!telegramId },
  });

  useEffect(() => {
    if (!isLoading && userData && !userData.keysConfirmed) {
      setLocation("/onboarding");
    }
  }, [userData, isLoading, setLocation]);

  // Show welcome popup 3 seconds after dashboard mounts
  useEffect(() => {
    const t = setTimeout(() => setShowWelcome(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if (isLoading || !userData) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground relative overflow-hidden pb-12" dir="rtl">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* Welcome popup */}
      <AnimatePresence>
        {showWelcome && !welcomeDone && (
          <WelcomePopup onDone={() => { setShowWelcome(false); setWelcomeDone(true); }} />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AliEmblem className="w-10 h-10 shadow-lg" animate={false} />
          <div>
            <div className="font-serif font-bold text-primary tracking-widest text-base leading-none">A.L.I.</div>
            <div className="font-arabic text-[9px] text-muted-foreground leading-tight">
              البوابة الرقمية
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-arabic text-xs text-primary">آمن</span>
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
      </header>

      <div className="px-4 pt-6 space-y-6 relative z-10 max-w-md mx-auto">

        {/* Identity Card */}
        <section className="bg-card border border-border rounded-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />

          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="font-arabic text-xs text-muted-foreground mb-1">الاسم الرمزي</h2>
              <div className="text-2xl font-serif text-foreground">{userData.pseudonym}</div>
            </div>
            <div className="text-left">
              <h2 className="font-arabic text-xs text-muted-foreground mb-1">الرتبة</h2>
              <div className="text-sm font-mono text-primary uppercase">
                {userData.rank} <span className="opacity-50 text-xs">LVL {userData.level}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <h2 className="font-arabic text-xs text-muted-foreground mb-2">رقم الهوية A.L.I</h2>
            <div className="font-mono text-sm tracking-[0.2em] text-primary">{userData.aliId}</div>
          </div>
        </section>

        {/* MDD Economy */}
        <section className="bg-card border border-border rounded-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Hexagon className="w-5 h-5 text-primary" />
            <h2 className="font-arabic text-lg text-primary font-bold">خزينة MDD</h2>
          </div>

          <div className="flex items-center gap-3 mb-5 p-3 bg-primary/5 border border-primary/10 rounded-sm">
            <img src="/ali-emblem.jpg" alt="MDD" className="w-10 h-10 object-contain" />
            <div>
              <div className="text-3xl font-mono text-foreground leading-none">{userData.mddBalance.toLocaleString()}</div>
              <div className="font-arabic text-[10px] text-muted-foreground mt-1">الرصيد الكلي · <span className="text-primary font-bold">$MDD</span></div>
            </div>
          </div>

          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockMddData}>
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "2px", fontFamily: "monospace", fontSize: "12px" }}
                  itemStyle={{ color: "hsl(var(--primary))" }}
                />
                <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Project Bargylos */}
        <section className="bg-card border border-border rounded-sm p-5 relative overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors">
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              <h2 className="font-serif text-lg text-primary tracking-widest">Project Bargylos</h2>
            </div>
            <div className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-sm">
              <span className="font-arabic text-[10px] text-primary">سري للغاية</span>
            </div>
          </div>
          <p className="font-arabic text-sm text-muted-foreground leading-relaxed">
            في انتظار التخليص الأمني. بروتوكول فك التشفير معلّق ريثما تصدر موافقة القيادة الثانوية.
          </p>
        </section>

        {/* System Status */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-sm p-4 flex flex-col items-center justify-center text-center">
            <Cpu className="w-6 h-6 text-primary mb-3" />
            <div className="font-arabic text-xs text-muted-foreground mb-1">الشبكة</div>
            <div className="font-arabic text-sm text-green-500 font-bold">مثالية</div>
          </div>
          <div className="bg-card border border-border rounded-sm p-4 flex flex-col items-center justify-center text-center">
            <KeyRound className="w-6 h-6 text-primary mb-3" />
            <div className="font-arabic text-xs text-muted-foreground mb-1">حالة الخزنة</div>
            <div className="font-arabic text-sm text-primary font-bold">مؤمّنة</div>
          </div>
        </section>

        {/* Footer motto */}
        <div className="text-center pt-2 pb-4">
          <p className="font-arabic text-[#d4af37]/50 text-sm italic">حقٌّ لا يموت</p>
        </div>
      </div>
    </div>
  );
}
