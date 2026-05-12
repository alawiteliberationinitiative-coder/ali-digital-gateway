import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useTelegram } from "@/lib/telegram";
import { useGetMe } from "@workspace/api-client-react";
import { AliEmblem } from "@/components/ui/ali-emblem";
import { motion, AnimatePresence } from "framer-motion";
import { AboutSection } from "./sections/about";
import { GuideSection } from "./sections/guide";
import { GuardiansSection } from "./sections/guardians";
import { AmbassadorsSection } from "./sections/ambassadors";
import { CommunitySection } from "./sections/community";
import { MddSection } from "./sections/mdd";
import { LeaderboardSection } from "./sections/leaderboard";
import { PlaySection } from "./sections/play";

type Section = "about" | "guide" | "guardians" | "ambassadors" | "community" | "mdd" | "leaderboard" | "play" | null;

// ─── Welcome Popup ───────────────────────────────────────────────────────────
function WelcomePopup({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"main" | "slogan">("main");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("slogan"), 4000);
    const t2 = setTimeout(() => onDone(), 6500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center pb-10 px-5 pointer-events-none">
      <motion.div className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: "linear-gradient(135deg,rgba(0,43,27,0.98) 0%,rgba(0,20,12,0.99) 100%)", border: "1.5px solid rgba(212,175,55,0.4)", boxShadow: "0 0 50px rgba(212,175,55,0.12),0 24px 60px rgba(0,0,0,0.7)" }}
        initial={{ y: 100, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0 }} transition={{ type: "spring", stiffness: 280, damping: 24 }}>
        <AnimatePresence mode="wait">
          {phase === "main" && (
            <motion.div key="main" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="p-6 text-center" dir="rtl">
              <div className="w-20 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mx-auto mb-5" />
              <p className="font-arabic text-[#d4af37] text-xl font-bold leading-snug mb-0.5">مبادرة التحرير العلوي</p>
              <p className="text-[#d4af37] text-lg font-bold tracking-widest mb-4">A.L.I</p>
              <div className="w-10 h-px bg-[#d4af37]/30 mx-auto mb-4" />
              <p className="text-white/65 text-xs tracking-widest uppercase mb-1">Alawite Liberation Initiative</p>
              <p className="text-white/40 text-xs mb-4">Management of Diversified Development</p>
              <div className="inline-block px-5 py-1.5 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10">
                <span className="text-[#d4af37] font-mono font-bold tracking-widest">$MDD</span>
              </div>
              <div className="w-20 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mx-auto mt-5" />
            </motion.div>
          )}
          {phase === "slogan" && (
            <motion.div key="slogan" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-10 text-center">
              <p className="font-arabic text-[#d4af37] text-3xl font-bold" style={{ textShadow: "0 0 30px rgba(212,175,55,0.5)" }}>
                حقٌّ لا يموت
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressHeader({ userData }: { userData: { pseudonym: string; level: number; rank: string; mddBalance: number } }) {
  const xpPerLevel = 500;
  const currentXp = (userData.mddBalance % xpPerLevel) || Math.floor(userData.mddBalance * 0.7 % xpPerLevel);
  const pct = Math.min((currentXp / xpPerLevel) * 100, 100);
  const dailyPts = 24;

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3" dir="rtl">
      <div className="flex items-center gap-3 mb-2.5">
        <AliEmblem className="w-9 h-9 flex-shrink-0" animate={false} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-arabic font-bold text-primary text-sm leading-tight">{userData.pseudonym}</span>
              <span className="bg-primary/20 border border-primary/40 text-primary font-mono text-[10px] px-1.5 py-0.5 rounded-full">LVL {userData.level}</span>
            </div>
            <div className="flex items-center gap-1 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-full px-2.5 py-1">
              <span className="text-[#d4af37] text-xs font-bold">+{dailyPts}</span>
              <span className="font-arabic text-[#d4af37]/70 text-[10px]">اليوم</span>
            </div>
          </div>
          <div className="mt-1.5">
            <div className="flex justify-between mb-1">
              <span className="font-arabic text-[10px] text-muted-foreground">نقاط الولاء</span>
              <span className="font-mono text-[10px] text-muted-foreground">{currentXp}/{xpPerLevel}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #d4af37 0%, #f0d060 100%)" }}
                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
interface CardDef {
  id: Section;
  emoji: string;
  title: string;
  subtitle: string;
  accent: string;
  shadow: string;
  wide?: boolean;
}

const CARDS: CardDef[] = [
  { id: "about",       emoji: "🏛",  title: "عن المبادرة",         subtitle: "رؤيتنا ومهمتنا وقيمنا",              accent: "#d4af37", shadow: "rgba(212,175,55,0.35)", wide: true },
  { id: "guide",       emoji: "📚",  title: "تعليمات الأنشطة",      subtitle: "دليل شامل لاستخدام المنصة",           accent: "#22c55e", shadow: "rgba(34,197,94,0.25)" },
  { id: "guardians",   emoji: "🌿",  title: "حراس الأرض",           subtitle: "التوثيق الميداني",                    accent: "#4ade80", shadow: "rgba(74,222,128,0.2)" },
  { id: "ambassadors", emoji: "🌍",  title: "سفراء القضية",          subtitle: "الشبكة الدولية",                      accent: "#60a5fa", shadow: "rgba(96,165,250,0.2)" },
  { id: "community",   emoji: "💬",  title: "المجتمع",               subtitle: "غرف النقاش والتواصل",                 accent: "#a78bfa", shadow: "rgba(167,139,250,0.2)" },
  { id: "mdd",         emoji: "💰",  title: "ركن $MDD",             subtitle: "أداء العملة والعقد الذكي",            accent: "#d4af37", shadow: "rgba(212,175,55,0.3)", wide: true },
  { id: "leaderboard", emoji: "🏆",  title: "المتصدرون",             subtitle: "ترتيب الأسماء المستعارة",             accent: "#fb923c", shadow: "rgba(251,146,60,0.25)", wide: true },
];

function SectionCard({ card, onPress, delay }: { card: CardDef; onPress: () => void; delay: number }) {
  return (
    <motion.button
      onClick={onPress}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      whileTap={{ scale: 0.96 }}
      className={`${card.wide ? "col-span-2" : "col-span-1"} flex ${card.wide ? "flex-row" : "flex-col"} items-center ${card.wide ? "gap-4 px-5 py-4" : "gap-2 p-5"} rounded-3xl border-2 text-right active:brightness-90 transition-all`}
      style={{
        backgroundColor: `${card.accent}12`,
        borderColor: `${card.accent}50`,
        boxShadow: `0 5px 0 ${card.shadow}`,
      }}
    >
      <div className="text-4xl leading-none flex-shrink-0">{card.emoji}</div>
      <div className={card.wide ? "flex-1 text-right" : "text-center w-full"}>
        <div className="font-arabic font-bold text-foreground text-base leading-tight">{card.title}</div>
        <div className="font-arabic text-muted-foreground text-xs mt-0.5 leading-tight">{card.subtitle}</div>
      </div>
      {card.wide && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${card.accent}25`, border: `1.5px solid ${card.accent}60` }}>
          <span style={{ color: card.accent }} className="text-sm font-bold">›</span>
        </div>
      )}
    </motion.button>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useTelegram();
  const telegramId = user?.id?.toString() || "";

  const [activeSection, setActiveSection] = useState<Section>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeDone, setWelcomeDone] = useState(false);

  const { data: userData, isLoading } = useGetMe({
    request: { headers: { "X-Telegram-ID": telegramId } },
    query: { enabled: !!telegramId },
  });

  useEffect(() => {
    if (!isLoading && userData && !userData.keysConfirmed) setLocation("/onboarding");
  }, [userData, isLoading, setLocation]);

  useEffect(() => {
    const t = setTimeout(() => setShowWelcome(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const handleBack = useCallback(() => setActiveSection(null), []);

  if (isLoading || !userData) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground relative overflow-hidden">
      {/* Welcome popup */}
      <AnimatePresence>
        {showWelcome && !welcomeDone && activeSection === null && (
          <WelcomePopup onDone={() => { setShowWelcome(false); setWelcomeDone(true); }} />
        )}
      </AnimatePresence>

      <ProgressHeader userData={userData} />

      {/* Section overlay */}
      <AnimatePresence mode="wait">
        {activeSection !== null && (
          <motion.div key={activeSection}
            className="fixed inset-0 z-30 bg-background overflow-y-auto"
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}>
            {activeSection === "about"       && <AboutSection onBack={handleBack} />}
            {activeSection === "guide"       && <GuideSection onBack={handleBack} />}
            {activeSection === "guardians"   && <GuardiansSection onBack={handleBack} />}
            {activeSection === "ambassadors" && <AmbassadorsSection onBack={handleBack} />}
            {activeSection === "community"   && <CommunitySection onBack={handleBack} />}
            {activeSection === "mdd"         && <MddSection onBack={handleBack} />}
            {activeSection === "leaderboard" && <LeaderboardSection onBack={handleBack} />}
            {activeSection === "play"        && <PlaySection onBack={handleBack} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Home grid */}
      <div className="px-4 pt-5 pb-24 space-y-0" dir="rtl">
        {/* Identity strip */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="bg-card border border-border rounded-2xl px-4 py-3 mb-5 flex items-center justify-between"
          style={{ boxShadow: "0 3px 0 rgba(212,175,55,0.15)" }}>
          <div>
            <div className="font-arabic text-[10px] text-muted-foreground mb-0.5">رقم الهوية</div>
            <div className="font-mono text-primary text-sm font-bold tracking-widest">{userData.aliId}</div>
          </div>
          <div className="text-left">
            <div className="font-arabic text-[10px] text-muted-foreground mb-0.5">الرتبة</div>
            <div className="font-mono text-primary text-sm uppercase">{userData.rank}</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="font-arabic text-[10px] text-muted-foreground mb-0.5">$MDD</div>
            <div className="font-mono text-[#d4af37] text-sm font-bold">{userData.mddBalance.toLocaleString()}</div>
          </div>
        </motion.div>

        {/* Section cards grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* First card: عن المبادرة */}
          <SectionCard key={CARDS[0].id} card={CARDS[0]} delay={0.1} onPress={() => setActiveSection(CARDS[0].id)} />

          {/* ★ PLAY BUTTON ★ */}
          <motion.button
            onClick={() => setActiveSection("play")}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.18, type: "spring", stiffness: 260, damping: 18 }}
            whileTap={{ scale: 0.93 }}
            className="col-span-2 relative overflow-hidden rounded-3xl py-6 flex flex-col items-center justify-center gap-2 border-2"
            style={{
              background: "linear-gradient(135deg, #7a5c00 0%, #d4af37 40%, #f0d060 60%, #d4af37 80%, #7a5c00 100%)",
              borderColor: "rgba(255,255,255,0.25)",
              boxShadow: "0 7px 0 rgba(100,75,0,0.7), 0 0 40px rgba(212,175,55,0.35)",
            }}
          >
            {/* Shimmer overlay */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)" }}
              animate={{ x: ["-100%", "100%"] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: "linear", repeatDelay: 1.2 }}
            />
            {/* Pulsing ring */}
            <motion.div
              className="absolute inset-0 rounded-3xl border-2 border-white/30"
              animate={{ opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
            />
            <div className="flex items-center gap-3 relative z-10">
              <motion.span
                className="text-4xl"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
              >🎯</motion.span>
              <div className="text-right">
                <div className="font-arabic font-bold text-[#002b1b] text-2xl leading-tight drop-shadow-sm">اربح و ادعم</div>
                <div className="font-arabic text-[#002b1b]/70 text-sm">أجب واكسب نقاط الولاء</div>
              </div>
            </div>
            <div className="flex items-center gap-2 relative z-10 mt-1">
              {["⭐ ٣٢٥+ نقطة", "🔥 بونص السلسلة", "🏆 ٥ تحديات"].map((t) => (
                <span key={t} className="font-arabic text-[10px] bg-black/15 rounded-full px-2.5 py-1 text-[#002b1b]/90">{t}</span>
              ))}
            </div>
          </motion.button>

          {/* Remaining section cards */}
          {CARDS.slice(1).map((card, i) => (
            <SectionCard key={card.id} card={card} delay={i * 0.07 + 0.25} onPress={() => setActiveSection(card.id)} />
          ))}
        </div>

        {/* Footer motto */}
        <div className="text-center pt-6">
          <p className="font-arabic text-[#d4af37]/40 text-sm italic">حقٌّ لا يموت</p>
        </div>
      </div>
    </div>
  );
}
