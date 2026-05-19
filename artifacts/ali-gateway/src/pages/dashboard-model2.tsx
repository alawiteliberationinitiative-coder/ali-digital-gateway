import React, { useState, useCallback, useEffect, useRef, lazy, Suspense, memo } from "react";
import { useLocation } from "wouter";
import { useTelegram } from "@/lib/telegram";
import { useGetMe } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api";
import { AliEmblem } from "@/components/ui/ali-emblem";
import { motion, AnimatePresence } from "framer-motion";
import { Play, FileText, Radio, Star, MessageSquare, Phone, PhoneOff, PhoneIncoming, Mic, Shield } from "lucide-react";

// ── Lazy-loaded tab sections ──────────────────────────────────────────────────
const MediaSection         = lazy(() => import("./model2/media").then(m => ({ default: m.MediaSection })));
const ReportsSection       = lazy(() => import("./model2/reports").then(m => ({ default: m.ReportsSection })));
const FieldDocsHub         = lazy(() => import("./model2/field-docs-hub").then(m => ({ default: m.FieldDocsHub })));
const DocumentationSection = lazy(() => import("./model2/documentation").then(m => ({ default: m.DocumentationSection })));
const CommunitySection     = lazy(() => import("./sections/community").then(m => ({ default: m.CommunitySection })));
const EarnSection          = lazy(() => import("./model2/earn").then(m => ({ default: m.EarnSection })));
const ProfileSection       = lazy(() => import("./sections/profile").then(m => ({ default: m.ProfileSection })));
const AdminPanel           = lazy(() => import("./admin/AdminPanel").then(m => ({ default: m.AdminPanel })));

// ── Design tokens ─────────────────────────────────────────────────────────────
const GOLD      = "#d4af37";
const ROYAL_BG  = "linear-gradient(160deg, #020e04 0%, #061409 50%, #020e04 100%)";
const HEADER_H  = 68;   // px — must never change to prevent layout shift
const TABBAR_H  = 64;   // px — must never change

// ── Tab definitions ───────────────────────────────────────────────────────────
type Tab = "media" | "reports" | "field" | "community" | "earn" | "messages" | "calls" | "about";
type TabIcon = (props: { size?: number; color?: string }) => JSX.Element | null;

const TABS: { id: Tab; label: string; Icon: TabIcon }[] = [
  { id: "media",     label: "ميديا",       Icon: Play     },
  { id: "reports",   label: "تقارير",      Icon: FileText },
  { id: "field",     label: "رصد وتوثيق", Icon: Radio    },
  { id: "community", label: "المجلس",      Icon: Mic      },
  { id: "earn",      label: "اربح",        Icon: Star     },
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
          className="flex flex-col items-center mb-6 gap-2">
          <div style={{
            width: 96, height: 96, borderRadius: "50%", padding: 3,
            background: `linear-gradient(145deg,${GOLD}60,${GOLD}20)`,
            boxShadow: `0 0 50px ${GOLD}25, 0 0 100px ${GOLD}10`,
          }}>
            <img src="/adar-logo.png" alt="ADAR"
              className="w-full h-full rounded-full object-cover"
              style={{ border: `2px solid ${GOLD}40` }} />
          </div>
          <p className="font-mono font-black text-lg tracking-[0.3em]" style={{ color: GOLD }}>ADAR</p>
          <p className="font-arabic text-xs text-center leading-snug" style={{ color: `${GOLD}99` }}>
            المنصة الإعلامية لمبادرة التحرير العلوي
          </p>
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

// ── About ALI-MDD-ADAR section ────────────────────────────────────────────────
function AboutSection() {
  const cards = [
    { emoji: "🌿", title: "ALI", sub: "مبادرة ALI الرقمية", desc: "منصة متكاملة لتحقيق التواصل والتوثيق والتطوير ضمن بيئة آمنة ومشفرة." },
    { emoji: "💎", title: "MDD", sub: "المنصة الرقمية اللامركزية", desc: "نظام نقاط ومكافآت رقمية يُحفّز المشاركة ويُقدّر إسهام كل عضو في البناء." },
    { emoji: "🛡", title: "ADAR", sub: "منظومة الرصد والتوثيق", desc: "ذراع الرصد والتوثيق الميداني — يحفظ الشهادات ويصون الذاكرة الرقمية للمبادرة." },
  ];
  return (
    <div className="h-full overflow-y-auto" dir="rtl"
      style={{ background: "linear-gradient(160deg,#020e04 0%,#061409 55%,#020e04 100%)" }}>
      <div className="flex flex-col items-center px-5 pt-8 pb-12 gap-7">

        {/* Logo */}
        <div style={{
          width: 96, height: 96, borderRadius: "50%", padding: 3,
          background: `linear-gradient(145deg,${GOLD}60,${GOLD}20)`,
          boxShadow: `0 0 32px ${GOLD}40, 0 8px 24px rgba(0,0,0,0.5)`,
        }}>
          <img src="/adar-logo.png" alt="ADAR"
            className="w-full h-full rounded-full object-cover"
            style={{ border: `2px solid ${GOLD}40` }} />
        </div>

        {/* Main title */}
        <div className="text-center">
          <h1 className="font-arabic font-black text-2xl leading-snug" style={{ color: GOLD }}>
            مبادرة ALI · MDD · ADAR
          </h1>
          <p className="font-arabic text-white/45 text-sm mt-1">البوابة الرقمية المتكاملة</p>
          <div className="mt-3 h-px w-24 mx-auto" style={{ background: `linear-gradient(90deg,transparent,${GOLD}60,transparent)` }} />
        </div>

        {/* Cards */}
        {cards.map(c => (
          <div key={c.title} className="w-full rounded-2xl px-5 py-4 flex gap-4 items-start"
            style={{
              background: "linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))",
              border: `1px solid ${GOLD}22`,
              boxShadow: "0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}>
            <span className="text-3xl flex-shrink-0 mt-0.5">{c.emoji}</span>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono font-black text-base" style={{ color: GOLD }}>{c.title}</span>
                <span className="font-arabic text-xs text-white/50">{c.sub}</span>
              </div>
              <p className="font-arabic text-white/65 text-sm leading-relaxed">{c.desc}</p>
            </div>
          </div>
        ))}

        {/* Footer tag */}
        <p className="font-arabic text-white/25 text-xs text-center">
          🌿 بوابة ALI الرقمية — نُبني معاً، نُوثّق معاً، نرتقي معاً
        </p>
      </div>
    </div>
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

// ── 3D glass icon wrapper ─────────────────────────────────────────────────────
const GLASS_ICON: React.CSSProperties = {
  width: 44, height: 44,
  borderRadius: 14,
  background: "linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 100%)",
  border: "1px solid rgba(255,255,255,0.22)",
  boxShadow: "0 6px 18px rgba(0,0,0,0.45), inset 0 1.5px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.18)",
  display: "flex", alignItems: "center", justifyContent: "center",
};

function GlassZone({ onClick, label, width = 64, badge = 0, children }: {
  onClick: () => void; label: string; width?: number; badge?: number; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} aria-label={label} className="flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform" style={{ width }}>
      <div style={{ position: "relative" }}>
        <div style={GLASS_ICON}>{children}</div>
        {badge > 0 && (
          <div style={{
            position: "absolute", top: -5, left: -5,
            minWidth: 18, height: 18, borderRadius: 9,
            background: "#ef4444",
            border: "2px solid rgba(2,14,4,0.97)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px",
          }}>
            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 10, color: "#fff", lineHeight: 1 }}>
              {badge > 99 ? "99+" : badge}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

// ── Header (fixed height = HEADER_H px, never shifts) ────────────────────────
const Model2Header = memo(function Model2Header({
  userData, onOpenProfile, onOpenMessages, onOpenCalls, onOpenAbout, onOpenAdmin,
  unreadMsgs, missedCalls, isAdmin, adminBadge,
}: {
  userData: { pseudonym: string; level: number; rank: string; mddBalance: number; loyaltyPoints: number; aliId: string };
  onOpenProfile:  () => void;
  onOpenMessages: () => void;
  onOpenCalls:    () => void;
  onOpenAbout:    () => void;
  onOpenAdmin:    () => void;
  unreadMsgs:  number;
  missedCalls: number;
  isAdmin:     boolean;
  adminBadge:  number;
}) {
  return (
    <div className="flex-shrink-0 flex items-stretch" style={{
      height: HEADER_H,
      background: "rgba(2,14,4,0.97)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(212,175,55,0.12)",
      position: "relative", zIndex: 20,
    }}>

      {/* ── Zone 1: Profile ── tap → profile */}
      <button onClick={onOpenProfile} aria-label="الملف الشخصي"
        className="flex items-center gap-2.5 px-4 active:bg-white/5 transition-colors min-w-0"
        style={{ flex: "1 1 0" }}>
        <AliEmblem className="w-10 h-10 flex-shrink-0" animate={false} />
        <div className="min-w-0 text-right" dir="rtl">
          <p className="font-arabic font-bold text-sm text-white/90 truncate leading-tight">{userData.pseudonym}</p>
          <p className="font-mono text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.35)" }}>{userData.aliId}</p>
        </div>
      </button>

      {/* ── Zone 2: Messages ── golden stroke + white-tinted interior, 3D glass */}
      <GlassZone onClick={onOpenMessages} label="الرسائل" badge={unreadMsgs}>
        <MessageSquare
          size={22} color={GOLD}
          fill="rgba(255,255,255,0.10)"
          style={{ filter: `drop-shadow(0 0 5px ${GOLD}99)` }}
        />
      </GlassZone>

      {/* ── Zone 3: Calls ── fully golden, 3D glass */}
      <GlassZone onClick={onOpenCalls} label="المكالمات" badge={missedCalls}>
        <Phone
          size={22} color={GOLD}
          fill={`${GOLD}30`}
          style={{ filter: `drop-shadow(0 0 6px ${GOLD})` }}
        />
      </GlassZone>

      {/* ── Zone 4: Admin shield (admins only) OR ADAR logo ── */}
      {isAdmin ? (
        <button onClick={onOpenAdmin} aria-label="لوحة الإدارة"
          className="flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform relative"
          style={{ width: 68 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 42, height: 42, borderRadius: "50%",
              background: "linear-gradient(145deg, rgba(239,68,68,0.22), rgba(185,28,28,0.12))",
              border: "1.5px solid rgba(239,68,68,0.55)",
              boxShadow: "0 0 14px rgba(239,68,68,0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Shield size={19} color="#ef4444" style={{ filter: "drop-shadow(0 0 5px rgba(239,68,68,0.7))" }} />
            </div>
            {adminBadge > 0 && (
              <div style={{
                position: "absolute", top: -4, left: -4,
                minWidth: 17, height: 17, borderRadius: 9,
                background: "#ef4444", border: "2px solid rgba(2,14,4,0.97)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
              }}>
                <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 9, color: "#fff", lineHeight: 1 }}>
                  {adminBadge > 99 ? "99+" : adminBadge}
                </span>
              </div>
            )}
          </div>
        </button>
      ) : (
        <button onClick={onOpenAbout} aria-label="عن المبادرة"
          className="flex items-center justify-center px-3 flex-shrink-0 active:scale-90 transition-transform"
          style={{ width: 68 }}>
          <div style={{
            width: 46, height: 46, borderRadius: "50%",
            background: "linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))",
            border: `1.5px solid ${GOLD}60`,
            boxShadow: `0 6px 18px rgba(0,0,0,0.4), 0 0 14px ${GOLD}30, inset 0 1px 0 rgba(255,255,255,0.25)`,
            padding: 2,
          }}>
            <img src="/adar-logo.png" alt="ADAR" className="w-full h-full rounded-full object-cover" />
          </div>
        </button>
      )}
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
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative overflow-hidden">

            {/* Active: royal green glowing glass background pill */}
            {active && (
              <motion.div
                layoutId="m2-tab-active-bg"
                className="absolute inset-x-1 inset-y-1.5 rounded-xl"
                style={{
                  background: "linear-gradient(160deg, rgba(0,80,30,0.72) 0%, rgba(0,50,18,0.55) 100%)",
                  border: "1px solid rgba(0,200,80,0.35)",
                  boxShadow: "0 0 14px rgba(0,180,70,0.45), 0 0 4px rgba(0,220,90,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
                  backdropFilter: "blur(8px)",
                }}
                transition={{ type: "spring", stiffness: 420, damping: 38 }}
              />
            )}

            <div className="relative z-10 flex flex-col items-center gap-0.5">
              <Icon
                size={18}
                color={GOLD}
                fill={active ? GOLD : `${GOLD}55`}
                style={{ filter: active ? `drop-shadow(0 0 5px ${GOLD}cc)` : `drop-shadow(0 0 2px ${GOLD}60)` }}
              />
              <span className="font-arabic text-[9px] font-medium leading-none" style={{ color: active ? GOLD : `${GOLD}80` }} dir="rtl">{label}</span>
            </div>
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
  const [showAdmin,    setShowAdmin]    = useState(false);
  const [adminBadge,   setAdminBadge]  = useState(0);
  const [profileInitialTab, setProfileInitialTab] = useState<"profile" | "inbox" | "friends" | "calls">("profile");

  // ── Global incoming-call popup state ─────────────────────────────────────────
  const [ringingCall, setRingingCall] = useState<{ callId: number; partnerPseudonym: string; partnerId: string } | null>(null);
  const callActionsRef = useRef<{ answer: () => void; reject: () => void } | null>(null);

  const handleRingStart = useCallback((
    info: { callId: number; partnerPseudonym: string; partnerId: string },
    actions: { answer: () => void; reject: () => void },
  ) => {
    callActionsRef.current = actions;
    setRingingCall(info);
  }, []);

  const handleRingStop = useCallback(() => {
    setRingingCall(null);
    callActionsRef.current = null;
  }, []);

  // ── Presence heartbeat — keeps user "online" always (not just in profile) ────
  useEffect(() => {
    if (!telegramId) return;
    const hb = () => apiFetch("/api/calls/presence", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: "app" }),
    }).catch(() => {});
    hb();
    const id = setInterval(hb, 20_000);
    return () => clearInterval(id);
  }, [telegramId]);

  // ── Notification badges ──────────────────────────────────────────────────────
  const [unreadMsgs,  setUnreadMsgs]  = useState(0);
  const [missedCalls, setMissedCalls] = useState(0);
  const badgeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBadges = useCallback(async () => {
    if (!telegramId) return;
    try {
      const [msgRes, callRes] = await Promise.all([
        apiFetch("/api/messages/unread-count"),
        apiFetch("/api/calls/missed-count"),
      ]);
      if (msgRes.ok)  { const d = await msgRes.json();  setUnreadMsgs(d.count  ?? 0); }
      if (callRes.ok) { const d = await callRes.json(); setMissedCalls(d.count ?? 0); }
    } catch { /* non-critical */ }
  }, [telegramId]);

  useEffect(() => {
    fetchBadges();
    badgeIntervalRef.current = setInterval(fetchBadges, 15_000);
    const onVisible = () => { if (document.visibilityState === "visible") fetchBadges(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (badgeIntervalRef.current) clearInterval(badgeIntervalRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchBadges]);

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

  // فقط نعيد التوجيه إلى "/" عند انعدام هوية المستخدم (خطأ 401).
  // إذا كان telegramId موجوداً لكن الخادم أخفق (Supabase down) → نعرض
  // شاشة إعادة المحاولة بدلاً من إنشاء حلقة redirect لا نهائية.
  useEffect(() => {
    if (isError && !telegramId) setLocation("/");
  }, [isError, telegramId, setLocation]);

  const handleCloseProfile = useCallback(() => {
    setShowProfile(false);
    setProfileInitialTab("profile");
    setTimeout(fetchBadges, 500);
  }, [fetchBadges]);

  const handleOpenMessages = useCallback(() => {
    setProfileInitialTab("inbox");
    setShowProfile(true);
    // refresh badge after a short delay (user may read threads)
    setTimeout(fetchBadges, 2_000);
  }, [fetchBadges]);

  const handleOpenCalls = useCallback(() => {
    setProfileInitialTab("calls");
    setShowProfile(true);
    // clear missed-call badge immediately
    setMissedCalls(0);
    apiFetch("/api/calls/missed-seen", { method: "POST" }).catch(() => {});
  }, []);

  // صلاحية الأدمن: تُحدَّد من telegramId أو من دور المستخدم
  const isAdmin = !!telegramId && (
    telegramId === "6213952907" ||
    userData?.role === "admin"  ||
    userData?.role === "staff"
  );

  // جلب عدد الإشعارات غير المقروءة للمشرف
  useEffect(() => {
    if (!isAdmin) return;
    const fetchAdminBadge = () => {
      apiFetch("/api/admin/stats")
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.unseenNotifs != null) setAdminBadge(d.unseenNotifs); })
        .catch(() => {});
    };
    fetchAdminBadge();
    const id = setInterval(fetchAdminBadge, 30_000);
    return () => clearInterval(id);
  }, [isAdmin]);

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoading || !userData) {
    // عرض شاشة إعادة المحاولة عند: انعدام الهوية بعد المهلة، أو فشل الخادم مع هوية موجودة
    if ((noAuthReady && !telegramId) || (isError && !!telegramId)) return <NoAuthScreen />;
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
            onOpenProfile={() => { setProfileInitialTab("profile"); setShowProfile(true); }}
            onOpenMessages={handleOpenMessages}
            onOpenCalls={handleOpenCalls}
            onOpenAbout={() => setActiveTab("about")}
            onOpenAdmin={() => setShowAdmin(true)}
            unreadMsgs={unreadMsgs}
            missedCalls={missedCalls}
            isAdmin={isAdmin}
            adminBadge={adminBadge}
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
                  {activeTab === "media"     && <MediaSection        telegramId={telegramId} isAdmin={isAdmin} />}
                  {activeTab === "reports"  && <ReportsSection      telegramId={telegramId} isAdmin={isAdmin} />}
                  {activeTab === "field"    && <FieldDocsHub telegramId={telegramId} />}
                  {activeTab === "community"&& <CommunitySection    onBack={() => setActiveTab("media")} />}
                  {activeTab === "earn"     && <EarnSection         telegramId={telegramId} />}
                  {activeTab === "messages" && <ComingSoonSection icon={<MessageSquare size={40} color={GOLD} />} label="الرسائل" />}
                  {activeTab === "calls"    && <ComingSoonSection icon={<Phone          size={40} color={GOLD} />} label="المكالمات" />}
                  {activeTab === "about"    && <AboutSection />}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Fixed bottom tab bar ── */}
          <Model2TabBar activeTab={activeTab} onTabChange={setActiveTab} />

          {/* ── Admin panel overlay (slide-in from right) ── */}
          <AnimatePresence>
            {showAdmin && (
              <Suspense fallback={null}>
                <AdminPanel onClose={() => { setShowAdmin(false); setAdminBadge(0); }} />
              </Suspense>
            )}
          </AnimatePresence>

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
                    initialTab={profileInitialTab}
                    onOpenCommunity={() => { setShowProfile(false); setActiveTab("community"); }}
                    onRingStart={handleRingStart}
                    onRingStop={handleRingStop}
                  />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Global 25% incoming-call popup — visible app-wide during ring ── */}
          <AnimatePresence>
            {ringingCall && (
              <motion.div
                key="incoming-ring-popup"
                className="fixed bottom-0 left-0 right-0 z-[200] overflow-hidden"
                style={{
                  height: "25dvh",
                  background: "rgba(0,18,10,0.97)",
                  backdropFilter: "blur(20px)",
                  borderTop: "1.5px solid rgba(34,197,94,0.45)",
                  boxShadow: "0 -8px 40px rgba(34,197,94,0.12)",
                }}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 360, damping: 36 }}>

                <div className="flex flex-col items-center justify-center h-full gap-5 px-6" dir="rtl">

                  {/* Caller info row */}
                  <div className="flex items-center gap-4 w-full">
                    <motion.div
                      className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.5)" }}
                      animate={{ boxShadow: ["0 0 0 0 rgba(34,197,94,0.5)", "0 0 0 16px rgba(34,197,94,0)", "0 0 0 0 rgba(34,197,94,0)"] }}
                      transition={{ repeat: Infinity, duration: 1.8 }}>
                      <PhoneIncoming className="w-7 h-7 text-green-400" />
                    </motion.div>
                    <div className="flex flex-col text-right flex-1 min-w-0">
                      <p className="font-arabic font-black text-white text-lg leading-tight truncate">
                        {ringingCall.partnerPseudonym}
                      </p>
                      <p className="font-arabic text-green-400/60 text-xs mt-0.5">مكالمة صوتية واردة</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-10 w-full justify-center">
                    {/* Reject */}
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        onClick={() => { callActionsRef.current?.reject(); }}
                        className="w-[60px] h-[60px] rounded-full flex items-center justify-center active:scale-90 transition-transform"
                        style={{ background: "rgba(239,68,68,0.25)", border: "2px solid rgba(239,68,68,0.55)" }}>
                        <PhoneOff className="w-6 h-6 text-red-400" />
                      </button>
                      <span className="font-arabic text-[11px] text-white/35">رفض</span>
                    </div>

                    {/* Accept */}
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        onClick={() => {
                          callActionsRef.current?.answer();
                          // open profile → calls tab so user sees active call UI
                          setProfileInitialTab("calls");
                          setShowProfile(true);
                        }}
                        className="w-[60px] h-[60px] rounded-full flex items-center justify-center active:scale-90 transition-transform"
                        style={{ background: "rgba(34,197,94,0.25)", border: "2px solid rgba(34,197,94,0.55)" }}>
                        <Phone className="w-6 h-6 text-green-400" />
                      </button>
                      <span className="font-arabic text-[11px] text-white/35">قبول</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
