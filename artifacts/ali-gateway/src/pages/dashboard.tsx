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
import { WatchSection } from "./sections/watch";
import { KnowledgeSection } from "./sections/knowledge";
import { ProfileSection } from "./sections/profile";

type Section = "about" | "guide" | "guardians" | "ambassadors" | "community" | "mdd" | "leaderboard" | "play" | "watch" | "knowledge" | "profile" | null;

// ─── Full-Screen Welcome Sequence ────────────────────────────────────────────
function WelcomeSequence({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false);

  // Single screen shown for 5 s then fades out over 1 s
  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 5000);
    const t2 = setTimeout(() => onDone(), 6200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8"
      style={{ background: "linear-gradient(160deg, #001a10 0%, #002b1b 50%, #001208 100%)" }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 1.2, ease: "easeInOut" }}>

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(212,175,55,0.07) 0%, transparent 70%)" }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center text-center w-full max-w-xs" dir="rtl">

        {/* Emblem */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#d4af37]/50 mb-6 flex-shrink-0"
          style={{ boxShadow: "0 0 50px rgba(212,175,55,0.25), 0 0 100px rgba(212,175,55,0.1)" }}>
          <img src="/ali-emblem.jpg" alt="ALI" className="w-full h-full object-cover object-top" />
        </motion.div>

        {/* Top divider */}
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.5, duration: 0.7 }}
          className="w-24 h-px mb-5" style={{ background: "linear-gradient(90deg, transparent, #d4af37, transparent)" }} />

        {/* Box: initiative name + token */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="w-full rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/5 px-6 py-5 mb-4 text-center"
          style={{ boxShadow: "0 0 24px rgba(212,175,55,0.08), inset 0 1px 0 rgba(212,175,55,0.15)" }}>
          <p className="font-arabic text-[#d4af37] text-2xl font-bold leading-snug mb-1">مبادرة التحرير العلوي</p>
          <p className="text-[#d4af37]/80 text-base font-bold tracking-[0.25em] mb-3">A.L.I</p>
          <div className="w-10 h-px bg-[#d4af37]/25 mx-auto mb-3" />
          <p className="text-white/55 text-xs tracking-widest uppercase mb-1">Alawite Liberation Initiative</p>
          <p className="text-white/35 text-xs tracking-wider mb-4">Management of Diversified Development</p>
          {/* Token badge inline */}
          <div className="inline-block rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-6 py-1.5"
            style={{ boxShadow: "0 0 16px rgba(212,175,55,0.15)" }}>
            <span className="text-[#d4af37] font-mono font-bold text-lg tracking-widest">$MDD</span>
          </div>
        </motion.div>

        {/* Slogan — integrated, appears shortly after the box */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="h-px w-8" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.5))" }} />
            <p className="font-arabic text-[#d4af37] font-bold text-2xl"
              style={{ textShadow: "0 0 30px rgba(212,175,55,0.5)" }}>
              حقٌّ لا يموت
            </p>
            <div className="h-px w-8" style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.5), transparent)" }} />
          </div>
        </motion.div>

        {/* Bottom divider */}
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.5, duration: 0.7 }}
          className="w-24 h-px mt-5" style={{ background: "linear-gradient(90deg, transparent, #d4af37, transparent)" }} />

      </motion.div>
    </motion.div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressHeader({
  userData,
  onOpenProfile,
}: {
  userData: { pseudonym: string; level: number; rank: string; mddBalance: number; loyaltyPoints: number };
  onOpenProfile: () => void;
}) {
  const xpPerLevel = 500;
  const pts = userData.loyaltyPoints;
  const currentXp = pts % xpPerLevel;
  const pct = Math.min((currentXp / xpPerLevel) * 100, 100);

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3" dir="rtl">
      <div className="flex items-center gap-3 mb-2.5">
        {/* Clickable avatar → opens profile */}
        <button
          onClick={onOpenProfile}
          className="relative flex-shrink-0 active:scale-95 transition-transform"
          aria-label="ملف العضو">
          <AliEmblem className="w-9 h-9" animate={false} />
          <span className="absolute -bottom-1 -left-1 font-mono text-[8px] font-black px-1 rounded-full"
            style={{ background: "#d4af37", color: "#001a10", lineHeight: "14px" }}>
            {userData.level}
          </span>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            {/* Name → also opens profile */}
            <button onClick={onOpenProfile} className="flex items-center gap-2 active:opacity-70 transition-opacity">
              <span className="font-arabic font-bold text-primary text-sm leading-tight">{userData.pseudonym}</span>
              <span className="bg-primary/20 border border-primary/40 text-primary font-mono text-[10px] px-1.5 py-0.5 rounded-full">
                LVL {userData.level}
              </span>
            </button>
            <div className="flex items-center gap-1 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-full px-2.5 py-1">
              <span className="text-[#d4af37] text-xs font-bold">{pts.toLocaleString()}</span>
              <span className="font-arabic text-[#d4af37]/70 text-[10px]">نقطة</span>
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
  const [welcomeDone, setWelcomeDone] = useState(false);

  const { data: userData, isLoading } = useGetMe({
    request: { headers: { "X-Telegram-ID": telegramId } },
    query: { enabled: !!telegramId },
  });

  useEffect(() => {
    if (!isLoading && userData && !userData.keysConfirmed) setLocation("/onboarding");
  }, [userData, isLoading, setLocation]);

  const handleBack = useCallback(() => setActiveSection(null), []);

  // Show loading spinner while fetching user data
  if (isLoading || !userData) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center"
        style={{ background: "linear-gradient(160deg, #001a10 0%, #002b1b 50%, #001208 100%)" }}>
        <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground relative overflow-hidden">

      {/* ── Full-screen welcome sequence (blocks dashboard until done) ── */}
      <AnimatePresence>
        {!welcomeDone && (
          <WelcomeSequence onDone={() => setWelcomeDone(true)} />
        )}
      </AnimatePresence>

      {/* ── Dashboard content (fades in after welcome sequence) ── */}
      {welcomeDone && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}>

          <ProgressHeader userData={userData} onOpenProfile={() => setActiveSection("profile")} />

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
                {activeSection === "watch"       && <WatchSection onBack={handleBack} />}
                {activeSection === "knowledge"   && <KnowledgeSection onBack={handleBack} />}
                {activeSection === "profile"     && <ProfileSection onBack={handleBack} userData={userData} />}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Home grid */}
          <div className="px-4 pt-5 pb-24 space-y-0" dir="rtl">
            {/* Identity strip — clickable → opens profile */}
            <motion.button
              onClick={() => setActiveSection("profile")}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-card border border-border rounded-2xl px-4 py-3 mb-5 flex items-center justify-between active:brightness-90 transition-all"
              style={{ boxShadow: "0 3px 0 rgba(212,175,55,0.15)" }}>
              <div className="text-right">
                <div className="font-arabic text-[10px] text-muted-foreground mb-0.5">رقم الهوية</div>
                <div className="font-mono text-primary text-sm font-bold tracking-widest">{userData.aliId}</div>
              </div>
              <div className="text-center">
                <div className="font-arabic text-[10px] text-muted-foreground mb-0.5">الرتبة</div>
                <div className="font-mono text-primary text-sm uppercase">{userData.rank}</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="font-arabic text-[10px] text-muted-foreground mb-0.5">$MDD</div>
                <div className="font-mono text-[#d4af37] text-sm font-bold">{userData.mddBalance.toLocaleString()}</div>
              </div>
              <div className="text-[#d4af37]/40 text-lg leading-none">‹</div>
            </motion.button>

            {/* Section cards grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* First card: عن المبادرة */}
              <SectionCard key={CARDS[0].id} card={CARDS[0]} delay={0.1} onPress={() => setActiveSection(CARDS[0].id)} />

              {/* ★ EARN & KNOWLEDGE BUTTON ★ */}
              <motion.button
                onClick={() => setActiveSection("knowledge")}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.18, type: "spring", stiffness: 260, damping: 18 }}
                whileTap={{ scale: 0.93 }}
                className="col-span-2 relative overflow-hidden rounded-3xl py-6 flex flex-col items-center justify-center gap-2 border-2"
                style={{
                  background: "linear-gradient(135deg, #7a5c00 0%, #d4af37 40%, #f0d060 60%, #d4af37 80%, #7a5c00 100%)",
                  borderColor: "rgba(255,255,255,0.25)",
                  boxShadow: "0 7px 0 rgba(100,75,0,0.7), 0 0 40px rgba(212,175,55,0.35)",
                }}>
                <motion.div className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)" }}
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: "linear", repeatDelay: 1.2 }} />
                <motion.div className="absolute inset-0 rounded-3xl border-2 border-white/30"
                  animate={{ opacity: [0.6, 0, 0.6] }}
                  transition={{ repeat: Infinity, duration: 1.8 }} />
                <div className="flex items-center gap-3 relative z-10">
                  <motion.span className="text-4xl"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 1.6 }}>🧠</motion.span>
                  <div className="text-right">
                    <div className="font-arabic font-bold text-[#002b1b] text-2xl leading-tight drop-shadow-sm">اربح وادعم</div>
                    <div className="font-arabic text-[#002b1b]/70 text-sm">أجب واكسب نقاط الولاء · محرك المعرفة</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative z-10 mt-1">
                  {["🧠 ٥٠٠ سؤال", "🔥 بونص السلسلة", "🏆 ١٠٠ مستوى"].map((t) => (
                    <span key={t} className="font-arabic text-[10px] bg-black/15 rounded-full px-2.5 py-1 text-[#002b1b]/90">{t}</span>
                  ))}
                </div>
              </motion.button>

              {/* ★ WATCH BUTTON ★ */}
              <motion.button
                onClick={() => setActiveSection("watch")}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.4 }}
                whileTap={{ scale: 0.96 }}
                className="col-span-2 relative overflow-hidden rounded-3xl py-4 flex items-center justify-between gap-4 px-5 border-2"
                style={{
                  background: "linear-gradient(135deg, rgba(88,28,135,0.55) 0%, rgba(109,40,217,0.4) 50%, rgba(88,28,135,0.55) 100%)",
                  borderColor: "rgba(167,139,250,0.45)",
                  boxShadow: "0 5px 0 rgba(55,10,90,0.55), 0 0 28px rgba(139,92,246,0.2)",
                }}>
                {/* Shimmer */}
                <motion.div className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.12) 50%, transparent 65%)" }}
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear", repeatDelay: 1.5 }} />
                <div className="flex items-center gap-3 relative z-10">
                  <motion.span className="text-3xl"
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}>📺</motion.span>
                  <div className="text-right">
                    <div className="font-arabic font-bold text-purple-100 text-xl leading-tight">شاهد وادعم</div>
                    <div className="font-arabic text-purple-300/80 text-xs mt-0.5">اكسب نقاط ولاء بمشاهدة المحتوى</div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1 relative z-10 flex-shrink-0">
                  <span className="font-arabic text-[10px] bg-purple-900/50 border border-purple-400/30 rounded-full px-2.5 py-1 text-purple-200">⭐ حتى 25 نقطة</span>
                  <span className="font-arabic text-[10px] bg-purple-900/50 border border-purple-400/30 rounded-full px-2.5 py-1 text-purple-200">🔄 يومياً</span>
                </div>
              </motion.button>

              {/* Remaining section cards */}
              {CARDS.slice(1).map((card, i) => (
                <SectionCard key={card.id} card={card} delay={i * 0.07 + 0.43} onPress={() => setActiveSection(card.id)} />
              ))}
            </div>

            {/* Footer motto */}
            <div className="text-center pt-6">
              <p className="font-arabic text-[#d4af37]/40 text-sm italic">حقٌّ لا يموت</p>
            </div>
          </div>

        </motion.div>
      )}

    </div>
  );
}
