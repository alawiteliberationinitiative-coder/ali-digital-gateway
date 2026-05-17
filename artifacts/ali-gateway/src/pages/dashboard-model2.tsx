import React, { useState, useCallback, useEffect, lazy, Suspense, memo } from "react";
import { useLocation } from "wouter";
import { useTelegram } from "@/lib/telegram";
import { useGetMe } from "@workspace/api-client-react";
import { AliEmblem } from "@/components/ui/ali-emblem";
import { motion, AnimatePresence } from "framer-motion";
import { Play, FileText, Radio, Archive, Star, MessageSquare, Phone } from "lucide-react";

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
type Tab = "media" | "reports" | "field" | "docs" | "earn" | "messages" | "calls";
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

// ── Coming-soon placeholder ────────────────────────────────────────────────────
function ComingSoonSection({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4" dir="rtl">
      <div className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: `${GOLD}10`, border: `1.5px solid ${GOLD}25` }}>
        {icon}
      </div>
      <p className="font-arabic font-bold text-lg" style={{ color: GOLD }}>{label}</p>
      <p className="font-arabic text-white/40 text-sm">قريباً</p>
    </div>
  );
}

// ── Header (fixed height = HEADER_H px, never shifts) ────────────────────────
const Model2Header = memo(function Model2Header({
  userData,
  onOpenProfile,
  onOpenMessages,
  onOpenCalls,
}: {
  userData: { pseudonym: string; level: number; rank: string; mddBalance: number; loyaltyPoints: number; aliId: string };
  onOpenProfile:  () => void;
  onOpenMessages: () => void;
  onOpenCalls:    () => void;
}) {
  return (
    <div
      className="flex-shrink-0 flex items-stretch"
      style={{
        height: HEADER_H,
        background: "rgba(2,14,4,0.97)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(212,175,55,0.12)",
        position: "relative",
        zIndex: 20,
      }}>

      {/* ── Zone 1: Profile (avatar + name) ── tap → profile */}
      <button
        onClick={onOpenProfile}
        className="flex items-center gap-2.5 px-4 active:bg-white/5 transition-colors min-w-0"
        style={{ flex: "1 1 0" }}
        aria-label="الملف الشخصي">
        <AliEmblem className="w-10 h-10 flex-shrink-0" animate={false} />
        <div className="min-w-0 text-right" dir="rtl">
          <p className="font-arabic font-bold text-sm text-white/90 truncate leading-tight">
            {userData.pseudonym}
          </p>
          <p className="font-mono text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.35)" }}>
            {userData.aliId}
          </p>
        </div>
      </button>

      {/* ── Zone 2: Messages (center) ── tap → messages */}
      <button
        onClick={onOpenMessages}
        className="flex items-center justify-center active:bg-white/5 transition-colors flex-shrink-0"
        style={{ width: 76 }}
        aria-label="الرسائل">
        <MessageSquare size={26} color="rgba(255,255,255,0.60)" />
      </button>

      {/* ── Zone 3: Calls + ADAR logo ── tap → calls */}
      <button
        onClick={onOpenCalls}
        className="flex items-center justify-center gap-2.5 px-4 active:bg-white/5 transition-colors flex-shrink-0"
        aria-label="المكالمات">
        <Phone size={26} color="rgba(255,255,255,0.60)" />
        <img
          src="/adar-logo.png"
          alt="ADAR"
          className="rounded-full object-cover flex-shrink-0"
          style={{
            width: 44, height: 44,
            border: `1.5px solid ${GOLD}55`,
            boxShadow: `0 0 12px ${GOLD}30`,
          }}
        />
      </button>
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

  // صلاحية الأدمن: تُحدَّد من telegramId أو من دور المستخدم
  const isAdmin = !!telegramId && (
    telegramId === "6213952907" ||
    userData?.role === "admin"  ||
    userData?.role === "staff"
  );

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
            onOpenProfile={() => setShowProfile(true)}
            onOpenMessages={() => setActiveTab("messages")}
            onOpenCalls={() => setActiveTab("calls")}
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
                  {activeTab === "media"    && <MediaSection        telegramId={telegramId} isAdmin={isAdmin} />}
                  {activeTab === "reports"  && <ReportsSection      telegramId={telegramId} />}
                  {activeTab === "field"    && <FieldMonitorSection telegramId={telegramId} />}
                  {activeTab === "docs"     && <DocumentationSection telegramId={telegramId} />}
                  {activeTab === "earn"     && <EarnSection         telegramId={telegramId} />}
                  {activeTab === "messages" && <ComingSoonSection icon={<MessageSquare size={40} color={GOLD} />} label="الرسائل" />}
                  {activeTab === "calls"    && <ComingSoonSection icon={<Phone          size={40} color={GOLD} />} label="المكالمات" />}
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
