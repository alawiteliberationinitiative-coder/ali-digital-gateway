import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, Copy, Check, Eye, EyeOff,
  Shield, Star, Lock, Zap, Users, Gift, Pencil, X, Loader2,
} from "lucide-react";
import { useTelegram } from "../../lib/telegram";
import { useUpdatePseudonym, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserData {
  aliId: string;
  pseudonym: string;
  telegramId: string;
  telegramUsername?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  vaultKey: string;
  identityKey: string;
  masterKey: string;
  mddBalance: number;
  rank: string;
  level: number;
  keysConfirmed: boolean;
  loyaltyPoints: number;
  createdAt: string;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
const GOLD   = "#d4af37";
const GREEN  = "#22c55e";
const GLASS  = "rgba(255,255,255,0.04)";

// ─── Golden Shield with Glassy Green Level ────────────────────────────────────
function GoldenShield({ level }: { level: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 138 }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 60%, rgba(212,175,55,0.22) 0%, transparent 70%)" }} />

      {/* Shield SVG */}
      <svg viewBox="0 0 100 115" className="absolute inset-0 w-full h-full" style={{ filter: "drop-shadow(0 8px 24px rgba(212,175,55,0.45))" }}>
        <defs>
          <linearGradient id="gShield" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%"   stopColor="#f5e070" />
            <stop offset="28%"  stopColor="#d4af37" />
            <stop offset="65%"  stopColor="#9c7d1a" />
            <stop offset="100%" stopColor="#5c460a" />
          </linearGradient>
          <linearGradient id="gShieldInner" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
          </linearGradient>
        </defs>
        {/* Main shield */}
        <path d="M50 4 L92 20 L92 58 C92 80 74 96 50 106 C26 96 8 80 8 58 L8 20 Z"
          fill="url(#gShield)" />
        {/* Highlight bevel */}
        <path d="M50 10 L86 24 L86 58 C86 77 69 92 50 101 C31 92 14 77 14 58 L14 24 Z"
          fill="url(#gShieldInner)" opacity="0.6" />
        {/* Rim */}
        <path d="M50 4 L92 20 L92 58 C92 80 74 96 50 106 C26 96 8 80 8 58 L8 20 Z"
          fill="none" stroke="#f5e070" strokeWidth="1.5" opacity="0.7" />
      </svg>

      {/* Level number — glassy royal green */}
      <div className="relative z-10 flex flex-col items-center" style={{ marginTop: 8 }}>
        <motion.span
          className="font-mono font-black leading-none select-none"
          style={{
            fontSize: level >= 100 ? 28 : level >= 10 ? 34 : 40,
            color: "#00ff88",
            textShadow: "0 0 18px rgba(0,255,136,0.9), 0 0 36px rgba(0,255,136,0.5), 0 2px 0 rgba(0,80,40,0.8)",
            filter: "drop-shadow(0 0 6px rgba(0,255,136,0.7))",
          }}
          animate={{ textShadow: ["0 0 18px rgba(0,255,136,0.9), 0 0 36px rgba(0,255,136,0.5), 0 2px 0 rgba(0,80,40,0.8)", "0 0 28px rgba(0,255,136,1), 0 0 56px rgba(0,255,136,0.6), 0 2px 0 rgba(0,80,40,0.8)", "0 0 18px rgba(0,255,136,0.9), 0 0 36px rgba(0,255,136,0.5), 0 2px 0 rgba(0,80,40,0.8)"] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}>
          {level}
        </motion.span>
        <span className="font-arabic text-[9px] font-bold mt-0.5" style={{ color: "rgba(240,208,80,0.85)", letterSpacing: "0.08em" }}>
          المستوى
        </span>
      </div>
    </div>
  );
}

// ─── Glass Card ───────────────────────────────────────────────────────────────
function GlassCard({ children, accent = GOLD, className = "" }: {
  children: React.ReactNode; accent?: string; className?: string;
}) {
  return (
    <div className={`rounded-2xl p-4 ${className}`}
      style={{
        background: GLASS,
        border: `1.5px solid ${accent}30`,
        backdropFilter: "blur(20px)",
        boxShadow: `0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)`,
      }}>
      {children}
    </div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ icon, label, accent = GOLD }: { icon: React.ReactNode; label: string; accent?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ color: accent }}>{icon}</span>
      <span className="font-arabic font-bold text-sm" style={{ color: accent }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${accent}40, transparent)` }} />
    </div>
  );
}

// ─── Key Row (Seed Phrase) ────────────────────────────────────────────────────
function KeyRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied]     = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const masked = value.replace(/[A-Z0-9]/g, "•");

  return (
    <div className="rounded-xl p-3 mb-2 last:mb-0"
      style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${accent}25` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-arabic text-[11px] font-bold" style={{ color: `${accent}90` }}>{label}</span>
        <div className="flex gap-2">
          <button onClick={() => setRevealed(r => !r)}
            className="p-1 rounded-lg active:scale-90 transition-transform"
            style={{ background: `${accent}15` }}>
            {revealed
              ? <EyeOff className="w-3.5 h-3.5" style={{ color: accent }} />
              : <Eye className="w-3.5 h-3.5" style={{ color: accent }} />}
          </button>
          <button onClick={handleCopy}
            className="p-1 rounded-lg active:scale-90 transition-transform"
            style={{ background: copied ? "rgba(34,197,94,0.2)" : `${accent}15` }}>
            {copied
              ? <Check className="w-3.5 h-3.5 text-green-400" />
              : <Copy className="w-3.5 h-3.5" style={{ color: accent }} />}
          </button>
        </div>
      </div>
      <p className="font-mono text-xs leading-relaxed break-all"
        style={{ color: revealed ? "#e8e8e8" : `${accent}55`, letterSpacing: revealed ? "0.04em" : "0" }}>
        {revealed ? value : masked}
      </p>
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-arabic text-xs font-bold active:scale-95 transition-all"
      style={{ background: copied ? "rgba(34,197,94,0.18)" : "rgba(212,175,55,0.12)", border: `1px solid ${copied ? "rgba(34,197,94,0.4)" : "rgba(212,175,55,0.35)"}`, color: copied ? "#4ade80" : GOLD }}>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "تم النسخ!" : label}
    </button>
  );
}

// ─── Activity Item ────────────────────────────────────────────────────────────
function ActivityItem({ emoji, text, sub, color }: { emoji: string; text: string; sub: string; color: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-arabic text-xs font-bold text-white/80 leading-tight">{text}</p>
        <p className="font-arabic text-[10px] text-white/35 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ─── Rank Config ──────────────────────────────────────────────────────────────
const RANKS = [
  { name: "Initiate",   minPts: 0,    color: "#94a3b8" },
  { name: "Guardian",   minPts: 100,  color: "#22c55e" },
  { name: "Sentinel",   minPts: 300,  color: "#3b82f6" },
  { name: "Champion",   minPts: 700,  color: "#a855f7" },
  { name: "Sovereign",  minPts: 1500, color: "#d4af37" },
  { name: "Legendary",  minPts: 3000, color: "#f97316" },
];
function getRankInfo(pts: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (pts >= RANKS[i].minPts) {
      const next = RANKS[i + 1];
      return { current: RANKS[i], next, progress: next ? (pts - RANKS[i].minPts) / (next.minPts - RANKS[i].minPts) : 1 };
    }
  }
  return { current: RANKS[0], next: RANKS[1], progress: 0 };
}

// ─── Main Profile Section ─────────────────────────────────────────────────────
export function ProfileSection({ onBack, userData }: { onBack: () => void; userData: UserData }) {
  const { user } = useTelegram();
  const queryClient = useQueryClient();
  const telegramId  = userData.telegramId;

  // Live pseudonym (updates optimistically after save)
  const [pseudonym, setPseudonym] = useState(userData.pseudonym);

  // Edit state
  const [isEditing,  setIsEditing]  = useState(false);
  const [editValue,  setEditValue]  = useState("");
  const [editError,  setEditError]  = useState("");

  const updateMutation = useUpdatePseudonym({
    request: { headers: { "x-telegram-id": telegramId } },
  });

  function startEdit() {
    setEditValue(pseudonym);
    setEditError("");
    setIsEditing(true);
  }
  function cancelEdit() {
    setIsEditing(false);
    setEditError("");
  }
  function handleSave() {
    const trimmed = editValue.trim();
    if (trimmed.length < 3) { setEditError("الاسم المستعار قصير جداً (3 أحرف على الأقل)"); return; }
    if (trimmed.length > 30) { setEditError("الاسم المستعار طويل جداً (30 حرفاً كحد أقصى)"); return; }
    if (!/^[\w\u0600-\u06FF\- ]+$/.test(trimmed)) { setEditError("يُسمح بالحروف والأرقام والشرطة والمسافة فقط"); return; }
    setEditError("");
    updateMutation.mutate(
      { data: { pseudonym: trimmed } },
      {
        onSuccess: (updated) => {
          setPseudonym(updated.pseudonym);
          setIsEditing(false);
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: (err) => {
          setEditError((err as { error?: string })?.error ?? "حدث خطأ، حاول مجدداً");
        },
      },
    );
  }

  const photoUrl  = user?.photo_url;
  const firstName = userData.firstName || user?.first_name || "";
  const lastName  = userData.lastName  || user?.last_name  || "";
  const username  = userData.telegramUsername || user?.username;
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || pseudonym;
  const initials  = displayName.slice(0, 2).toUpperCase();

  const rankInfo      = getRankInfo(userData.loyaltyPoints);
  const referralCode  = userData.aliId;
  const referralLink  = `https://t.me/share/url?url=${encodeURIComponent(`انضم إلى مبادرة التحرير العلوي باستخدام كود دعوتي: ${referralCode}`)}&text=${encodeURIComponent("🔰 A.L.I — مبادرة التحرير العلوي")}`;

  const joinDate = new Date(userData.createdAt).toLocaleDateString("ar-SY", { year: "numeric", month: "long", day: "numeric" });

  const activities = [
    ...(userData.level > 1 ? [{ emoji: "🧠", text: `أكملت ${userData.level - 1} مستوى في محرك المعرفة`, sub: `المستوى الحالي: ${userData.level}`, color: GOLD }] : []),
    ...(userData.loyaltyPoints > 0 ? [{ emoji: "⭐", text: `جمعت ${userData.loyaltyPoints.toLocaleString()} نقطة ولاء`, sub: "من الأسئلة ومشاهدة الإعلانات", color: GREEN }] : []),
    ...(userData.keysConfirmed ? [{ emoji: "🔐", text: "أكّدت مفاتيح الأمان الثلاثة", sub: "حسابك محمي بالكامل", color: "#60a5fa" }] : []),
    { emoji: "🌿", text: "انضممت إلى مبادرة التحرير العلوي", sub: joinDate, color: GREEN },
  ];

  return (
    <motion.div
      className="flex flex-col min-h-full"
      style={{ background: "linear-gradient(160deg,#001a10 0%,#002b1b 55%,#001208 100%)" }}
      initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(0,22,13,0.96)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(212,175,55,0.18)" }}>
        <button onClick={onBack}
          className="p-2 rounded-xl active:scale-95 transition-transform"
          style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)" }}>
          <ChevronRight className="w-5 h-5 text-[#d4af37]" />
        </button>
        <div className="flex-1" dir="rtl">
          <h1 className="font-arabic font-bold text-[#d4af37] text-lg leading-tight">ملف العضو</h1>
          <p className="font-arabic text-white/35 text-xs">{userData.aliId}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full px-3 py-1"
          style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
          <span className="font-mono text-xs font-bold text-green-400">LVL {userData.level}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-4">

        {/* ── HERO ── */}
        <div className="flex flex-col items-center pt-6 pb-2 text-center" dir="rtl">
          {/* Avatar */}
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{ border: `2.5px solid ${GOLD}`, boxShadow: `0 0 28px rgba(212,175,55,0.4), 0 0 60px rgba(212,175,55,0.15)` }}>
              {photoUrl
                ? <img src={photoUrl} alt={displayName} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center font-mono font-black text-2xl"
                    style={{ background: "linear-gradient(135deg,#001a10,#004020)", color: GOLD }}>
                    {initials}
                  </div>
              }
            </div>
            {/* Premium badge */}
            {user?.is_premium && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", border: "2px solid #001a10" }}>
                <Star className="w-3 h-3 text-white" fill="white" />
              </div>
            )}
          </div>

          {/* Name */}
          <h2 className="font-arabic font-black text-white text-xl leading-tight mb-0.5">{displayName}</h2>
          {username && <p className="font-mono text-white/40 text-sm mb-1">@{username}</p>}
          <p className="font-arabic text-white/50 text-sm mb-1">{pseudonym}</p>

          {/* Rank badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 mb-5"
            style={{ background: `${rankInfo.current.color}18`, border: `1.5px solid ${rankInfo.current.color}50`, boxShadow: `0 0 16px ${rankInfo.current.color}25` }}>
            <Shield className="w-3.5 h-3.5" style={{ color: rankInfo.current.color }} />
            <span className="font-mono font-bold text-xs" style={{ color: rankInfo.current.color }}>
              {rankInfo.current.name}
            </span>
          </div>

          {/* Golden Shield */}
          <GoldenShield level={userData.level} />
        </div>

        {/* ── IDENTITY CARD ── */}
        <GlassCard accent={GOLD}>
          <SectionLabel icon={<Shield className="w-4 h-4" />} label="هوية العضو" />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.2)" }}>
              <p className="font-arabic text-[10px] text-white/35 mb-1">رقم الهوية</p>
              <p className="font-mono text-[#d4af37] text-xs font-bold tracking-widest">{userData.aliId}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.2)" }}>
              <p className="font-arabic text-[10px] text-white/35 mb-1">الرتبة</p>
              <p className="font-mono text-xs font-bold" style={{ color: rankInfo.current.color }}>{userData.rank}</p>
            </div>
            {/* Pseudonym — editable */}
            <div className="col-span-2 rounded-xl p-3" style={{ background: "rgba(0,0,0,0.2)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-arabic text-[10px] text-white/35">الاسم المستعار</p>
                {!isEditing && (
                  <button onClick={startEdit}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg active:scale-95 transition-transform"
                    style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)" }}>
                    <Pencil className="w-3 h-3 text-[#d4af37]" />
                    <span className="font-arabic text-[10px] text-[#d4af37]">تعديل</span>
                  </button>
                )}
              </div>

              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div key="edit"
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-2">
                    <input
                      dir="auto"
                      value={editValue}
                      onChange={e => { setEditValue(e.target.value); setEditError(""); }}
                      onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") cancelEdit(); }}
                      maxLength={30}
                      autoFocus
                      placeholder="أدخل الاسم المستعار الجديد"
                      className="w-full rounded-lg px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-white/25"
                      style={{
                        background: "rgba(255,255,255,0.07)",
                        border: `1.5px solid ${editError ? "rgba(239,68,68,0.6)" : "rgba(212,175,55,0.5)"}`,
                        caretColor: "#d4af37",
                      }}
                    />
                    {editError && (
                      <p className="font-arabic text-[11px] text-red-400">{editError}</p>
                    )}
                    <div className="flex gap-2">
                      <button onClick={handleSave} disabled={updateMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-arabic text-xs font-bold active:scale-95 transition-all disabled:opacity-60"
                        style={{ background: "rgba(34,197,94,0.18)", border: "1.5px solid rgba(34,197,94,0.45)", color: "#4ade80" }}>
                        {updateMutation.isPending
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Check className="w-3.5 h-3.5" />}
                        {updateMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                      </button>
                      <button onClick={cancelEdit} disabled={updateMutation.isPending}
                        className="px-4 py-2 rounded-lg font-arabic text-xs font-bold active:scale-95 transition-all disabled:opacity-60"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.p key="display"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="font-mono text-white/80 text-sm font-bold">
                    {pseudonym}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <div className="col-span-2 rounded-xl p-3" style={{ background: "rgba(0,0,0,0.2)" }}>
              <p className="font-arabic text-[10px] text-white/35 mb-1">تاريخ الانضمام</p>
              <p className="font-arabic text-white/60 text-xs">{joinDate}</p>
            </div>
          </div>
        </GlassCard>

        {/* ── MDD WALLET ── */}
        <GlassCard accent={GOLD}>
          <SectionLabel icon={<span className="text-base">💰</span>} label="عملاتي $MDD" />
          <div className="rounded-2xl p-4 text-center relative overflow-hidden"
            style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.07),rgba(212,175,55,0.03))", border: `1.5px solid ${GOLD}30` }}>
            {/* Shimmer */}
            <motion.div className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.06) 50%,transparent 65%)" }}
              animate={{ x: ["-100%","100%"] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "linear", repeatDelay: 2 }} />

            <div className="flex items-center justify-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-white/40" />
              <span className="font-arabic text-white/40 text-xs">رصيد مقفل</span>
            </div>
            <p className="font-mono font-black text-3xl" style={{ color: GOLD, textShadow: `0 0 20px ${GOLD}60` }}>
              {userData.mddBalance.toLocaleString()}
            </p>
            <p className="font-mono text-white/50 text-sm mt-0.5">$MDD</p>
            <div className="mt-3 rounded-xl py-2 px-4 inline-flex items-center gap-2"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Lock className="w-3.5 h-3.5 text-white/30" />
              <span className="font-arabic text-white/40 text-xs">تُفتح تلقائياً بعد الإيردروب</span>
            </div>
          </div>
        </GlassCard>

        {/* ── LOYALTY POINTS ── */}
        <GlassCard accent={GREEN}>
          <SectionLabel icon={<Star className="w-4 h-4" />} label="نقاط الولاء" accent={GREEN} />
          <div className="text-center mb-4">
            <motion.p className="font-mono font-black text-4xl leading-none"
              style={{ color: GREEN, textShadow: `0 0 20px ${GREEN}60` }}
              initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
              {userData.loyaltyPoints.toLocaleString()}
            </motion.p>
            <p className="font-arabic text-white/40 text-xs mt-1">مجموع النقاط المكتسبة</p>
          </div>

          {/* Progress to next rank */}
          {rankInfo.next && (
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-arabic text-[10px]" style={{ color: rankInfo.current.color }}>{rankInfo.current.name}</span>
                <span className="font-arabic text-[10px]" style={{ color: rankInfo.next.color }}>{rankInfo.next.name}</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${rankInfo.current.color}, ${rankInfo.next.color})` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(rankInfo.progress * 100, 100)}%` }}
                  transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }} />
              </div>
              <p className="font-arabic text-[10px] text-white/30 mt-1.5 text-center">
                {rankInfo.next.minPts - userData.loyaltyPoints > 0
                  ? `${(rankInfo.next.minPts - userData.loyaltyPoints).toLocaleString()} نقطة للوصول إلى ${rankInfo.next.name}`
                  : `وصلت إلى الرتبة القصوى!`}
              </p>
            </div>
          )}

          {/* How to earn */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { emoji: "🧠", label: "محرك المعرفة", pts: "+10 / مستوى" },
              { emoji: "📺", label: "شاهد وادعم",   pts: "+10 / إعلان" },
            ].map(it => (
              <div key={it.label} className="rounded-xl p-2.5 text-center"
                style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <div className="text-base mb-0.5">{it.emoji}</div>
                <p className="font-arabic text-[10px] text-white/50">{it.label}</p>
                <p className="font-mono text-[11px] font-bold" style={{ color: GREEN }}>{it.pts}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* ── SEED PHRASES / KEYS ── */}
        <GlassCard accent="#60a5fa">
          <SectionLabel icon={<Lock className="w-4 h-4" />} label="مفاتيح استعادة الحساب" accent="#60a5fa" />
          <div className="rounded-xl p-3 mb-3"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <p className="font-arabic text-red-300/80 text-[11px] leading-5 text-center">
              ⚠️ لا تشارك هذه المفاتيح مع أي أحد — إنها كلمات سرك الخاصة
            </p>
          </div>
          <KeyRow label="🔐 مفتاح الخزينة — Vault Key"    value={userData.vaultKey}    accent="#60a5fa" />
          <KeyRow label="🪪 مفتاح الهوية — Identity Key"  value={userData.identityKey} accent="#a78bfa" />
          <KeyRow label="👑 المفتاح الرئيسي — Master Key"  value={userData.masterKey}   accent={GOLD}    />
        </GlassCard>

        {/* ── ACTIVITY LOG ── */}
        <GlassCard accent="#a78bfa">
          <SectionLabel icon={<Zap className="w-4 h-4" />} label="نشاطاتي" accent="#a78bfa" />
          {activities.length === 0
            ? <p className="font-arabic text-white/30 text-xs text-center py-4">لا توجد نشاطات بعد</p>
            : activities.map((a, i) => <ActivityItem key={i} {...a} />)
          }
        </GlassCard>

        {/* ── REFERRAL ── */}
        <GlassCard accent={GREEN}>
          <SectionLabel icon={<Users className="w-4 h-4" />} label="أصدقائي المدعوون" accent={GREEN} />

          {/* Referral code */}
          <div className="rounded-xl p-3 mb-3"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)" }}>
            <p className="font-arabic text-white/40 text-[10px] mb-1">كود الدعوة الخاص بك</p>
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-sm font-bold" style={{ color: GREEN }}>{referralCode}</p>
              <CopyButton text={referralCode} label="نسخ الكود" />
            </div>
          </div>

          {/* Share button */}
          <a href={referralLink} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-arabic font-bold text-sm active:scale-95 transition-all mb-3"
            style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.2),rgba(22,163,74,0.25))", border: `1.5px solid ${GREEN}45`, color: GREEN }}>
            <Gift className="w-4 h-4" />
            مشاركة رابط الدعوة عبر تيليغرام
          </a>

          {/* Count placeholder */}
          <div className="text-center py-3 rounded-xl"
            style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="font-mono font-black text-3xl" style={{ color: GREEN }}>0</p>
            <p className="font-arabic text-white/40 text-xs mt-0.5">صديق مدعو حتى الآن</p>
            <p className="font-arabic text-white/25 text-[10px] mt-1">يُحدَّث تلقائياً عند تسجيل أصدقائك</p>
          </div>
        </GlassCard>

        {/* Bottom motto */}
        <p className="font-arabic text-center text-white/20 text-sm italic pt-2">حقٌّ لا يموت</p>
      </div>
    </motion.div>
  );
}
