import { useState, useCallback, useEffect, lazy, Suspense, memo } from "react";
import { useLocation } from "wouter";
import { useTelegram } from "@/lib/telegram";
import { useGetMe } from "@workspace/api-client-react";
import { AliEmblem } from "@/components/ui/ali-emblem";
import { motion, AnimatePresence } from "framer-motion";
import { Play, FileText, Radio, Archive, Star } from "lucide-react";

// ── Lazy-loaded tab sections ──────────────────────────────────────────────────
const MediaSection         = lazy(() => import("./model2/media").then(m => ({ default: m.MediaSection })));
const ReportsSection       = lazy(() => import("./model2/reports").then(m => ({ default: m.ReportsSection })));
const FieldMonitorSection  = lazy(() => import("./model2/field-monitor").then(m => ({ default: m.FieldMonitorSection })));
const DocumentationSection = lazy(() => import("./model2/documentation").then(m => ({ default: m.DocumentationSection })));
const EarnSection          = lazy(() => import("./model2/earn").then(m => ({ default: m.EarnSection })));
const ProfileSection       = lazy(() => import("./sections/profile").then(m => ({ default: m.ProfileSection })));

// ── Design tokens ─────────────────────────────────────────────────────────────
const GOLD      = "#d4af37";
const ROYAL_BG  = "linear-gradient(160deg, #020e04 0%, #061409 50%, #020e04 100%)";
const HEADER_H  = 68;   // px — must never change to prevent layout shift
const TABBAR_H  = 64;   // px — must never change

// ── Tab definitions ───────────────────────────────────────────────────────────
type Tab = "media" | "reports" | "field" | "docs" | "earn";
type TabIcon = (props: { size?: number; color?: string }) => JSX.Element | null;

const TABS: { id: Tab; label: string; Icon: TabIcon }[] = [
  { id: "media",   label: "ميديا",       Icon: Play     },
  { id: "reports", label: "تقارير",      Icon: FileText },
  { id: "field",   label: "رصد ميداني", Icon: Radio    },
  { id: "docs",    label: "توثيق",       Icon: Archive  },
  { id: "earn",    label: "اربح",        Icon: Star     },
];

// ── Loading fallback ──────────────────────────────────────────────────────────
function TabLoading() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 rounded-full animate-spin"
        style={{ borderColor: `${GOLD}35`, borderTopColor: GOLD }} />
    </div>
  );
}

// ── Welcome sequence (identical feel to Model 1, isolated copy) ───────────────
function WelcomeSequence({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true),  5000);
    const t2 = setTimeout(() => onDone(),          6200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8"
      style={{ background: ROYAL_BG }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 1.2, ease: "easeInOut" }}>

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(212,175,55,0.07) 0%, transparent 70%)" }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center text-center w-full max-w-xs" dir="rtl">

        <motion.div
          initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="w-24 h-24 rounded-full overflow-hidden border-2 mb-6 flex-shrink-0"
          style={{ borderColor: `${GOLD}50`, boxShadow: `0 0 50px ${GOLD}25, 0 0 100px ${GOLD}10` }}>
          <img src="/ali-emblem.jpg" alt="ALI" className="w-full h-full object-cover object-top" />
        </motion.div>

        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="w-24 h-px mb-5"
          style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="w-full rounded-2xl border px-6 py-5 mb-4 text-center"
          style={{ borderColor: `${GOLD}30`, background: `${GOLD}05`, boxShadow: `0 0 24px ${GOLD}08, inset 0 1px 0 ${GOLD}15` }}>
          <p className="font-arabic text-2xl font-bold leading-snug mb-1" style={{ color: GOLD }}>مبادرة التحرير العلوي</p>
          <p className="text-base font-bold tracking-[0.25em] mb-3" style={{ color: `${GOLD}cc` }}>A.L.I</p>
          <div className="w-10 h-px mx-auto mb-3" style={{ background: `${GOLD}25` }} />
          <p className="text-white/55 text-xs tracking-widest uppercase mb-1">Alawite Liberation Initiative</p>
          <p className="text-white/35 text-xs tracking-wider mb-4">Management of Diversified Development</p>
          <div className="inline-block rounded-full border px-6 py-1.5"
            style={{ borderColor: `${GOLD}40`, background: `${GOLD}10`, boxShadow: `0 0 16px ${GOLD}15` }}>
            <span className="font-mono font-bold text-lg tracking-widest" style={{ color: GOLD }}>$MDD</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
          <div className="flex items-center gap-3">
            <div className="h-px w-8" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}80)` }} />
            <p className="font-arabic font-bold text-2xl"
              style={{ color: GOLD, textShadow: `0 0 30px ${GOLD}80` }}>حقٌّ لا يموت</p>
            <div className="h-px w-8" style={{ background: `linear-gradient(90deg, ${GOLD}80, transparent)` }} />
          </div>
        </motion.div>

        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="w-24 h-px mt-5"
          style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
      </motion.div>
    </motion.div>
  );
}

// ── Header (fixed height = HEADER_H px, never shifts) ────────────────────────
const Model2Header = memo(function Model2Header({
  userData,
  activeTab,
  onOpenProfile,
}: {
  userData: { pseudonym: string; level: number; rank: string; mddBalance: number; loyaltyPoints: number; aliId: string };
  activeTab: Tab;
  onOpenProfile: () => void;
}) {
  return (
    <div
      className="flex-shrink-0 flex items-center gap-3 px-4"
      style={{
        height: HEADER_H,
        background: "rgba(2,14,4,0.97)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(212,175,55,0.12)",
        position: "relative",
        zIndex: 20,
      }}>

      {/* User avatar with level badge */}
      <button
        onClick={onOpenProfile}
        className="relative flex-shrink-0 active:scale-90 transition-transform"
        aria-label="الملف الشخصي">
        <AliEmblem className="w-10 h-10" animate={false} />
        <span
          className="absolute -bottom-1 -left-1 font-mono text-[8px] font-black px-1 rounded-full"
          style={{ background: GOLD, color: "#001a10", lineHeight: "14px" }}>
          {userData.level}
        </span>
      </button>

      {/* Name + shield + rank — flex-1 to stay stable */}
      <div className="flex-1 min-w-0" dir="rtl">
        <div className="flex items-center gap-1.5 mb-0.5">
          <button onClick={onOpenProfile}
            className="font-arabic font-bold text-sm text-white/90 truncate active:opacity-70">
            {userData.pseudonym}
          </button>
          {/* Golden shield badge */}
          <span className="text-[13px] flex-shrink-0" title="درع المبادرة الذهبي">🛡</span>
          <span
            className="font-mono text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
            style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}35`, color: GOLD }}>
            LVL {userData.level}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          <span className="font-mono">{userData.aliId}</span>
          <span>·</span>
          <span className="font-arabic">{userData.loyaltyPoints.toLocaleString()} نقطة</span>
        </div>
      </div>

      {/* Adar logo — appears ONLY on media (home) tab, animates in/out */}
      {/* Uses a fixed-size placeholder slot to prevent layout shift */}
      <div className="flex-shrink-0 w-9 h-9 relative">
        <AnimatePresence>
          {activeTab === "media" && (
            <motion.div
              key="adar-logo"
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.65 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.65 }}
              transition={{ duration: 0.22 }}>
              <img
                src="/adar-logo.png"
                alt="ADAR"
                className="w-full h-full rounded-full object-cover"
                style={{ border: `1.5px solid ${GOLD}50`, boxShadow: `0 0 14px ${GOLD}28` }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

// ── Bottom tab bar ─────────────────────────────────────────────────────────────
const Model2TabBar = memo(function Model2TabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
}) {
  return (
    <div
      className="flex-shrink-0 flex items-stretch"
      style={{
        height: TABBAR_H,
        background: "rgba(2,14,4,0.97)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(212,175,55,0.12)",
        position: "relative",
        zIndex: 20,
      }}>
      {TABS.map(({ id, label, Icon }) => {
        const active = activeTab === id;
        return (
          <motion.button
            key={id}
            onClick={() => onTabChange(id)}
            whileTap={{ scale: 0.85 }}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
            style={{ color: active ? GOLD : "rgba(255,255,255,0.32)" }}>

            {/* Active top-edge indicator — layout-animated */}
            {active && (
              <motion.div
                layoutId="m2-tab-indicator"
                className="absolute top-0 left-1.5 right-1.5 rounded-b-full"
                style={{ height: 2, background: GOLD }}
                transition={{ type: "spring", stiffness: 420, damping: 38 }}
              />
            )}

            <Icon size={18} color={active ? GOLD : "rgba(255,255,255,0.32)"} />
            <span className="font-arabic text-[9px] font-medium leading-none" dir="rtl">{label}</span>
          </motion.button>
        );
      })}
    </div>
  );
});

// ── No-auth fallback ───────────────────────────────────────────────────────────
function NoAuthScreen() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 px-8"
      style={{ background: ROYAL_BG }} dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-6 w-full max-w-xs">
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: `${GOLD}08`, border: `2px solid ${GOLD}25` }}>
          <span className="text-4xl">🔐</span>
        </div>
        <div className="text-center">
          <p className="font-arabic font-bold text-xl mb-2 leading-snug" style={{ color: GOLD }}>
            تعذّر تحميل البوابة
          </p>
          <p className="font-arabic text-white/50 text-sm leading-7">
            لم تصل بيانات تيليغرام في الوقت المناسب.<br />
            افتح التطبيق من داخل Telegram وأعد المحاولة.
          </p>
        </div>
        <motion.button
          onClick={() => window.location.reload()}
          whileTap={{ scale: 0.96 }}
          className="w-full py-4 rounded-2xl font-arabic font-bold text-xl"
          style={{
            background: `linear-gradient(135deg, ${GOLD}, #f0d060)`,
            color: "#002b1b",
            boxShadow: "0 5px 0 rgba(180,140,20,0.55)",
          }}>
          🔄 إعادة المحاولة
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── Main Model 2 Dashboard ────────────────────────────────────────────────────
export default function DashboardModel2() {
  const [, setLocation] = useLocation();
  const { user }        = useTelegram();
  const telegramId      = user?.id?.toString() || "";

  const [activeTab,    setActiveTab]    = useState<Tab>("media");
  const [welcomeDone,  setWelcomeDone]  = useState(false);
  const [showProfile,  setShowProfile]  = useState(false);

  // Timeout guard for missing telegramId
  const [noAuthReady, setNoAuthReady] = useState(false);
  useEffect(() => {
    if (telegramId) { setNoAuthReady(false); return; }
    const t = setTimeout(() => setNoAuthReady(true), 6_000);
    return () => clearTimeout(t);
  }, [telegramId]);

  const { data: userData, isLoading, isError } = useGetMe({
    request: { headers: { "X-Telegram-ID": telegramId } },
    query:   { enabled: !!telegramId, retry: 1 },
  });

  useEffect(() => {
    if (!isLoading && userData && !userData.keysConfirmed) setLocation("/onboarding");
  }, [userData, isLoading, setLocation]);

  useEffect(() => {
    if (isError) setLocation("/");
  }, [isError, setLocation]);

  const handleCloseProfile = useCallback(() => setShowProfile(false), []);

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoading || !userData) {
    if (noAuthReady && !telegramId) return <NoAuthScreen />;
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3"
        style={{ background: ROYAL_BG }} dir="rtl">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: `${GOLD}40`, borderTopColor: GOLD }} />
        {telegramId && (
          <p className="font-arabic text-white/35 text-xs animate-pulse">جاري الاتصال بالبوابة...</p>
        )}
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden" style={{ background: ROYAL_BG }}>

      {/* ── Full-screen welcome sequence ── */}
      <AnimatePresence>
        {!welcomeDone && <WelcomeSequence onDone={() => setWelcomeDone(true)} />}
      </AnimatePresence>

      {welcomeDone && (
        <>
          {/* ── Fixed header — height never changes ── */}
          <Model2Header
            userData={userData}
            activeTab={activeTab}
            onOpenProfile={() => setShowProfile(true)}
          />

          {/* ── Tab content area — fills remaining space ── */}
          <div className="flex-1 min-h-0 overflow-hidden relative">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                className="absolute inset-0"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18, ease: "easeOut" }}>
                <Suspense fallback={<TabLoading />}>
                  {activeTab === "media"   && <MediaSection        telegramId={telegramId} />}
                  {activeTab === "reports" && <ReportsSection      telegramId={telegramId} />}
                  {activeTab === "field"   && <FieldMonitorSection telegramId={telegramId} />}
                  {activeTab === "docs"    && <DocumentationSection telegramId={telegramId} />}
                  {activeTab === "earn"    && <EarnSection         telegramId={telegramId} />}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Fixed bottom tab bar ── */}
          <Model2TabBar activeTab={activeTab} onTabChange={setActiveTab} />

          {/* ── Profile overlay (slide-in from left) ── */}
          <AnimatePresence>
            {showProfile && (
              <motion.div
                className="fixed inset-0 z-40 overflow-hidden"
                style={{ background: "var(--background)" }}
                initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}>
                <Suspense fallback={<TabLoading />}>
                  <ProfileSection
                    onBack={handleCloseProfile}
                    userData={userData}
                    initialChatPartnerId={undefined}
                    initialTab="profile"
                    onOpenCommunity={() => {}}
                  />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
