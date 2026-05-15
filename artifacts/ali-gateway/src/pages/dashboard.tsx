import { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { useTelegram } from "@/lib/telegram";
import { useGetMe } from "@workspace/api-client-react";
import { AliEmblem } from "@/components/ui/ali-emblem";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut } from "lucide-react";
import { AdarEmblem } from "./sections/adar";
import { SpaceAnnouncementBanner } from "./sections/community";
import { getAdarUnreadCount } from "./sections/adar-utils";

const AdarSection        = lazy(() => import("./sections/adar").then(m => ({ default: m.AdarSection })));
const GuideSection       = lazy(() => import("./sections/guide").then(m => ({ default: m.GuideSection })));
const GuardiansSection   = lazy(() => import("./sections/guardians").then(m => ({ default: m.GuardiansSection })));
const AmbassadorsSection = lazy(() => import("./sections/ambassadors").then(m => ({ default: m.AmbassadorsSection })));
const CommunitySection   = lazy(() => import("./sections/community").then(m => ({ default: m.CommunitySection })));
const MddSection         = lazy(() => import("./sections/mdd").then(m => ({ default: m.MddSection })));
const LeaderboardSection = lazy(() => import("./sections/leaderboard").then(m => ({ default: m.LeaderboardSection })));
const PlaySection        = lazy(() => import("./sections/play").then(m => ({ default: m.PlaySection })));
const WatchSection       = lazy(() => import("./sections/watch").then(m => ({ default: m.WatchSection })));
const KnowledgeSection   = lazy(() => import("./sections/knowledge").then(m => ({ default: m.KnowledgeSection })));
const ProfileSection     = lazy(() => import("./sections/profile").then(m => ({ default: m.ProfileSection })));

type Section = "adar" | "guide" | "guardians" | "ambassadors" | "community" | "mdd" | "leaderboard" | "play" | "watch" | "knowledge" | "profile" | null;

// ─── Section Loading Fallback ─────────────────────────────────────────────────
function SectionLoading() {
  return (
    <div className="fixed inset-0 z-30 bg-background flex items-center justify-center" dir="rtl">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
        <p className="font-arabic text-white/35 text-xs animate-pulse">جاري التحميل...</p>
      </div>
    </div>
  );
}

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

// ─── Telegram-style notification tone via Web Audio API ───────────────────────
function playNotifSound() {
  try {
    const AudioCtx = window.AudioContext || ((window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [{ freq: 523.25, t: 0 }, { freq: 659.25, t: 0.12 }]; // C5, E5
    notes.forEach(({ freq, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + t);
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.09);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.1);
    });
  } catch { /* ignore AudioContext errors */ }
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressHeader({
  userData,
  onOpenProfile,
}: {
  userData: { pseudonym: string; level: number; rank: string; mddBalance: number; loyaltyPoints: number; aliId: string };
  onOpenProfile: () => void;
}) {
  const xpPerLevel = 500;
  const pts = userData.loyaltyPoints;
  const currentXp = pts % xpPerLevel;
  const pct = Math.min((currentXp / xpPerLevel) * 100, 100);

  const [unread, setUnread] = useState(0);
  const prevUnread = useRef(0);

  useEffect(() => {
    const poll = async () => {
      try {
        const { apiFetch } = await import("@/lib/api");
        const res = await apiFetch("/api/messages/unread-count");
        if (res.ok) {
          const { count } = await res.json() as { count: number };
          if (count > prevUnread.current) playNotifSound();
          prevUnread.current = count;
          setUnread(count);
        }
      } catch { /* ignore */ }
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, []);

  function handleClose() {
    window.Telegram?.WebApp?.close();
  }

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-2" dir="rtl">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <button
          onClick={onOpenProfile}
          className="relative flex-shrink-0 active:scale-95 transition-transform"
          aria-label="ملف العضو">
          <AliEmblem className="w-9 h-9" animate={false} />
          <span className="absolute -bottom-1 -left-1 font-mono text-[8px] font-black px-1 rounded-full"
            style={{ background: "#d4af37", color: "#001a10", lineHeight: "14px" }}>
            {userData.level}
          </span>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 rounded-full font-mono font-black text-white flex items-center justify-center"
              style={{ background: "#ef4444", minWidth: 15, minHeight: 15, fontSize: 8, padding: "0 2px", boxShadow: "0 0 8px rgba(239,68,68,0.7)", lineHeight: "15px" }}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Row 1: name + points */}
          <div className="flex items-center justify-between mb-1">
            <button onClick={onOpenProfile} className="flex items-center gap-2 active:opacity-70 transition-opacity">
              <span className="font-arabic font-bold text-primary text-sm leading-tight">{userData.pseudonym}</span>
              <span className="bg-primary/20 border border-primary/40 text-primary font-mono text-[10px] px-1.5 py-0.5 rounded-full">
                LVL {userData.level}
              </span>
            </button>
            <div className="flex items-center gap-1 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-full px-2 py-0.5">
              <span className="text-[#d4af37] text-[11px] font-bold">{pts.toLocaleString()}</span>
              <span className="font-arabic text-[#d4af37]/70 text-[9px]">نقطة</span>
            </div>
          </div>

          {/* Row 2: ID · Rank · $MDD (compact inline) */}
          <button onClick={onOpenProfile}
            className="flex items-center gap-1.5 mb-1.5 active:opacity-70 transition-opacity">
            <span className="font-mono text-[9px] text-primary/70 font-bold tracking-wider">{userData.aliId}</span>
            <span className="text-border/60 text-[8px]">·</span>
            <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wide">{userData.rank}</span>
            <span className="text-border/60 text-[8px]">·</span>
            <span className="font-mono text-[10px] font-black" style={{ color: "#d4af37" }}>
              {userData.mddBalance.toLocaleString()} <span style={{ color: "#d4af37", fontWeight: 900 }}>$MDD</span>
            </span>
          </button>

          {/* Row 3: XP bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #d4af37 0%, #f0d060 100%)" }}
                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }} />
            </div>
            <span className="font-mono text-[9px] text-muted-foreground flex-shrink-0">{currentXp}/{xpPerLevel}</span>
          </div>
        </div>

        {/* ── زر الخروج الآمن ── في أقصى اليسار (بجانب أزرار نظام Telegram) */}
        <button
          onClick={handleClose}
          aria-label="خروج آمن"
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl active:scale-90 transition-transform"
          style={{
            background: "rgba(212,175,55,0.08)",
            border: "1px solid rgba(212,175,55,0.22)",
          }}>
          <LogOut className="w-3.5 h-3.5" style={{ color: "rgba(212,175,55,0.7)" }} />
        </button>
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
  { id: "ambassadors", emoji: "🌍",  title: "سفراء القضية",          subtitle: "الشبكة الدولية",                      accent: "#60a5fa", shadow: "rgba(96,165,250,0.2)" },
  { id: "guardians",   emoji: "🌿",  title: "حراس الأرض",           subtitle: "التوثيق الميداني",                    accent: "#4ade80", shadow: "rgba(74,222,128,0.2)" },
  { id: "guide",       emoji: "📚",  title: "تعليمات الأنشطة",      subtitle: "دليل شامل لاستخدام المنصة",           accent: "#22c55e", shadow: "rgba(34,197,94,0.25)" },
  { id: "community",   emoji: "🎙",  title: "المجلس الاجتماعي",      subtitle: "مساحات النقاش الصوتي",                accent: "#60a5fa", shadow: "rgba(96,165,250,0.22)" },
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
      className={`${card.wide ? "col-span-2" : "col-span-1"} flex ${card.wide ? "flex-row" : "flex-col"} items-center ${card.wide ? "gap-3 px-4 py-3" : "gap-1.5 p-3.5"} rounded-3xl border-2 text-right active:brightness-90 transition-all`}
      style={{
        backgroundColor: `${card.accent}12`,
        borderColor: `${card.accent}50`,
        boxShadow: `0 4px 0 ${card.shadow}`,
      }}
    >
      <div className="text-3xl leading-none flex-shrink-0">{card.emoji}</div>
      <div className={card.wide ? "flex-1 text-right" : "text-center w-full"}>
        <div className="font-arabic font-bold text-foreground text-sm leading-tight">{card.title}</div>
        <div className="font-arabic text-muted-foreground text-[10px] mt-0.5 leading-tight">{card.subtitle}</div>
      </div>
      {card.wide && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${card.accent}25`, border: `1.5px solid ${card.accent}60` }}>
          <span style={{ color: card.accent }} className="text-sm font-bold">›</span>
        </div>
      )}
    </motion.button>
  );
}

// ─── No-Auth Retry Screen ─────────────────────────────────────────────────────
function NoAuthScreen() {
  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 px-8"
      style={{ background: "linear-gradient(160deg,#001a10 0%,#002b1b 50%,#001208 100%)" }}
      dir="rtl">
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 55% 35% at 50% 50%, rgba(212,175,55,0.07) 0%, transparent 70%)" }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-6 w-full max-w-xs relative z-10">

        {/* Icon */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: "rgba(212,175,55,0.08)", border: "2px solid rgba(212,175,55,0.25)" }}>
          <span className="text-4xl">🔐</span>
        </div>

        {/* Message */}
        <div className="text-center">
          <p className="font-arabic text-[#d4af37] font-bold text-xl mb-2 leading-snug">
            تعذّر تحميل البوابة
          </p>
          <p className="font-arabic text-white/50 text-sm leading-7">
            لم تصل بيانات تيليغرام في الوقت المناسب.
            <br />افتح التطبيق من داخل Telegram وأعد المحاولة.
          </p>
        </div>

        {/* Retry button */}
        <motion.button
          onClick={() => window.location.reload()}
          whileTap={{ scale: 0.96 }}
          className="w-full py-4 rounded-2xl font-arabic font-bold text-xl"
          style={{
            background: "linear-gradient(135deg,#d4af37,#f0d060)",
            color: "#002b1b",
            boxShadow: "0 5px 0 rgba(180,140,20,0.55)",
          }}>
          🔄 إعادة المحاولة
        </motion.button>
      </motion.div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useTelegram();
  const telegramId = user?.id?.toString() || "";

  const [activeSection, setActiveSection] = useState<Section>(null);
  const [welcomeDone, setWelcomeDone] = useState(false);
  const [adarUnread, setAdarUnread] = useState(() => getAdarUnreadCount());

  // ── Timeout احتياطي: إذا لم يصل telegramId خلال 6 ثوانٍ أظهر شاشة retry ──
  const [noAuthReady, setNoAuthReady] = useState(false);
  useEffect(() => {
    if (telegramId) { setNoAuthReady(false); return; }
    const t = setTimeout(() => setNoAuthReady(true), 6_000);
    return () => clearTimeout(t);
  }, [telegramId]);

  const { data: userData, isLoading, isError } = useGetMe({
    request: { headers: { "X-Telegram-ID": telegramId } },
    query: { enabled: !!telegramId, retry: 1 },
  });

  useEffect(() => {
    if (!isLoading && userData && !userData.keysConfirmed) setLocation("/onboarding");
  }, [userData, isLoading, setLocation]);

  // If user not found (404) — send back to splash for re-registration
  useEffect(() => {
    if (isError) setLocation("/");
  }, [isError, setLocation]);

  const handleBack = useCallback(() => setActiveSection(null), []);

  // ── شاشة التحميل أو الخطأ ─────────────────────────────────────────────────
  if (isLoading || !userData) {
    // لا يوجد telegramId بعد انتهاء المهلة → شاشة retry
    if (noAuthReady && !telegramId) return <NoAuthScreen />;

    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3"
        style={{ background: "linear-gradient(160deg, #001a10 0%, #002b1b 50%, #001208 100%)" }}
        dir="rtl">
        <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
        {telegramId && (
          <p className="font-arabic text-white/35 text-xs animate-pulse">جاري الاتصال بالبوابة...</p>
        )}
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background text-foreground relative flex flex-col overflow-hidden">

      {/* ── Full-screen welcome sequence (blocks dashboard until done) ── */}
      <AnimatePresence>
        {!welcomeDone && (
          <WelcomeSequence onDone={() => setWelcomeDone(true)} />
        )}
      </AnimatePresence>

      {/* ── Dashboard content (fades in after welcome sequence) ── */}
      {welcomeDone && (
        <motion.div
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}>

          <ProgressHeader userData={userData} onOpenProfile={() => setActiveSection("profile")} />

          {/* Section overlay */}
          <AnimatePresence mode="wait">
            {activeSection !== null && (
              <motion.div key={activeSection}
                className="fixed inset-0 z-30 bg-background overflow-hidden"
                initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}>
                <Suspense fallback={<SectionLoading />}>
                  {activeSection === "adar"        && <AdarSection onBack={handleBack} onRead={() => setAdarUnread(0)} />}
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
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Home grid */}
          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-2" dir="rtl">
            {/* Section cards grid */}
            <div className="grid grid-cols-2 gap-2">

              {/* ★ ADAR MEDIA CENTER BUTTON ★ */}
              <motion.button
                onClick={() => setActiveSection("adar")}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, type: "spring", stiffness: 260, damping: 20 }}
                whileTap={{ scale: 0.96 }}
                className="col-span-2 relative overflow-hidden rounded-3xl flex items-center gap-3 px-4 py-2.5 border-2"
                style={{
                  background: "linear-gradient(135deg, rgba(0,34,0,0.85) 0%, rgba(0,50,10,0.75) 50%, rgba(0,26,6,0.9) 100%)",
                  borderColor: "rgba(212,175,55,0.45)",
                  boxShadow: "0 6px 0 rgba(0,20,0,0.8), 0 0 32px rgba(212,175,55,0.18)",
                  backdropFilter: "blur(12px)",
                }}>
                {/* Shimmer */}
                <motion.div className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(105deg, transparent 30%, rgba(212,175,55,0.08) 50%, transparent 70%)" }}
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: "linear", repeatDelay: 2 }} />

                {/* Notification badge */}
                {adarUnread > 0 && (
                  <motion.div
                    className="absolute top-2.5 left-3 z-20 w-5 h-5 rounded-full flex items-center justify-center font-mono font-black text-[10px] text-white"
                    style={{ background: "radial-gradient(circle, #ef4444, #b91c1c)", boxShadow: "0 0 10px rgba(239,68,68,0.7), 0 0 20px rgba(239,68,68,0.35)" }}
                    animate={{ scale: [1, 1.15, 1], boxShadow: ["0 0 10px rgba(239,68,68,0.7)", "0 0 18px rgba(239,68,68,0.9)", "0 0 10px rgba(239,68,68,0.7)"] }}
                    transition={{ repeat: Infinity, duration: 1.6 }}>
                    {adarUnread}
                  </motion.div>
                )}

                {/* Emblem */}
                <div className="relative z-10 flex-shrink-0 self-stretch flex items-center justify-center" style={{ minWidth: 144 }}>
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 90% 90% at 50% 50%, rgba(212,175,55,0.18) 0%, transparent 70%)" }} />
                  <AdarEmblem size={144} glow />
                </div>

                {/* Text */}
                <div className="flex-1 text-right relative z-10 min-w-0">
                  <div className="font-arabic font-bold text-white text-base leading-tight">مركز ADAR للرصد الإعلامي</div>
                  <div className="font-mono text-[10px] tracking-wide mt-0.5" style={{ color: "rgba(212,175,55,0.6)" }}>
                    Alawite Digital Archive & Research
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <span className="font-arabic text-[10px] rounded-full px-2 py-0.5"
                      style={{ background: "rgba(212,175,55,0.12)", color: "rgba(212,175,55,0.7)", border: "1px solid rgba(212,175,55,0.25)" }}>
                      📡 بيانات رسمية
                    </span>
                    <span className="font-arabic text-[10px] rounded-full px-2 py-0.5"
                      style={{ background: "rgba(212,175,55,0.12)", color: "rgba(212,175,55,0.7)", border: "1px solid rgba(212,175,55,0.25)" }}>
                      🗂 أرشيف رقمي
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative z-10"
                  style={{ background: "rgba(212,175,55,0.15)", border: "1.5px solid rgba(212,175,55,0.4)" }}>
                  <span style={{ color: "#d4af37" }} className="text-sm font-bold">›</span>
                </div>
              </motion.button>

              {/* ★ EARN & KNOWLEDGE BUTTON ★ */}
              <motion.button
                onClick={() => setActiveSection("knowledge")}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.18, type: "spring", stiffness: 260, damping: 18 }}
                whileTap={{ scale: 0.93 }}
                className="col-span-2 relative overflow-hidden rounded-3xl py-3 flex flex-col items-center justify-center gap-1.5 border-2"
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
                  <motion.span className="text-3xl"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 1.6 }}>🧠</motion.span>
                  <div className="text-right">
                    <div className="font-arabic font-bold text-[#002b1b] text-xl leading-tight drop-shadow-sm">ادعم واربح طريق النحل 🐝</div>
                    <div className="font-arabic text-[#002b1b]/70 text-xs">أجب واكسب نقاط الولاء · محرك المعرفة</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative z-10 mt-0.5">
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
                className="col-span-2 relative overflow-hidden rounded-3xl py-3 flex items-center justify-between gap-4 px-5 border-2"
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

              {/* Section cards */}
              {CARDS.map((card, i) =>
                card.id === "community" ? (
                  <div key="community-wrap" className="col-span-1 flex flex-col gap-1">
                    <SectionCard card={card} delay={i * 0.07 + 0.43} onPress={() => setActiveSection("community")} />
                    <SpaceAnnouncementBanner onOpen={() => setActiveSection("community")} />
                  </div>
                ) : (
                  <SectionCard key={card.id} card={card} delay={i * 0.07 + 0.43} onPress={() => setActiveSection(card.id)} />
                )
              )}
            </div>

            {/* Footer motto */}
            <div className="text-center pt-2">
              <p className="font-arabic text-[#d4af37]/40 text-xs italic">حقٌّ لا يموت</p>
            </div>
          </div>

        </motion.div>
      )}

    </div>
  );
}
