import { useState, useEffect, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, Copy, Check, Eye, EyeOff,
  Shield, Star, Lock, Zap, Users, Gift, Pencil, X, Loader2,
  UserPlus, UserCheck, Search, ChevronDown, MessageSquare, Send, Mail,
  Trash2, Ban, Camera, Wallet, Phone, PhoneOff, PhoneIncoming, PhoneMissed,
  MicOff, Mic,
} from "lucide-react";
import { useTelegram } from "../../lib/telegram";
import { apiFetch, getInitData } from "../../lib/api";
import { AvatarFrame } from "../../components/ui/avatar-frame";
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
  civicRole?: string | null;
  photoUrl?:  string | null;
}

interface ChatPartner {
  telegramId: string; pseudonym: string; aliId: string;
  civicRole: string | null; rank: string; level: number;
}

interface ChatMessage {
  id: number; fromTelegramId: string; toTelegramId: string;
  content: string; createdAt: string; readAt: string | null;
}

interface Conversation {
  partnerId: string; pseudonym: string; aliId: string;
  civicRole: string | null; rank: string; level: number;
  lastMessage: string; lastAt: string; unread: number; isMine: boolean;
}

// ─── Call Types ───────────────────────────────────────────────────────────────
type CallStatus = "idle" | "calling" | "ringing" | "active" | "rejected" | "missed" | "ended";
interface ActiveCall {
  callId: number;
  partnerId: string;
  partnerPseudonym: string;
  status: CallStatus;
  isInitiator: boolean;
}

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000)   return "الآن";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} د`;
  if (diff < 86_400_000) return d.toLocaleTimeString("ar-SY", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ar-SY", { month: "short", day: "numeric" });
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
const GOLD   = "#d4af37";
const GREEN  = "#22c55e";
const GLASS  = "rgba(255,255,255,0.04)";

// ─── Golden Shield with Glassy Green Level ────────────────────────────────────
function GoldenShield({ level, size = "lg" }: { level: number; size?: "lg" | "sm" }) {
  const w = size === "sm" ? 52 : 120;
  const h = size === "sm" ? 60 : 138;
  const fontSize = size === "sm"
    ? (level >= 100 ? 12 : level >= 10 ? 15 : 18)
    : (level >= 100 ? 28 : level >= 10 ? 34 : 40);
  const labelSize = size === "sm" ? "6px" : "9px";
  const glowSpread = size === "sm" ? "0 4px 14px" : "0 8px 24px";
  const mt = size === "sm" ? 4 : 8;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: w, height: h }}>
      <div className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 60%, rgba(212,175,55,0.22) 0%, transparent 70%)" }} />
      <svg viewBox="0 0 100 115" className="absolute inset-0 w-full h-full"
        style={{ filter: `drop-shadow(${glowSpread} rgba(212,175,55,0.45))` }}>
        <defs>
          <linearGradient id="gShield" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%"   stopColor="#f5e070" />
            <stop offset="28%"  stopColor="#d4af37" />
            <stop offset="65%"  stopColor="#9c7d1a" />
            <stop offset="100%" stopColor="#5c460a" />
          </linearGradient>
          <linearGradient id="gShieldInner" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
          </linearGradient>
        </defs>
        <path d="M50 4 L92 20 L92 58 C92 80 74 96 50 106 C26 96 8 80 8 58 L8 20 Z" fill="url(#gShield)" />
        <path d="M50 10 L86 24 L86 58 C86 77 69 92 50 101 C31 92 14 77 14 58 L14 24 Z" fill="url(#gShieldInner)" opacity="0.6" />
        <path d="M50 4 L92 20 L92 58 C92 80 74 96 50 106 C26 96 8 80 8 58 L8 20 Z" fill="none" stroke="#f5e070" strokeWidth="1.5" opacity="0.7" />
      </svg>
      <div className="relative z-10 flex flex-col items-center" style={{ marginTop: mt }}>
        <motion.span
          className="font-mono font-black leading-none select-none"
          style={{
            fontSize,
            color: "#00ff88",
            textShadow: "0 0 12px rgba(0,255,136,0.9), 0 0 24px rgba(0,255,136,0.5), 0 1px 0 rgba(0,80,40,0.8)",
            filter: "drop-shadow(0 0 4px rgba(0,255,136,0.7))",
          }}
          animate={{ textShadow: ["0 0 12px rgba(0,255,136,0.9), 0 0 24px rgba(0,255,136,0.5)", "0 0 20px rgba(0,255,136,1), 0 0 40px rgba(0,255,136,0.6)", "0 0 12px rgba(0,255,136,0.9), 0 0 24px rgba(0,255,136,0.5)"] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}>
          {level}
        </motion.span>
        <span className="font-arabic font-bold mt-0.5" style={{ fontSize: labelSize, color: "rgba(240,208,80,0.85)", letterSpacing: "0.06em" }}>
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

  const masked = value.replace(/./g, "*");

  return (
    <div className="rounded-2xl p-3 mb-2 last:mb-0"
      style={{
        background: "linear-gradient(135deg, rgba(212,175,55,0.14) 0%, rgba(0,0,0,0.18) 100%)",
        border: "1.5px solid rgba(212,175,55,0.45)",
        boxShadow: "0 2px 12px rgba(212,175,55,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-arabic text-[11px] font-bold" style={{ color: "#22c55e", textShadow: "0 0 8px rgba(34,197,94,0.4)" }}>{label}</span>
        <div className="flex gap-2">
          <button onClick={() => setRevealed(r => !r)}
            className="p-1.5 rounded-lg active:scale-90 transition-transform"
            style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)" }}>
            {revealed
              ? <EyeOff className="w-3.5 h-3.5" style={{ color: "#d4af37" }} />
              : <Eye className="w-3.5 h-3.5" style={{ color: "#d4af37" }} />}
          </button>
          <button onClick={handleCopy}
            className="p-1.5 rounded-lg active:scale-90 transition-transform"
            style={{ background: copied ? "rgba(34,197,94,0.2)" : "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)" }}>
            {copied
              ? <Check className="w-3.5 h-3.5 text-green-400" />
              : <Copy className="w-3.5 h-3.5" style={{ color: "#d4af37" }} />}
          </button>
        </div>
      </div>
      <p className="font-mono text-xs leading-relaxed break-all"
        style={{ color: revealed ? "#f0f0f0" : "rgba(212,175,55,0.7)", letterSpacing: revealed ? "0.04em" : "0.12em",
          textShadow: revealed ? "none" : "0 0 6px rgba(212,175,55,0.3)" }}>
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

// ─── Civic Role Mini Shield ────────────────────────────────────────────────────
function CivicRoleShield({ role, size = "sm", noWrapper = false }: { role: string | null | undefined; size?: "xs" | "sm" | "md"; noWrapper?: boolean }) {
  if (!role) return null;
  const isGuardian = role === "guardian";
  const label = isGuardian ? "حارس الأرض" : "سفير القضية";
  const w = size === "xs" ? 36 : size === "md" ? 64 : 48;
  const h = size === "xs" ? 40 : size === "md" ? 72 : 54;

  const shieldSvg = (
    <svg viewBox="0 0 32 36" width={w} height={h} fill="none" xmlns="http://www.w3.org/2000/svg"
      style={noWrapper ? { filter: "drop-shadow(0 2px 12px rgba(212,175,55,0.7)) drop-shadow(0 0 22px rgba(212,175,55,0.45)) drop-shadow(0 -1px 6px rgba(255,248,160,0.3))" } : undefined}>
        <defs>
          {/* Shield gradient */}
          <linearGradient id="crs-shield" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5d76e" />
            <stop offset="55%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#9a6e00" />
          </linearGradient>

          {/* Sword 1 blade gradient (bottom-left → top-right) */}
          <linearGradient id="crs-sw1" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#7a4e00" />
            <stop offset="35%" stopColor="#d4af37" />
            <stop offset="65%" stopColor="#fff8c8" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
          {/* Sword 2 blade gradient (bottom-right → top-left) */}
          <linearGradient id="crs-sw2" x1="1" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#7a4e00" />
            <stop offset="35%" stopColor="#d4af37" />
            <stop offset="65%" stopColor="#fff8c8" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
          {/* Guard gradient */}
          <linearGradient id="crs-guard" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f5d76e" />
            <stop offset="100%" stopColor="#9a6e00" />
          </linearGradient>
          {/* Sword glow filter */}
          <filter id="crs-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Wing left gradient */}
          <linearGradient id="crs-wl" x1="1" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#6b3a00" />
            <stop offset="40%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#fff8a0" />
          </linearGradient>
          {/* Wing right gradient */}
          <linearGradient id="crs-wr" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#6b3a00" />
            <stop offset="40%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#fff8a0" />
          </linearGradient>
          {/* Wing glow radial */}
          <radialGradient id="crs-wg" cx="50%" cy="65%" r="55%">
            <stop offset="0%" stopColor="#fff8a0" stopOpacity="1" />
            <stop offset="60%" stopColor="#d4af37" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
          </radialGradient>
          {/* Wing filter */}
          <filter id="crs-wglow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.9" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Shield body ── */}
        <path d="M16 2 L29 6 C29 16 24 27 16 34 C8 27 3 16 3 6 Z"
          fill="#7a4e00" opacity="0.3" transform="translate(0.4,0.7)" />
        <path d="M16 2 L29 6 C29 16 24 27 16 34 C8 27 3 16 3 6 Z"
          fill="url(#crs-shield)" />
        <path d="M16 2 L29 6 C29 10 25 13 20 17 C16 14 8 10 3 6 Z"
          fill="#f5d76e" opacity="0.38" />
        <path d="M16 2 L29 6 C29 16 24 27 16 34 C8 27 3 16 3 6 Z"
          fill="none" stroke="#f0c030" strokeWidth="0.8" opacity="0.9" />
        <path d="M16 4 L27.5 7.5 C27.5 16 23 25.5 16 32 C9 25.5 4.5 16 4.5 7.5 Z"
          fill="none" stroke="#7a4e00" strokeWidth="0.4" opacity="0.5" />

        {isGuardian ? (
          /* ── Crossed 3D Golden Swords ── */
          <g filter="url(#crs-glow)">
            {/* ── Sword 1: hilt bottom-left → tip top-right ── */}
            {/* Pommel */}
            <ellipse cx="5.8" cy="30.8" rx="2" ry="1.3"
              transform="rotate(-45 5.8 30.8)" fill="url(#crs-guard)" />
            <ellipse cx="5.5" cy="30.5" rx="1" ry="0.6"
              transform="rotate(-45 5.5 30.5)" fill="#fff8c8" opacity="0.7" />
            {/* Grip */}
            <rect x="-0.8" y="-2.5" width="2" height="5" rx="0.8"
              transform="translate(8.8,27) rotate(-45)" fill="url(#crs-guard)" />
            <rect x="0.2" y="-2.5" width="0.6" height="5" rx="0.3"
              transform="translate(8.8,27) rotate(-45)" fill="#fff8c8" opacity="0.5" />
            {/* Guard */}
            <rect x="-3.2" y="-0.9" width="6.4" height="1.8" rx="0.9"
              transform="translate(12.5,23.5) rotate(-45)" fill="url(#crs-guard)" />
            <rect x="-3" y="-0.9" width="6" height="0.7" rx="0.4"
              transform="translate(12.5,23.5) rotate(-45)" fill="#fff8c8" opacity="0.5" />
            {/* Blade body */}
            <polygon points="14.5,21.5 15.8,22.8 27,7.5 25.7,6.2"
              fill="url(#crs-sw1)" />
            {/* Blade edge highlight */}
            <line x1="15.1" y1="22.2" x2="26.4" y2="6.8"
              stroke="#fff8c8" strokeWidth="0.5" opacity="0.75" />
            {/* Blade tip */}
            <polygon points="25.7,6.2 27,7.5 28.5,5 26.8,3.8"
              fill="url(#crs-sw1)" />

            {/* ── Sword 2: hilt bottom-right → tip top-left (mirror) ── */}
            {/* Pommel */}
            <ellipse cx="26.2" cy="30.8" rx="2" ry="1.3"
              transform="rotate(45 26.2 30.8)" fill="url(#crs-guard)" />
            <ellipse cx="26.5" cy="30.5" rx="1" ry="0.6"
              transform="rotate(45 26.5 30.5)" fill="#fff8c8" opacity="0.7" />
            {/* Grip */}
            <rect x="-1.2" y="-2.5" width="2" height="5" rx="0.8"
              transform="translate(23.2,27) rotate(45)" fill="url(#crs-guard)" />
            <rect x="-0.2" y="-2.5" width="0.6" height="5" rx="0.3"
              transform="translate(23.2,27) rotate(45)" fill="#fff8c8" opacity="0.5" />
            {/* Guard */}
            <rect x="-3.2" y="-0.9" width="6.4" height="1.8" rx="0.9"
              transform="translate(19.5,23.5) rotate(45)" fill="url(#crs-guard)" />
            <rect x="-3" y="-0.9" width="6" height="0.7" rx="0.4"
              transform="translate(19.5,23.5) rotate(45)" fill="#fff8c8" opacity="0.5" />
            {/* Blade body */}
            <polygon points="17.5,21.5 16.2,22.8 5,7.5 6.3,6.2"
              fill="url(#crs-sw2)" />
            {/* Blade edge highlight */}
            <line x1="16.9" y1="22.2" x2="5.6" y2="6.8"
              stroke="#fff8c8" strokeWidth="0.5" opacity="0.75" />
            {/* Blade tip */}
            <polygon points="6.3,6.2 5,7.5 3.5,5 5.2,3.8"
              fill="url(#crs-sw2)" />

            {/* Cross point diamond accent */}
            <circle cx="16" cy="17.2" r="1.4" fill="#fff8c8" opacity="0.9" />
            <circle cx="16" cy="17.2" r="0.7" fill="#d4af37" />
          </g>
        ) : (
          /* ── 3D Golden Angelic Wings ── */
          <g filter="url(#crs-wglow)">
            {/* Glow aura behind wings */}
            <ellipse cx="16" cy="20" rx="12" ry="9" fill="url(#crs-wg)" opacity="0.55" />

            {/* ── Left wing (3 feather layers) ── */}
            {/* Upper primary feathers */}
            <path d="M15.5,21 C13,18 9.5,13.5 5.5,10 C8,13 11,17.5 14.5,20.5 Z"
              fill="url(#crs-wl)" opacity="0.95" />
            {/* Mid feathers */}
            <path d="M15.5,21 C11.5,20 6.5,19 3.5,16 C6.5,18.5 11,20 15,21 Z"
              fill="url(#crs-wl)" opacity="0.85" />
            {/* Lower coverts */}
            <path d="M15.5,21 C12,22.5 6.5,23.5 4,21.5 C7,22.5 11.5,22 15.5,21.5 Z"
              fill="url(#crs-wl)" opacity="0.75" />
            {/* Feather detail lines */}
            <line x1="15.5" y1="21" x2="5.5" y2="10" stroke="#fff8c8" strokeWidth="0.5" opacity="0.6" />
            <line x1="15.5" y1="21" x2="3.5" y2="16" stroke="#fff8c8" strokeWidth="0.5" opacity="0.5" />
            <line x1="15.5" y1="21" x2="4" y2="21.5" stroke="#fff8c8" strokeWidth="0.5" opacity="0.4" />
            {/* Inner feather ribs */}
            <line x1="14" y1="20" x2="7" y2="12" stroke="#fff8c8" strokeWidth="0.35" opacity="0.4" />
            <line x1="13.5" y1="20.5" x2="6" y2="17" stroke="#fff8c8" strokeWidth="0.35" opacity="0.35" />

            {/* ── Right wing (mirror) ── */}
            <path d="M16.5,21 C19,18 22.5,13.5 26.5,10 C24,13 21,17.5 17.5,20.5 Z"
              fill="url(#crs-wr)" opacity="0.95" />
            <path d="M16.5,21 C20.5,20 25.5,19 28.5,16 C25.5,18.5 21,20 17,21 Z"
              fill="url(#crs-wr)" opacity="0.85" />
            <path d="M16.5,21 C20,22.5 25.5,23.5 28,21.5 C25,22.5 20.5,22 16.5,21.5 Z"
              fill="url(#crs-wr)" opacity="0.75" />
            <line x1="16.5" y1="21" x2="26.5" y2="10" stroke="#fff8c8" strokeWidth="0.5" opacity="0.6" />
            <line x1="16.5" y1="21" x2="28.5" y2="16" stroke="#fff8c8" strokeWidth="0.5" opacity="0.5" />
            <line x1="16.5" y1="21" x2="28" y2="21.5" stroke="#fff8c8" strokeWidth="0.5" opacity="0.4" />
            <line x1="18" y1="20" x2="25" y2="12" stroke="#fff8c8" strokeWidth="0.35" opacity="0.4" />
            <line x1="18.5" y1="20.5" x2="26" y2="17" stroke="#fff8c8" strokeWidth="0.35" opacity="0.35" />

            {/* Center glowing orb */}
            <circle cx="16" cy="21.5" r="2.5" fill="#fff8a0" opacity="0.4" />
            <circle cx="16" cy="21.5" r="1.6" fill="#d4af37" opacity="0.9" />
            <circle cx="16" cy="21.5" r="0.8" fill="#fff8c8" />
          </g>
        )}
      </svg>

  );

  if (noWrapper) return shieldSvg;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full"
      style={{ background: "rgba(212,175,55,0.13)", border: "1px solid rgba(212,175,55,0.45)",
               padding: size === "xs" ? "2px 7px" : "3px 10px" }}>
      {shieldSvg}
      <span className="font-arabic font-bold"
        style={{ fontSize: size === "xs" ? 10 : 11, color: "#d4af37", lineHeight: 1 }}>
        {label}
      </span>
    </div>
  );
}

// ─── Network Types ─────────────────────────────────────────────────────────────
interface NetUser {
  telegramId: string; aliId: string; pseudonym: string; rank: string; level: number;
  civicRole?: string | null;
}

// ─── Follow Button (profile context) ──────────────────────────────────────────
function ProfileFollowButton({ targetTelegramId, myTelegramId }: { targetTelegramId: string; myTelegramId: string }) {
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!myTelegramId || !targetTelegramId || myTelegramId === targetTelegramId) return;
    apiFetch("/api/users/follow-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramIds: [targetTelegramId] }),
    }).then(r => r.ok ? r.json() : {})
      .then(map => setIsFollowing(!!map[targetTelegramId]));
  }, [targetTelegramId, myTelegramId]);

  if (myTelegramId === targetTelegramId || isFollowing === null) return null;

  const toggle = async () => {
    setLoading(true);
    const method = isFollowing ? "DELETE" : "POST";
    await apiFetch(`/api/users/follow/${targetTelegramId}`, { method });
    setIsFollowing(p => !p);
    setLoading(false);
  };

  return (
    <button onClick={toggle} disabled={loading}
      className="flex items-center gap-1 px-2.5 py-1 rounded-xl font-arabic text-[10px] font-bold active:scale-90 transition-all flex-shrink-0"
      style={{
        background: isFollowing ? "rgba(74,222,128,0.08)" : "rgba(96,165,250,0.1)",
        border: `1px solid ${isFollowing ? "rgba(74,222,128,0.25)" : "rgba(96,165,250,0.25)"}`,
        color: isFollowing ? "#4ade80" : "#60a5fa",
      }}>
      {loading ? <Loader2 className="w-3 h-3 animate-spin" />
        : isFollowing ? <><UserCheck className="w-3 h-3" />صديق</>
        : <><UserPlus className="w-3 h-3" />إضافة</>}
    </button>
  );
}

// ─── Network Section (Followers / Following) ───────────────────────────────────
// ─── Referral Count (real-time) ───────────────────────────────────────────────
function ReferralCount({ telegramId }: { telegramId: string }) {
  const [count, setCount]     = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!telegramId) return;
    apiFetch("/api/users/me/referrals")
      .then(r => r.ok ? r.json() as Promise<{ count: number }> : Promise.reject())
      .then(d => { setCount(d.count); setLoading(false); })
      .catch(() => { setCount(0); setLoading(false); });
  }, [telegramId]);

  return (
    <div className="text-center py-3 rounded-xl"
      style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {loading ? (
        <div className="h-9 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-[#22c55e] border-t-transparent animate-spin" />
        </div>
      ) : (
        <p className="font-mono font-black text-3xl" style={{ color: GREEN }}>{count ?? 0}</p>
      )}
      <p className="font-arabic text-white/40 text-xs mt-0.5">صديق مدعو حتى الآن</p>
      <p className="font-arabic text-white/25 text-[10px] mt-1">يُحدَّث تلقائياً عند تسجيل أصدقائك</p>
    </div>
  );
}

function NetworkSection({ myTelegramId, onMessage, onViewFriend, autoExpand, onCall }: {
  myTelegramId: string;
  onMessage?: (u: NetUser) => void;
  onViewFriend?: (u: NetUser) => void;
  autoExpand?: boolean;
  onCall?: (u: NetUser) => void;
}) {
  type FriendUser = NetUser & { isMutual: boolean };
  const [expanded, setExpanded]     = useState(!!autoExpand);
  const [friends, setFriends]       = useState<FriendUser[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [query, setQuery]           = useState("");
  const [searchRes, setSearchRes]   = useState<NetUser[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const loadFriends = useCallback(async () => {
    setLoadingList(true);
    const r = await apiFetch("/api/users/me/friends");
    if (r.ok) setFriends(await r.json());
    setLoadingList(false);
  }, [myTelegramId]);

  useEffect(() => { if (expanded) loadFriends(); }, [expanded, loadFriends]);

  useEffect(() => {
    if (!showSearch || query.length < 2) { setSearchRes([]); return; }
    const t = setTimeout(async () => {
      const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) setSearchRes(await res.json());
    }, 350);
    return () => clearTimeout(t);
  }, [query, showSearch]);

  const displayList = showSearch ? searchRes : friends;

  return (
    <div className="space-y-3">
      {/* Friend count + search bar */}
      <div className="flex items-center gap-3" dir="rtl">
        <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5"
          style={{ background: "rgba(96,165,250,0.08)", border: "1.5px solid rgba(96,165,250,0.25)" }}>
          <Users className="w-4 h-4" style={{ color: "#60a5fa" }} />
          <span className="font-mono font-black text-lg" style={{ color: "#60a5fa" }}>{friends.length}</span>
          <span className="font-arabic text-xs text-white/40">صديق</span>
        </div>
        <button onClick={() => { setShowSearch(p => !p); if (!expanded) setExpanded(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl active:scale-95 transition-all"
          style={{ background: showSearch ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${showSearch ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.08)"}` }}>
          <Search className="w-4 h-4 text-white/40" />
          <span className="font-arabic text-xs text-white/40">بحث</span>
        </button>
      </div>

      {/* Search input */}
      {showSearch && (
        <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5"
          style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.09)" }}>
          <Search className="w-4 h-4 text-white/25 flex-shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="ابحث بالاسم المستعار أو رقم الهوية..."
            className="flex-1 bg-transparent font-arabic text-sm text-white/75 outline-none placeholder:text-white/20"
            dir="rtl" autoFocus />
          {query && <button onClick={() => { setQuery(""); setSearchRes([]); }} className="text-white/30"><X className="w-3.5 h-3.5" /></button>}
        </div>
      )}

      {/* Friend list */}
      <div className="space-y-2">
        {loadingList && !showSearch ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-white/30" />
          </div>
        ) : displayList.length === 0 ? (
          <p className="font-arabic text-xs text-white/20 text-center py-8">
            {showSearch && query.length < 2 ? "اكتب للبحث..." : showSearch ? "لا نتائج" : "لا أصدقاء بعد — أرسل دعوة لتبدأ!"}
          </p>
        ) : (
          displayList.map(u => (
            <NetUserRow key={u.telegramId} user={u} myTelegramId={myTelegramId}
              isMutual={"isMutual" in u ? (u as FriendUser).isMutual : false}
              onMessage={onMessage} onViewProfile={onViewFriend} onCall={onCall} />
          ))
        )}
      </div>
    </div>
  );
}

function NetUserRow({ user, myTelegramId, onMessage, onViewProfile, onCall }: { user: NetUser; myTelegramId: string; onMessage?: (u: NetUser) => void; onViewProfile?: (u: NetUser) => void; isMutual?: boolean; onCall?: (u: NetUser) => void }) {
  const RANKS: Record<string, string> = {
    Initiate: "#94a3b8", Guardian: "#22c55e", Sentinel: "#3b82f6",
    Champion: "#a855f7", Sovereign: "#d4af37", Legendary: "#f97316",
  };
  const rankColor = RANKS[user.rank] ?? "#94a3b8";

  return (
    <div className="rounded-2xl px-3 py-3"
      style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.18)", backdropFilter: "blur(8px)" }}
      dir="rtl">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <button
          onClick={() => onViewProfile ? onViewProfile(user) : undefined}
          disabled={!onViewProfile}
          className="w-11 h-11 rounded-full flex items-center justify-center font-mono font-black text-base flex-shrink-0 active:scale-90 transition-transform"
          style={{ background: `${rankColor}18`, border: `2px solid ${rankColor}40`, color: rankColor, cursor: onViewProfile ? "pointer" : "default",
            boxShadow: `0 0 12px ${rankColor}15` }}>
          {user.pseudonym.slice(0, 2).toUpperCase()}
        </button>

        {/* Identity */}
        <button onClick={() => onViewProfile ? onViewProfile(user) : undefined} disabled={!onViewProfile}
          className="flex-1 min-w-0 text-right active:opacity-70 transition-opacity"
          style={{ cursor: onViewProfile ? "pointer" : "default" }}>
          <p className="font-arabic text-sm font-bold text-white/90 truncate">{user.pseudonym}</p>
          <p className="font-mono text-[10px] mt-0.5" style={{ color: `${GOLD}70` }}>{user.aliId}</p>
        </button>

        {/* Action buttons — large & tap-friendly */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onCall && myTelegramId !== user.telegramId && (
            <button onClick={() => onCall(user)}
              className="w-11 h-11 flex items-center justify-center rounded-2xl active:scale-90 transition-all"
              style={{ background: "rgba(34,197,94,0.14)", border: "1.5px solid rgba(34,197,94,0.4)", boxShadow: "0 2px 10px rgba(34,197,94,0.15)" }}>
              <Phone className="w-5 h-5 text-green-400" />
            </button>
          )}
          {onMessage && myTelegramId !== user.telegramId && (
            <button onClick={() => onMessage(user)}
              className="w-11 h-11 flex items-center justify-center rounded-2xl active:scale-90 transition-all"
              style={{ background: "rgba(212,175,55,0.14)", border: `1.5px solid rgba(212,175,55,0.4)`, boxShadow: `0 2px 10px rgba(212,175,55,0.15)` }}>
              <MessageSquare className="w-5 h-5" style={{ color: GOLD }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Friend Profile View ──────────────────────────────────────────────────────
function FriendProfileView({ friend, myTelegramId, onBack, onMessage, onCall }: {
  friend: NetUser; myTelegramId: string; onBack: () => void;
  onMessage: (u: NetUser) => void;
  onCall: (u: NetUser) => void;
}) {
  const RANK_COLORS: Record<string, string> = { Initiate: "#94a3b8", Guardian: "#22c55e", Sentinel: "#3b82f6", Champion: "#a855f7", Sovereign: "#d4af37", Legendary: "#f97316" };
  const rankColor = RANK_COLORS[friend.rank] ?? "#94a3b8";

  return (
    <motion.div
      className="absolute inset-0 z-10 flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(160deg,#001a10 0%,#002b1b 55%,#001208 100%)" }}
      initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-4 pb-3" dir="rtl"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onBack}
          className="p-2 rounded-xl active:scale-95 transition-transform"
          style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)" }}>
          <ChevronRight className="w-5 h-5 text-[#d4af37]" />
        </button>
        <span className="font-arabic font-bold text-white/80 text-base">ملف الصديق</span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5" dir="rtl">

        {/* Avatar + info */}
        <div className="flex flex-col items-center gap-3 pb-2">
          <div className="w-24 h-24 rounded-full flex items-center justify-center font-mono font-black text-3xl"
            style={{ background: `${rankColor}18`, border: `2.5px solid ${rankColor}50`, color: rankColor, boxShadow: `0 0 28px ${rankColor}22` }}>
            {friend.pseudonym.slice(0, 2).toUpperCase()}
          </div>
          <div className="text-center">
            <p className="font-arabic font-bold text-white text-lg">{friend.pseudonym}</p>
            <p className="font-mono text-[10px] text-white/35 mt-0.5">{friend.aliId}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="px-3 py-1 rounded-full font-mono text-xs font-bold"
              style={{ background: `${rankColor}15`, border: `1px solid ${rankColor}35`, color: rankColor }}>
              {friend.rank}
            </span>
            <span className="px-3 py-1 rounded-full font-mono text-xs"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}>
              LVL {friend.level}
            </span>
          </div>
          {friend.civicRole && <CivicRoleShield role={friend.civicRole} size="sm" />}
          <ProfileFollowButton targetTelegramId={friend.telegramId} myTelegramId={myTelegramId} />
        </div>

        {/* Action buttons */}
        <div className="space-y-3 pt-2">
          <button onClick={() => onMessage(friend)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-arabic font-bold text-sm active:scale-95 transition-all"
            style={{ background: "rgba(212,175,55,0.12)", border: "1.5px solid rgba(212,175,55,0.35)", color: "#d4af37" }}>
            <MessageSquare className="w-4 h-4" />
            مراسلة في الدردشة
          </button>
          <button onClick={() => onCall(friend)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-arabic font-bold text-sm active:scale-95 transition-all"
            style={{ background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.35)", color: "#4ade80" }}>
            <Phone className="w-4 h-4" />
            مكالمة صوتية
          </button>
        </div>

      </div>
    </motion.div>
  );
}

// ─── Inbox View ───────────────────────────────────────────────────────────────
function InboxView({ myTelegramId, onOpenChat, autoOpenPartnerId }: { myTelegramId: string; onOpenChat: (p: ChatPartner) => void; autoOpenPartnerId?: string }) {
  const [convs, setConvs]       = useState<Conversation[]>([]);
  const [loading, setLoading]   = useState(true);
  const autoOpenedRef = useRef(false);
  const RANK_COLORS: Record<string, string> = { Initiate: "#94a3b8", Guardian: "#22c55e", Sentinel: "#3b82f6", Champion: "#a855f7", Sovereign: "#d4af37", Legendary: "#f97316" };

  useEffect(() => {
    apiFetch("/api/messages/conversations")
      .then(r => r.ok ? r.json() : [])
      .then((data: Conversation[]) => {
        setConvs(data);
        setLoading(false);
        // فتح المحادثة تلقائياً إذا وصل المستخدم عبر إشعار رسالة
        if (autoOpenPartnerId && !autoOpenedRef.current) {
          const match = data.find((c: Conversation) => c.partnerId === autoOpenPartnerId);
          if (match) {
            autoOpenedRef.current = true;
            onOpenChat({ telegramId: match.partnerId, pseudonym: match.pseudonym, aliId: match.aliId, civicRole: match.civicRole, rank: match.rank, level: match.level });
          }
        }
      })
      .catch(() => setLoading(false));
  }, [myTelegramId, autoOpenPartnerId, onOpenChat]);

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
  );

  return (
    <div dir="rtl" className="px-4 py-3">
      {convs.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-center">
          <div className="text-5xl mb-2">✉️</div>
          <p className="font-arabic text-white/50 text-sm">صندوق البريد فارغ</p>
          <p className="font-arabic text-white/25 text-xs">افتح بطاقة متابع واضغط «مراسلة» لبدء محادثة</p>
        </div>
      ) : (
        <div className="space-y-2">
          {convs.map(conv => {
            const rc = RANK_COLORS[conv.rank] ?? "#94a3b8";
            return (
              <button key={conv.partnerId}
                onClick={() => onOpenChat({ telegramId: conv.partnerId, pseudonym: conv.pseudonym, aliId: conv.aliId, civicRole: conv.civicRole, rank: conv.rank, level: conv.level })}
                className="w-full flex items-center gap-2.5 rounded-2xl px-3 py-2.5 active:scale-[0.98] transition-all"
                style={{ background: "rgba(0,0,0,0.25)", border: "1.5px solid rgba(212,175,55,0.22)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                {/* LEFT: avatar circle + gold-bordered identity frame */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-mono font-black text-sm"
                      style={{ background: `${rc}18`, border: `1.5px solid ${rc}40`, color: rc }}>
                      {conv.pseudonym.slice(0, 2).toUpperCase()}
                    </div>
                    {conv.unread > 0 && (
                      <div className="absolute -top-1 -right-1 rounded-full flex items-center justify-center font-mono font-black text-[9px] text-white"
                        style={{ background: "#ef4444", minWidth: 16, minHeight: 16, padding: "0 3px", boxShadow: "0 0 8px rgba(239,68,68,0.6)", zIndex: 1 }}>
                        {conv.unread}
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl px-2.5 py-1.5"
                    style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.32)", minWidth: 76 }}>
                    <p className="font-arabic text-[11px] font-bold text-white leading-tight">{conv.pseudonym}</p>
                    <p className="font-mono text-[9px] leading-tight" style={{ color: GOLD }}>{conv.aliId}</p>
                  </div>
                </div>
                {/* CENTER: timestamp */}
                <div className="flex-1 flex justify-center">
                  <span className="font-mono text-[9px] text-white/30">{formatMsgTime(conv.lastAt)}</span>
                </div>
                {/* RIGHT: last message preview */}
                <div className="flex-shrink-0 max-w-[82px]">
                  <p className="font-arabic text-[11px] text-white/40 truncate">
                    {conv.isMine ? "أنت: " : ""}{conv.lastMessage}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Chat Input (isolated memo — does NOT re-render when messages list updates) ─
const ChatInput = memo(function ChatInput({ onSend }: { onSend: (text: string) => Promise<void> }) {
  const [input, setInput]   = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try { await onSend(text); } finally { setSending(false); }
  };

  return (
    <div className="flex-shrink-0 px-3 pb-4 pt-2"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,15,8,0.5)" }}>
      <div className="flex items-end gap-2" dir="rtl">
        <div className="flex-1 rounded-2xl px-3 py-2.5 flex items-end"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="اكتب رسالتك..."
            rows={1}
            dir="rtl"
            className="w-full bg-transparent font-arabic text-[21px] text-white/85 outline-none resize-none placeholder:text-white/25"
            style={{ maxHeight: 100, overflowY: "auto" }}
          />
        </div>
        <button onClick={send} disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-all disabled:opacity-40"
          style={{ background: "rgba(212,175,55,0.2)", border: "1px solid rgba(212,175,55,0.4)" }}>
          {sending
            ? <Loader2 className="w-4 h-4 text-[#d4af37] animate-spin" />
            : <Send className="w-4 h-4 text-[#d4af37]" />}
        </button>
      </div>
    </div>
  );
});

// ─── Chat View ────────────────────────────────────────────────────────────────
function ChatView({
  myTelegramId, partner, onBack, onDeleted, onBlocked,
  onInitiateCall, incomingCallActive, onAnswerCall, onRejectCall, callStatus,
}: {
  myTelegramId: string;
  partner: ChatPartner;
  onBack: () => void;
  onDeleted?: () => void;
  onBlocked?: () => void;
  onInitiateCall?: () => void;
  incomingCallActive?: boolean;
  onAnswerCall?: () => void;
  onRejectCall?: () => void;
  callStatus?: CallStatus;
}) {
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmBlock, setConfirmBlock]   = useState(false);
  const [actioning, setActioning]         = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const RANK_COLORS: Record<string, string> = { Initiate: "#94a3b8", Guardian: "#22c55e", Sentinel: "#3b82f6", Champion: "#a855f7", Sovereign: "#d4af37", Legendary: "#f97316" };
  const rc = RANK_COLORS[partner.rank] ?? "#94a3b8";

  const load = useCallback(async () => {
    const res = await apiFetch(`/api/messages/thread/${partner.telegramId}`);
    if (res.ok) setMessages(await res.json());
  }, [partner.telegramId]);

  useEffect(() => {
    load();
    apiFetch(`/api/messages/read/${partner.telegramId}`, { method: "POST" }).catch(() => {});

    // SSE for real-time incoming messages (ticket-based — initData never in URL)
    let es: EventSource | null = null;
    let fallback: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const connectSSE = async () => {
      try {
        const ticketRes = await apiFetch("/api/messages/sse-ticket", { method: "POST" });
        if (!ticketRes.ok || cancelled) { if (!fallback) fallback = setInterval(load, 5000); return; }
        const { ticket } = await ticketRes.json() as { ticket: string };
        if (cancelled) return;
        es = new EventSource(`/api/messages/events?ticket=${encodeURIComponent(ticket)}`);
        es.addEventListener("new_message", () => load());
        es.onerror = () => {
          es?.close();
          es = null;
          if (!cancelled && !fallback) fallback = setInterval(load, 5000);
        };
      } catch {
        if (!cancelled && !fallback) fallback = setInterval(load, 5000);
      }
    };

    if (typeof EventSource !== "undefined") {
      connectSSE();
    } else {
      fallback = setInterval(load, 5000);
    }

    return () => {
      cancelled = true;
      es?.close();
      if (fallback) clearInterval(fallback);
    };
  }, [load, partner.telegramId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    await apiFetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toTelegramId: partner.telegramId, content: text }),
    });
    await load();
  }, [partner.telegramId, load]);

  const deleteMsg = useCallback(async (id: number) => {
    const res = await apiFetch(`/api/messages/${id}`, { method: "DELETE" });
    if (res.ok) setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleDelete = async () => {
    setActioning(true);
    await apiFetch(`/api/messages/thread/${partner.telegramId}`, { method: "DELETE" }).catch(() => {});
    setActioning(false);
    setConfirmDelete(false);
    onDeleted?.();
    onBack();
  };

  const handleBlock = async () => {
    setActioning(true);
    await apiFetch(`/api/users/block/${partner.telegramId}`, { method: "POST" }).catch(() => {});
    setActioning(false);
    setConfirmBlock(false);
    onBlocked?.();
    onBack();
  };

  return (
    <motion.div className="absolute inset-0 z-40 flex flex-col relative overflow-hidden"
      style={{ background: "linear-gradient(160deg,#001a10 0%,#002b1b 55%,#001208 100%)" }}
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}>

      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(0,22,13,0.96)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(212,175,55,0.18)" }}>
        <button onClick={onBack}
          className="p-2 rounded-xl active:scale-95 transition-transform flex-shrink-0"
          style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)" }}>
          <ChevronRight className="w-5 h-5 text-[#d4af37]" />
        </button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center font-mono font-black text-sm flex-shrink-0"
          style={{ background: `${rc}18`, border: `1.5px solid ${rc}30`, color: rc }}>
          {partner.pseudonym.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0" dir="rtl">
          <p className="font-arabic font-bold text-white/90 text-sm truncate">{partner.pseudonym}</p>
          <div className="flex items-center gap-1.5">
            <p className="font-mono text-[9px] text-white/30">{partner.aliId}</p>
            {partner.civicRole && <CivicRoleShield role={partner.civicRole} size="xs" />}
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Call button — shown when not already in a call */}
          {onInitiateCall && (!callStatus || callStatus === "idle" || callStatus === "ended" || callStatus === "rejected" || callStatus === "missed") && (
            <button onClick={onInitiateCall}
              className="p-2 rounded-xl active:scale-90 transition-all"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}
              title="مكالمة صوتية">
              <Phone className="w-4 h-4 text-green-400" />
            </button>
          )}
          {/* Outgoing call status pill */}
          {callStatus === "calling" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="font-arabic text-[10px] text-green-400">جاري الاتصال...</span>
            </div>
          )}
          <button onClick={() => setConfirmDelete(true)}
            className="p-2 rounded-xl active:scale-90 transition-all"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
            title="حذف المحادثة">
            <Trash2 className="w-4 h-4 text-red-400/70" />
          </button>
          <button onClick={() => setConfirmBlock(true)}
            className="p-2 rounded-xl active:scale-90 transition-all"
            style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)" }}
            title="حظر المستخدم">
            <Ban className="w-4 h-4 text-orange-400/70" />
          </button>
        </div>
      </div>

      {/* Incoming call overlay — shown when the caller is this partner */}
      <AnimatePresence>
        {incomingCallActive && (
          <motion.div className="absolute inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,20,12,0.92)", backdropFilter: "blur(12px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="w-full flex flex-col items-center gap-12 text-center">
              <motion.div
                className="w-48 h-48 rounded-full flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.15)", border: "3px solid rgba(34,197,94,0.5)" }}
                animate={{ boxShadow: ["0 0 0 0 rgba(34,197,94,0.4)", "0 0 0 48px rgba(34,197,94,0)", "0 0 0 0 rgba(34,197,94,0)"] }}
                transition={{ repeat: Infinity, duration: 1.8 }}>
                <PhoneIncoming className="w-20 h-20 text-green-400" />
              </motion.div>
              <div>
                <p className="font-arabic font-bold text-white text-4xl">{partner.pseudonym}</p>
                <p className="font-arabic text-white/50 text-xl mt-2">مكالمة صوتية واردة</p>
              </div>
              <div className="flex items-center gap-12">
                <button onClick={onRejectCall}
                  className="w-32 h-32 rounded-full flex items-center justify-center active:scale-90 transition-all"
                  style={{ background: "rgba(239,68,68,0.25)", border: "3px solid rgba(239,68,68,0.5)" }}>
                  <PhoneOff className="w-14 h-14 text-red-400" />
                </button>
                <button onClick={onAnswerCall}
                  className="w-32 h-32 rounded-full flex items-center justify-center active:scale-90 transition-all"
                  style={{ background: "rgba(34,197,94,0.25)", border: "3px solid rgba(34,197,94,0.5)" }}>
                  <Phone className="w-14 h-14 text-green-400" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div className="absolute inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="w-full max-w-xs rounded-2xl p-5 text-center"
              style={{ background: "rgba(15,15,15,0.98)", border: "1px solid rgba(239,68,68,0.35)" }}>
              <div className="text-3xl mb-3">🗑️</div>
              <p className="font-arabic font-bold text-white/90 text-sm mb-1">حذف المحادثة</p>
              <p className="font-arabic text-white/40 text-xs mb-5" dir="rtl">سيتم حذف كل رسائل هذه المحادثة نهائياً لكلا الطرفين.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl font-arabic text-sm font-bold text-white/50"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  إلغاء
                </button>
                <button onClick={handleDelete} disabled={actioning}
                  className="flex-1 py-2.5 rounded-xl font-arabic text-sm font-bold text-white flex items-center justify-center gap-1.5"
                  style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.45)" }}>
                  {actioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  حذف
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Block confirmation overlay */}
      <AnimatePresence>
        {confirmBlock && (
          <motion.div className="absolute inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="w-full max-w-xs rounded-2xl p-5 text-center"
              style={{ background: "rgba(15,15,15,0.98)", border: "1px solid rgba(251,146,60,0.35)" }}>
              <div className="text-3xl mb-3">🚫</div>
              <p className="font-arabic font-bold text-white/90 text-sm mb-1">حظر المستخدم</p>
              <p className="font-arabic text-white/40 text-xs mb-5" dir="rtl">
                لن يتمكن <span className="text-white/60 font-bold">{partner.pseudonym}</span> من إرسال رسائل إليك بعد الآن.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmBlock(false)} className="flex-1 py-2.5 rounded-xl font-arabic text-sm font-bold text-white/50"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  إلغاء
                </button>
                <button onClick={handleBlock} disabled={actioning}
                  className="flex-1 py-2.5 rounded-xl font-arabic text-sm font-bold text-white flex items-center justify-center gap-1.5"
                  style={{ background: "rgba(251,146,60,0.2)", border: "1px solid rgba(251,146,60,0.4)" }}>
                  {actioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  حظر
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3" dir="rtl">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
            <div className="text-4xl">💬</div>
            <p className="font-arabic text-white/40 text-sm">ابدأ المحادثة</p>
          </div>
        )}
        <div className="space-y-2">
          {messages.map(msg => {
            const isMine = msg.fromTelegramId === myTelegramId;
            return (
              <div key={msg.id} className={`flex items-end gap-1.5 ${isMine ? "justify-start" : "justify-end"}`}>
                {/* Trash button — only for sender's own messages, on the outer side */}
                {isMine && (
                  <button
                    onClick={() => deleteMsg(msg.id)}
                    className="flex-shrink-0 p-1 rounded-lg opacity-40 hover:opacity-90 active:scale-90 transition-all"
                    style={{ color: "#ef4444" }}
                    title="حذف الرسالة">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="max-w-[75%] rounded-2xl px-3 py-2"
                  style={{
                    background: isMine ? "rgba(212,175,55,0.1)" : "rgba(96,165,250,0.1)",
                    border: `1px solid ${isMine ? "rgba(212,175,55,0.2)" : "rgba(96,165,250,0.2)"}`,
                  }}>
                  <p className="font-arabic text-[21px] text-white/90 leading-relaxed" dir="auto">{msg.content}</p>
                  <p className="font-mono text-[13px] text-white/30 mt-0.5" style={{ direction: "ltr", textAlign: "right" }}>{formatMsgTime(msg.createdAt)}</p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input — isolated memo component to prevent re-renders from messages updates */}
      <ChatInput onSend={sendMessage} />
    </motion.div>
  );
}

// ─── Copyable Telegram Username ───────────────────────────────────────────────
function CopyableUsername({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(`@${username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 mb-2 rounded-xl px-3 py-1 active:scale-95 transition-all"
      style={{
        background: copied ? "rgba(74,222,128,0.12)" : "rgba(96,165,250,0.10)",
        border: `1px solid ${copied ? "rgba(74,222,128,0.40)" : "rgba(96,165,250,0.30)"}`,
      }}>
      <span className="font-mono text-sm transition-colors"
        style={{ color: copied ? "#4ade80" : "#60a5fa" }}>
        @{username}
      </span>
      {copied
        ? <Check className="w-3.5 h-3.5 text-green-400" />
        : <Copy className="w-3.5 h-3.5" style={{ color: "#60a5fa" }} />}
    </button>
  );
}

// ─── Main Profile Section ─────────────────────────────────────────────────────
export function ProfileSection({ onBack, userData, initialChatPartnerId, initialTab, onOpenCommunity }: { onBack: () => void; userData: UserData; initialChatPartnerId?: string; initialTab?: "profile" | "inbox" | "friends" | "calls"; onOpenCommunity?: (spaceId: number) => void }) {
  const { user } = useTelegram();
  const queryClient = useQueryClient();
  const telegramId  = userData.telegramId;

  // Live pseudonym (updates optimistically after save)
  const [pseudonym, setPseudonym] = useState(userData.pseudonym);

  // Edit state
  const [isEditing,  setIsEditing]  = useState(false);
  const [editValue,  setEditValue]  = useState("");
  const [editError,  setEditError]  = useState("");

  const updateMutation = useUpdatePseudonym();

  // Tabs + chat state
  const [profileTab,   setProfileTab]   = useState<"profile" | "inbox" | "friends" | "calls">(initialTab ?? (initialChatPartnerId ? "inbox" : "profile"));
  const [chatPartner,  setChatPartner]  = useState<ChatPartner | null>(null);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [friendProfile, setFriendProfile] = useState<NetUser | null>(null);
  const [walletOpen,  setWalletOpen]  = useState(false);
  const [pointsOpen,  setPointsOpen]  = useState(false);
  const [showCallContacts, setShowCallContacts] = useState(false);

  // ── P2P Call System ──────────────────────────────────────────────────────
  const [callState,    setCallState]    = useState<ActiveCall | null>(null);
  const [callSeconds,  setCallSeconds]  = useState(0);
  const [callMuted,    setCallMuted]    = useState(false);
  const callRef           = useRef<ActiveCall | null>(null);
  const pcRef             = useRef<RTCPeerConnection | null>(null);
  const localStreamRef    = useRef<MediaStream | null>(null);
  const remoteAudioRef    = useRef<HTMLAudioElement>(null);
  const callTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const signalPollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringtoneRef       = useRef<{ ctx: AudioContext; interval: ReturnType<typeof setInterval> } | null>(null);

  const updateCallState = useCallback((fn: (prev: ActiveCall | null) => ActiveCall | null) => {
    const next = fn(callRef.current);
    callRef.current = next;
    setCallState(next);
  }, []);

  const stopRingtone = useCallback(() => {
    if (!ringtoneRef.current) return;
    clearInterval(ringtoneRef.current.interval);
    ringtoneRef.current.ctx.close().catch(() => {});
    ringtoneRef.current = null;
  }, []);

  const startRingtone = useCallback(() => {
    if (ringtoneRef.current || typeof AudioContext === "undefined") return;
    const ctx = new AudioContext();
    const playBeep = () => {
      if (ctx.state === "closed") return;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.setValueAtTime(520, ctx.currentTime);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
      osc.start(); osc.stop(ctx.currentTime + 0.7);
    };
    playBeep();
    const interval = setInterval(playBeep, 1800);
    ringtoneRef.current = { ctx, interval };
  }, []);

  const cleanupCall = useCallback(() => {
    stopRingtone();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    pcRef.current?.close(); pcRef.current = null;
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    if (signalPollRef.current) { clearInterval(signalPollRef.current); signalPollRef.current = null; }
    setCallSeconds(0); setCallMuted(false);
  }, [stopRingtone]);

  const setupPeerConnection = useCallback(async (callId: number, isInitiator: boolean): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 },
      });
      localStreamRef.current = stream;
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.telegram.org:443" },
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun.cloudflare.com:3478" },
        ],
      });
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.ontrack = (e) => {
        if (!remoteAudioRef.current) return;
        remoteAudioRef.current.srcObject = e.streams[0];
        remoteAudioRef.current.play().catch(() => {});
      };
      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        apiFetch(`/api/calls/${callId}/signal`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "ice", payload: JSON.stringify(e.candidate) }),
        }).catch(() => {});
      };
      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await apiFetch(`/api/calls/${callId}/signal`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "offer", payload: JSON.stringify(offer) }),
        });
      }
      // Poll for remote signals (fallback to SSE fast-path)
      signalPollRef.current = setInterval(async () => {
        const c = callRef.current;
        if (!c || c.status !== "active") return;
        const res = await apiFetch(`/api/calls/${callId}/signals`).catch(() => null);
        if (!res?.ok) return;
        const sigs = await res.json() as { type: string; payload: string }[];
        const currentPc = pcRef.current;
        if (!currentPc) return;
        for (const sig of sigs) {
          try {
            if (sig.type === "offer" && !isInitiator && currentPc.signalingState === "stable") {
              await currentPc.setRemoteDescription(JSON.parse(sig.payload));
              const ans = await currentPc.createAnswer();
              await currentPc.setLocalDescription(ans);
              await apiFetch(`/api/calls/${callId}/signal`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "answer", payload: JSON.stringify(ans) }),
              });
            } else if (sig.type === "answer" && isInitiator && currentPc.signalingState === "have-local-offer") {
              await currentPc.setRemoteDescription(JSON.parse(sig.payload));
            } else if (sig.type === "ice") {
              await currentPc.addIceCandidate(JSON.parse(sig.payload));
            }
          } catch { /* WebRTC errors are non-fatal */ }
        }
      }, 800);
      return true;
    } catch { return false; }
  }, []);

  const handleInitiateCall = useCallback(async (partnerId: string, partnerPseudonym: string) => {
    if (callRef.current) return;
    const res = await apiFetch("/api/calls/initiate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calleeId: partnerId }),
    }).catch(() => null);
    if (!res?.ok) return;
    const { callId } = await res.json() as { callId: number };
    updateCallState(() => ({ callId, partnerId, partnerPseudonym, status: "calling", isInitiator: true }));
    // Auto-cancel after 30 s with no answer
    setTimeout(() => {
      if (callRef.current?.callId === callId && callRef.current.status === "calling") {
        cleanupCall(); callRef.current = null; setCallState(null);
      }
    }, 30_000);
  }, [updateCallState, cleanupCall]);

  const handleAnswerCall = useCallback(async () => {
    const c = callRef.current;
    if (!c || c.status !== "ringing") return;
    stopRingtone();
    const res = await apiFetch(`/api/calls/${c.callId}/answer`, { method: "POST" });
    if (!res.ok) return;
    updateCallState(p => p ? { ...p, status: "active" } : null);
    const ok = await setupPeerConnection(c.callId, false);
    if (ok) callTimerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000);
  }, [stopRingtone, updateCallState, setupPeerConnection]);

  const handleRejectCall = useCallback(async () => {
    const c = callRef.current;
    if (!c) return;
    await apiFetch(`/api/calls/${c.callId}/reject`, { method: "POST" }).catch(() => {});
    cleanupCall(); callRef.current = null; setCallState(null);
  }, [cleanupCall]);

  const handleHangupCall = useCallback(async () => {
    const c = callRef.current;
    if (!c) return;
    await apiFetch(`/api/calls/${c.callId}/hangup`, { method: "POST" }).catch(() => {});
    cleanupCall();
    updateCallState(() => ({ ...c, status: "ended" }));
    setTimeout(() => { callRef.current = null; setCallState(null); }, 2500);
  }, [cleanupCall, updateCallState]);

  const handleToggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCallMuted(!track.enabled);
  }, []);

  // SSE — call events
  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;
    const connect = async () => {
      const r = await apiFetch("/api/calls/events-ticket", { method: "POST" }).catch(() => null);
      if (!r?.ok || cancelled) return;
      const { ticket } = await r.json() as { ticket: string };
      if (cancelled) return;
      es = new EventSource(`/api/calls/events?ticket=${encodeURIComponent(ticket)}`);

      es.addEventListener("call_incoming", (e) => {
        if (callRef.current) return;
        const d = JSON.parse(e.data) as { callId: number; callerId: string; callerPseudonym: string };
        updateCallState(() => ({ callId: d.callId, partnerId: d.callerId, partnerPseudonym: d.callerPseudonym, status: "ringing", isInitiator: false }));
        startRingtone();
      });

      es.addEventListener("call_accepted", async (e) => {
        const d = JSON.parse(e.data) as { callId: number };
        const c = callRef.current;
        if (!c || c.callId !== d.callId) return;
        updateCallState(p => p ? { ...p, status: "active" } : null);
        const ok = await setupPeerConnection(c.callId, true);
        if (ok) callTimerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000);
      });

      es.addEventListener("call_rejected", (e) => {
        const d = JSON.parse(e.data) as { callId: number };
        const c = callRef.current;
        if (!c || c.callId !== d.callId) return;
        cleanupCall();
        updateCallState(() => ({ ...c, status: "rejected" }));
        setTimeout(() => { callRef.current = null; setCallState(null); }, 2500);
      });

      es.addEventListener("call_ended", (e) => {
        const d = JSON.parse(e.data) as { callId: number };
        const c = callRef.current;
        if (!c || c.callId !== d.callId) return;
        cleanupCall();
        updateCallState(() => ({ ...c, status: "ended" }));
        setTimeout(() => { callRef.current = null; setCallState(null); }, 2500);
      });

      es.addEventListener("call_signal", async (e) => {
        const d = JSON.parse(e.data) as { callId: number; type: string; payload: string };
        const c = callRef.current;
        if (!c || c.callId !== d.callId || c.status !== "active") return;
        const pc = pcRef.current; if (!pc) return;
        try {
          if (d.type === "offer" && !c.isInitiator && pc.signalingState === "stable") {
            await pc.setRemoteDescription(JSON.parse(d.payload));
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            await apiFetch(`/api/calls/${c.callId}/signal`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: "answer", payload: JSON.stringify(ans) }),
            });
          } else if (d.type === "answer" && c.isInitiator && pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(JSON.parse(d.payload));
          } else if (d.type === "ice") {
            await pc.addIceCandidate(JSON.parse(d.payload));
          }
        } catch { /* non-fatal */ }
      });

      es.onerror = () => { es?.close(); es = null; if (!cancelled) setTimeout(connect, 5000); };
    };
    if (typeof EventSource !== "undefined") connect();
    return () => { cancelled = true; es?.close(); };
  }, [telegramId, updateCallState, setupPeerConnection, cleanupCall, startRingtone]);

  // Presence heartbeat
  useEffect(() => {
    const ctx = chatPartner ? `chat:${chatPartner.telegramId}` : "app";
    const hb = () => apiFetch("/api/calls/presence", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: ctx }),
    }).catch(() => {});
    hb();
    const id = setInterval(hb, 15_000);
    return () => clearInterval(id);
  }, [telegramId, chatPartner]);

  const [civicRole,    setCivicRole]    = useState<string | null>(userData.civicRole ?? null);
  const [savingRole,   setSavingRole]   = useState(false);

  // Custom profile photo (DB-stored, overrides Telegram photo)
  const [customPhoto,  setCustomPhoto]  = useState<string | null>(userData.photoUrl ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const maxSide = 200;
          const scale   = Math.min(1, maxSide / Math.max(img.width, img.height));
          const w = Math.round(img.width  * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.onerror = reject;
        img.src = url;
      });
      const res = await apiFetch("/api/users/me/photo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: compressed }),
      });
      if (res.ok) setCustomPhoto(compressed);
    } catch {}
    setUploadingPhoto(false);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  useEffect(() => {
    apiFetch("/api/messages/unread-count")
      .then(r => r.ok ? r.json() : { count: 0 })
      .then(d => setUnreadCount(d.count))
      .catch(() => {});
  }, [profileTab]);

  const saveCivicRole = async (role: string | null) => {
    setSavingRole(true);
    setCivicRole(role);
    await apiFetch("/api/users/me/civic-role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ civicRole: role }),
    }).catch(() => {});
    setSavingRole(false);
  };

  const handleOpenChat = (partner: ChatPartner) => setChatPartner(partner);
  const handleCloseChat = () => setChatPartner(null);

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

  const photoUrl  = customPhoto || user?.photo_url || null;
  const firstName = userData.firstName || user?.first_name || "";
  const lastName  = userData.lastName  || user?.last_name  || "";
  const username  = userData.telegramUsername || user?.username;
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || pseudonym;
  const initials  = pseudonym.slice(0, 2).toUpperCase();

  const rankInfo      = getRankInfo(userData.loyaltyPoints);
  const referralCode  = userData.aliId;
  const BOT_USERNAME  = "ALI_MDD_BOT";
  const APP_NAME      = "app";
  const botDeepLink   = `https://t.me/${BOT_USERNAME}/${APP_NAME}?startapp=${referralCode}`;
  const referralLink  = `https://t.me/share/url?url=${encodeURIComponent(botDeepLink)}&text=${encodeURIComponent(`🔰 A.L.I — مبادرة التحرير العلوي\nانضم إليّ مباشرةً في التطبيق وابدأ رحلتك!`)}`;

  function openInviteLink() {
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(referralLink);
    } else {
      window.open(referralLink, "_blank");
    }
  }


  return (
    <motion.div
      className="flex flex-col h-full relative overflow-hidden"
      style={{ background: "linear-gradient(160deg,#001a10 0%,#002b1b 55%,#001208 100%)" }}
      initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 flex-shrink-0"
        style={{ background: "rgba(0,22,13,0.96)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(212,175,55,0.18)" }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack}
            className="p-2 rounded-xl active:scale-95 transition-transform"
            style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)" }}>
            <ChevronRight className="w-5 h-5 text-[#d4af37]" />
          </button>
          <div className="flex-1" dir="rtl">
            <h1 className="font-arabic font-bold text-[#d4af37] text-lg leading-tight">الملف الشخصي</h1>
            <p className="font-arabic text-white/35 text-xs">{userData.aliId}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Points pill */}
            <div className="flex items-center gap-1 rounded-full px-3 py-1"
              style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)" }}>
              <span className="font-mono text-xs font-bold" style={{ color: "#d4af37" }}>⭐ {userData.loyaltyPoints.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* ── Tab bar — only "ملفي" pill; inbox/friends open via large cards ── */}
        {(profileTab === "inbox" || profileTab === "friends" || profileTab === "calls") && (
          <div className="flex px-4 pb-2" dir="rtl">
            <button onClick={() => setProfileTab("profile")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-arabic text-xs font-bold transition-all"
              style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)", color: GOLD }}>
              <ChevronRight className="w-3.5 h-3.5" />
              رجوع
            </button>
          </div>
        )}
      </div>

      {/* Hidden audio element for remote call audio */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

      {/* ── Global call overlay (when no chatView is open or ringing from non-chat partner) ── */}
      <AnimatePresence>
        {callState && (
          (() => {
            const isInChat = chatPartner?.telegramId === callState.partnerId;
            const showGlobal = !isInChat || callState.status === "calling";
            if (!showGlobal) return null;

            if (callState.status === "ringing") {
              return (
                <motion.div key="global-ring"
                  className="absolute inset-0 z-[60] flex items-center justify-center px-6"
                  style={{ background: "rgba(0,20,12,0.95)", backdropFilter: "blur(16px)" }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="w-full max-w-xs flex flex-col items-center gap-6 text-center">
                    <motion.div
                      className="w-28 h-28 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.5)" }}
                      animate={{ boxShadow: ["0 0 0 0 rgba(34,197,94,0.45)", "0 0 0 28px rgba(34,197,94,0)", "0 0 0 0 rgba(34,197,94,0)"] }}
                      transition={{ repeat: Infinity, duration: 1.8 }}>
                      <PhoneIncoming className="w-12 h-12 text-green-400" />
                    </motion.div>
                    <div>
                      <p className="font-arabic font-black text-white text-xl">{callState.partnerPseudonym}</p>
                      <p className="font-arabic text-white/45 text-sm mt-1">مكالمة صوتية واردة</p>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="flex flex-col items-center gap-2">
                        <button onClick={handleRejectCall}
                          className="w-18 h-18 w-[72px] h-[72px] rounded-full flex items-center justify-center active:scale-90 transition-all"
                          style={{ background: "rgba(239,68,68,0.3)", border: "2px solid rgba(239,68,68,0.6)" }}>
                          <PhoneOff className="w-8 h-8 text-red-400" />
                        </button>
                        <span className="font-arabic text-[11px] text-white/35">رفض</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <button onClick={handleAnswerCall}
                          className="w-[72px] h-[72px] rounded-full flex items-center justify-center active:scale-90 transition-all"
                          style={{ background: "rgba(34,197,94,0.3)", border: "2px solid rgba(34,197,94,0.6)" }}>
                          <Phone className="w-8 h-8 text-green-400" />
                        </button>
                        <span className="font-arabic text-[11px] text-white/35">قبول</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            }

            if (callState.status === "calling") {
              return (
                <motion.div key="calling-toast"
                  className="absolute top-16 left-4 right-4 z-[60] rounded-2xl px-4 py-3 flex items-center gap-3"
                  style={{ background: "rgba(0,30,18,0.97)", border: "1.5px solid rgba(34,197,94,0.4)", backdropFilter: "blur(14px)" }}
                  initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}>
                  <motion.div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.5)" }}
                    animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                    <Phone className="w-4 h-4 text-green-400" />
                  </motion.div>
                  <div className="flex-1 min-w-0" dir="rtl">
                    <p className="font-arabic text-xs font-bold text-white/80 truncate">{callState.partnerPseudonym}</p>
                    <p className="font-arabic text-[10px] text-green-400/70">جاري الاتصال...</p>
                  </div>
                  <button onClick={handleHangupCall}
                    className="p-2 rounded-xl active:scale-90 transition-all flex-shrink-0"
                    style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)" }}>
                    <PhoneOff className="w-4 h-4 text-red-400" />
                  </button>
                </motion.div>
              );
            }

            if (callState.status === "active") {
              const mm = String(Math.floor(callSeconds / 60)).padStart(2, "0");
              const ss = String(callSeconds % 60).padStart(2, "0");
              return (
                <motion.div key="active-call-bar"
                  className="absolute bottom-0 left-0 right-0 z-[60] px-4 py-3 flex items-center gap-3 rounded-t-2xl"
                  style={{ background: "rgba(0,25,14,0.98)", border: "1.5px solid rgba(34,197,94,0.35)", backdropFilter: "blur(16px)" }}
                  initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}>
                  <div className="flex-1 min-w-0" dir="rtl">
                    <p className="font-arabic text-sm font-bold text-white truncate">{callState.partnerPseudonym}</p>
                    <p className="font-mono text-xs text-green-400/80 mt-0.5">{mm}:{ss}</p>
                  </div>
                  <button onClick={handleToggleMute}
                    className="p-2.5 rounded-xl active:scale-90 transition-all"
                    style={{
                      background: callMuted ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${callMuted ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
                    }}>
                    {callMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-white/60" />}
                  </button>
                  <button onClick={handleHangupCall}
                    className="p-2.5 rounded-xl active:scale-90 transition-all"
                    style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.5)" }}>
                    <PhoneOff className="w-4 h-4 text-red-400" />
                  </button>
                </motion.div>
              );
            }

            if (callState.status === "rejected" || callState.status === "ended") {
              return (
                <motion.div key="call-ended-toast"
                  className="absolute top-16 left-4 right-4 z-[60] rounded-2xl px-4 py-3 flex items-center gap-3"
                  style={{ background: "rgba(0,20,12,0.97)", border: "1.5px solid rgba(239,68,68,0.3)", backdropFilter: "blur(14px)" }}
                  initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }}>
                  <PhoneMissed className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="font-arabic text-xs text-white/70 flex-1" dir="rtl">
                    {callState.status === "rejected" ? "تم رفض المكالمة" : "انتهت المكالمة"}
                  </p>
                </motion.div>
              );
            }

            return null;
          })()
        )}
      </AnimatePresence>

      {/* ── Chat overlay (full-screen within profile) ── */}
      <AnimatePresence>
        {chatPartner && (
          <ChatView
            key={chatPartner.telegramId}
            myTelegramId={telegramId}
            partner={chatPartner}
            onBack={handleCloseChat}
            onDeleted={handleCloseChat}
            onBlocked={handleCloseChat}
            onInitiateCall={() => handleInitiateCall(chatPartner.telegramId, chatPartner.pseudonym)}
            incomingCallActive={callState?.status === "ringing" && callState.partnerId === chatPartner.telegramId}
            onAnswerCall={handleAnswerCall}
            onRejectCall={handleRejectCall}
            callStatus={callState?.partnerId === chatPartner.telegramId ? callState.status : "idle"}
          />
        )}
      </AnimatePresence>

      {/* ── Friend profile overlay ── */}
      <AnimatePresence>
        {friendProfile && !chatPartner && (
          <FriendProfileView
            key={friendProfile.telegramId}
            friend={friendProfile}
            myTelegramId={telegramId}
            onBack={() => setFriendProfile(null)}
            onMessage={(u) => {
              setFriendProfile(null);
              handleOpenChat({ telegramId: u.telegramId, pseudonym: u.pseudonym, aliId: u.aliId, civicRole: u.civicRole ?? null, rank: u.rank, level: u.level });
            }}
            onCall={(u) => {
              setFriendProfile(null);
              handleInitiateCall(u.telegramId, u.pseudonym);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Inbox tab ── */}
      {profileTab === "inbox" && !chatPartner && !friendProfile && (
        <div className="flex-1 overflow-y-auto">
          <InboxView myTelegramId={telegramId} onOpenChat={handleOpenChat} autoOpenPartnerId={initialChatPartnerId} />
        </div>
      )}

      {/* ── Friends tab ── */}
      {profileTab === "friends" && !chatPartner && !friendProfile && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Fixed top invite panel */}
          <div className="flex-shrink-0 px-4 pt-3 pb-3 space-y-3"
            style={{ borderBottom: "1px solid rgba(34,197,94,0.15)" }}>
            <p className="font-arabic text-base font-black text-center" style={{ color: GOLD }} dir="rtl">🤝 دعوة صديق للانضمام</p>
            <div className="flex gap-2" dir="rtl">
              {/* WhatsApp */}
              <button
                onClick={() => {
                  const wa = `https://wa.me/?text=${encodeURIComponent(`🔰 A.L.I — مبادرة التحرير العلوي\nانضم إليّ مباشرةً في التطبيق:\n${botDeepLink}`)}`;
                  window.Telegram?.WebApp?.openLink?.(wa) ?? window.open(wa, "_blank");
                }}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl active:scale-95 transition-all"
                style={{ background: "rgba(37,211,102,0.1)", border: "1.5px solid rgba(37,211,102,0.3)" }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.558 4.121 1.533 5.858L0 24l6.335-1.509A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.794 9.794 0 01-5.003-1.372l-.36-.213-3.76.896.939-3.658-.234-.375A9.793 9.793 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
                <span className="font-arabic text-[10px] font-bold" style={{ color: "#25D366" }}>واتساب</span>
              </button>

              {/* Telegram */}
              <button
                onClick={openInviteLink}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl active:scale-95 transition-all"
                style={{ background: "rgba(41,182,246,0.1)", border: "1.5px solid rgba(41,182,246,0.3)" }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#29B6F6"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                <span className="font-arabic text-[10px] font-bold" style={{ color: "#29B6F6" }}>تيليغرام</span>
              </button>

              {/* Copy link */}
              <button
                onClick={() => { navigator.clipboard.writeText(botDeepLink); }}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl active:scale-95 transition-all"
                style={{ background: `rgba(212,175,55,0.1)`, border: `1.5px solid rgba(212,175,55,0.3)` }}>
                <Copy className="w-5 h-5" style={{ color: GOLD }} />
                <span className="font-arabic text-[10px] font-bold" style={{ color: GOLD }}>نسخ الرابط</span>
              </button>
            </div>
          </div>

          {/* Scrollable friend list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            <ReferralCount telegramId={telegramId} />
            <NetworkSection
              myTelegramId={telegramId}
              onMessage={(u) => {
                setProfileTab("inbox");
                handleOpenChat({ telegramId: u.telegramId, pseudonym: u.pseudonym, aliId: u.aliId, civicRole: u.civicRole ?? null, rank: u.rank, level: u.level });
              }}
              onViewFriend={(u) => setFriendProfile(u)}
              onCall={(u) => handleInitiateCall(u.telegramId, u.pseudonym)}
              autoExpand
            />
          </div>
        </div>
      )}

      {/* ── Calls tab ── */}
      {profileTab === "calls" && !chatPartner && !friendProfile && (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Fixed: جهات الاتصال button */}
          <div className="flex-shrink-0 px-4 py-3" dir="rtl"
            style={{ borderBottom: "1px solid rgba(34,197,94,0.12)" }}>
            <button
              onClick={() => setShowCallContacts(p => !p)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-arabic font-bold text-sm active:scale-95 transition-all"
              style={{
                background: showCallContacts ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.08)",
                border: `1.5px solid ${showCallContacts ? "rgba(34,197,94,0.5)" : "rgba(34,197,94,0.25)"}`,
                color: "#4ade80",
              }}>
              <Phone className="w-4 h-4" />
              جهات الاتصال
            </button>
          </div>

          {/* Call history list */}
          <div className="flex-1 overflow-y-auto px-4 py-6" dir="rtl">
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.08)", border: "1.5px solid rgba(34,197,94,0.2)" }}>
                <Phone className="w-7 h-7 text-green-400/50" />
              </div>
              <p className="font-arabic text-white/35 text-sm">لا سجل مكالمات بعد</p>
              <p className="font-arabic text-white/20 text-xs">اضغط «جهات الاتصال» لبدء مكالمة مع صديق</p>
            </div>
          </div>

          {/* Contacts slide-over */}
          <AnimatePresence>
            {showCallContacts && (
              <motion.div
                className="absolute inset-0 z-10 flex flex-col overflow-hidden"
                style={{ background: "linear-gradient(160deg,#001a10 0%,#002b1b 55%,#001208 100%)" }}
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}>
                <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-4 pb-3" dir="rtl"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <button onClick={() => setShowCallContacts(false)}
                    className="p-2 rounded-xl active:scale-95 transition-transform"
                    style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)" }}>
                    <ChevronRight className="w-5 h-5 text-[#d4af37]" />
                  </button>
                  <span className="font-arabic font-bold text-white/80 text-base">جهات الاتصال</span>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  <NetworkSection
                    myTelegramId={telegramId}
                    onMessage={(u) => {
                      setShowCallContacts(false);
                      setProfileTab("inbox");
                      handleOpenChat({ telegramId: u.telegramId, pseudonym: u.pseudonym, aliId: u.aliId, civicRole: u.civicRole ?? null, rank: u.rank, level: u.level });
                    }}
                    onViewFriend={(u) => { setShowCallContacts(false); setFriendProfile(u); }}
                    onCall={(u) => { setShowCallContacts(false); handleInitiateCall(u.telegramId, u.pseudonym); }}
                    autoExpand
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Profile tab ── */}
      {profileTab === "profile" && (
      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-4"
        style={{ background: "linear-gradient(180deg, rgba(0,40,20,0.35) 0%, rgba(0,25,12,0.15) 100%)" }}>

        {/* ── HERO ── */}
        <div className="pt-5 pb-2" dir="rtl">
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />

          {/* Row: avatar + identity info + shield */}
          <div className="flex items-start gap-3">

            {/* Avatar — golden border, camera button, premium badge */}
            <div className="relative flex-shrink-0" style={{ filter: "drop-shadow(0 0 22px rgba(212,175,55,0.48))" }}>
              <AvatarFrame
                photoUrl={photoUrl}
                initials={initials}
                civicRole={null}
                size={88}
                accent={GOLD}
                onClick={() => !uploadingPhoto && photoInputRef.current?.click()}
              />
              <button
                onClick={() => !uploadingPhoto && photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 flex items-center justify-center rounded-full active:scale-90 transition-all"
                style={{ width: 26, height: 26, background: "rgba(0,20,12,0.9)", border: `1.5px solid ${GOLD}55`, zIndex: 10 }}>
                {uploadingPhoto
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: GOLD }} />
                  : <Camera className="w-3.5 h-3.5" style={{ color: GOLD }} />}
              </button>
              {user?.is_premium && (
                <div className="absolute -top-1 -left-1 flex items-center justify-center"
                  style={{ width: 20, height: 20, background: "linear-gradient(135deg,#7c3aed,#a855f7)", border: "2px solid #001a10", borderRadius: "50%", zIndex: 10 }}>
                  <Star className="w-2.5 h-2.5 text-white" fill="white" />
                </div>
              )}
            </div>

            {/* Identity info — name (fixed) + aliId/rank OR edit form */}
            <div className="flex-1 min-w-0 pt-1">
              {/* Pseudonym — always visible, no badge, no pencil here */}
              <h2 className="font-arabic font-black text-white text-lg leading-tight">{pseudonym}</h2>

              {/* aliId + rank (clean vertical) OR edit input when isEditing AND no civicRole */}
              <AnimatePresence mode="wait">
                {isEditing && !civicRole ? (
                  <motion.div key="name-edit-nocivic"
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="mt-2 space-y-1.5">
                    <input
                      dir="auto" value={editValue}
                      onChange={e => { setEditValue(e.target.value); setEditError(""); }}
                      onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") cancelEdit(); }}
                      maxLength={30} autoFocus
                      placeholder="الاسم المستعار الجديد"
                      className="w-full rounded-lg px-3 py-1.5 font-mono text-sm text-white outline-none placeholder:text-white/25"
                      style={{ background: "rgba(255,255,255,0.07)", border: `1.5px solid ${editError ? "rgba(239,68,68,0.6)" : "rgba(212,175,55,0.5)"}`, caretColor: "#d4af37" }}
                    />
                    {editError && <p className="font-arabic text-[10px] text-red-400">{editError}</p>}
                    <div className="flex gap-1.5">
                      <button onClick={handleSave} disabled={updateMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg font-arabic text-xs font-bold active:scale-95 disabled:opacity-60"
                        style={{ background: "rgba(34,197,94,0.18)", border: "1.5px solid rgba(34,197,94,0.45)", color: "#4ade80" }}>
                        {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        {updateMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                      </button>
                      <button onClick={cancelEdit} disabled={updateMutation.isPending}
                        className="px-3 py-1.5 rounded-lg active:scale-95 disabled:opacity-60"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="id-rank" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="mt-2 flex flex-col gap-0.5">
                    <span className="font-mono text-xs font-black tracking-wider"
                      style={{ color: GOLD, textShadow: `0 0 14px rgba(212,175,55,0.8), 0 0 6px rgba(212,175,55,0.5)` }}>{userData.aliId}</span>
                    <span className="font-mono text-[10px] font-bold"
                      style={{ color: rankInfo.current.color, textShadow: `0 0 8px ${rankInfo.current.color}60` }}>{userData.rank}</span>
                    {/* Pencil fallback when no civicRole */}
                    {!civicRole && (
                      <button onClick={startEdit}
                        className="mt-1 self-start flex items-center justify-center rounded-lg active:scale-90 transition-transform"
                        style={{ width: 24, height: 24, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)" }}>
                        <Pencil className="w-3 h-3" style={{ color: GOLD }} />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Shield column — smaller, no wrapper, 3D glassy; label + pencil (edit) below */}
            {civicRole && (
              <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-1">
                {/* Shield SVG only — bare, glassy 3D look */}
                <CivicRoleShield role={civicRole} size="sm" noWrapper />

                {/* Label + pencil OR edit form */}
                <AnimatePresence mode="wait">
                  {isEditing ? (
                    <motion.div key="shield-edit"
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="w-28 space-y-1.5">
                      <input
                        dir="auto" value={editValue}
                        onChange={e => { setEditValue(e.target.value); setEditError(""); }}
                        onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") cancelEdit(); }}
                        maxLength={30} autoFocus
                        placeholder="اللقب"
                        className="w-full rounded-lg px-2 py-1 font-mono text-[11px] text-white outline-none placeholder:text-white/25 text-center"
                        style={{ background: "rgba(255,255,255,0.07)", border: `1.5px solid ${editError ? "rgba(239,68,68,0.6)" : "rgba(212,175,55,0.5)"}`, caretColor: "#d4af37" }}
                      />
                      {editError && <p className="font-arabic text-[9px] text-red-400 text-center">{editError}</p>}
                      <div className="flex gap-1">
                        <button onClick={handleSave} disabled={updateMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg font-arabic text-[10px] font-bold active:scale-95 disabled:opacity-60"
                          style={{ background: "rgba(34,197,94,0.18)", border: "1.5px solid rgba(34,197,94,0.45)", color: "#4ade80" }}>
                          {updateMutation.isPending ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Check className="w-2.5 h-2.5" />}
                          {updateMutation.isPending ? "..." : "حفظ"}
                        </button>
                        <button onClick={cancelEdit} disabled={updateMutation.isPending}
                          className="px-2 py-1 rounded-lg active:scale-95 disabled:opacity-60"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="shield-label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-1">
                      <span className="font-arabic text-[10px] font-bold" style={{ color: GOLD }}>
                        {civicRole === "guardian" ? "حارس الأرض" : "سفير القضية"}
                      </span>
                      <button onClick={startEdit}
                        className="flex items-center justify-center rounded active:scale-90 transition-transform"
                        style={{ width: 18, height: 18, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)" }}>
                        <Pencil className="w-2.5 h-2.5" style={{ color: GOLD }} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* ── Large nav cards: مراسلاتي + سجل الأصدقاء ── */}
        <div className="grid grid-cols-2 gap-3" dir="rtl">
          {/* مراسلاتي */}
          <button
            onClick={() => setProfileTab("inbox")}
            className="relative flex flex-col items-center justify-center gap-3 py-7 rounded-3xl active:scale-[0.96] transition-all"
            style={{
              background: "linear-gradient(140deg, rgba(96,165,250,0.28) 0%, rgba(59,130,246,0.12) 100%)",
              border: "2px solid rgba(147,197,253,0.55)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 4px 28px rgba(96,165,250,0.22), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(147,197,253,0.5) 0%, rgba(96,165,250,0.28) 100%)",
                border: "2px solid rgba(147,197,253,0.65)",
                boxShadow: "0 6px 24px rgba(96,165,250,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
              }}>
              <Mail className="w-7 h-7" style={{ color: "#dbeafe", filter: "drop-shadow(0 0 8px rgba(147,197,253,0.8))" }} />
            </div>
            <span className="font-arabic font-black text-sm" style={{ color: "#dbeafe", textShadow: "0 0 12px rgba(147,197,253,0.7)" }}>مراسلاتي</span>
            {unreadCount > 0 && (
              <span className="absolute top-2.5 left-2.5 rounded-full font-mono font-black text-white flex items-center justify-center"
                style={{ background: "#ef4444", minWidth: 20, minHeight: 20, fontSize: 10, padding: "0 4px",
                  boxShadow: "0 0 12px rgba(239,68,68,0.7)" }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* سجل الأصدقاء */}
          <button
            onClick={() => { setProfileTab("friends"); setFriendProfile(null); }}
            className="flex flex-col items-center justify-center gap-3 py-7 rounded-3xl active:scale-[0.96] transition-all"
            style={{
              background: "linear-gradient(140deg, rgba(74,222,128,0.28) 0%, rgba(34,197,94,0.12) 100%)",
              border: "2px solid rgba(134,239,172,0.55)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 4px 28px rgba(74,222,128,0.22), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(134,239,172,0.5) 0%, rgba(74,222,128,0.28) 100%)",
                border: "2px solid rgba(134,239,172,0.65)",
                boxShadow: "0 6px 24px rgba(74,222,128,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
              }}>
              <Users className="w-7 h-7" style={{ color: "#dcfce7", filter: "drop-shadow(0 0 8px rgba(134,239,172,0.8))" }} />
            </div>
            <span className="font-arabic font-black text-sm" style={{ color: "#dcfce7", textShadow: "0 0 12px rgba(134,239,172,0.7)" }}>سجل الأصدقاء</span>
          </button>
        </div>

        {/* ── Card 1: محفظتي (Wallet) ── */}
        <div className="rounded-2xl overflow-hidden" style={{
          border: "1.5px solid rgba(212,175,55,0.35)",
          background: "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(0,0,0,0.3) 60%, rgba(212,175,55,0.04) 100%)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 4px 24px rgba(212,175,55,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}>
          <button
            onClick={() => setWalletOpen(p => !p)}
            className="w-full flex items-center gap-3 px-4 py-4 font-arabic font-bold transition-all active:scale-[0.98]"
            style={{
              borderBottom: walletOpen ? `1px solid rgba(212,175,55,0.2)` : "none",
              color: walletOpen ? GOLD : "rgba(212,175,55,0.65)",
            }}>
            <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(212,175,55,0.15)", border: "1.5px solid rgba(212,175,55,0.35)",
                boxShadow: "0 2px 10px rgba(212,175,55,0.15), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
              <Wallet className="w-5 h-5" style={{ color: GOLD }} />
            </div>
            <div className="flex-1 text-right">
              <p className="text-sm leading-none font-black" style={{ color: GOLD, textShadow: `0 0 14px rgba(212,175,55,0.6)` }}>محفظتي</p>
              <div className="flex items-center justify-end gap-1.5 mt-1.5">
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ background: "rgba(247,147,26,0.18)", border: "1px solid rgba(247,147,26,0.45)", color: "#f7931a" }}>₿</span>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ background: "rgba(20,241,149,0.15)", border: "1px solid rgba(20,241,149,0.4)", color: "#14f195" }}>◎</span>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ background: "rgba(38,161,123,0.18)", border: "1px solid rgba(38,161,123,0.45)", color: "#26a17b" }}>USDT</span>
                <div className="flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-md"
                  style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)" }}>
                  <img src="/mdd-token.jpg" className="w-3.5 h-3.5 rounded-full object-cover" style={{ boxShadow: "0 0 6px rgba(212,175,55,0.6)" }} alt="MDD" />
                  <span className="font-mono text-[10px] font-black" style={{ color: GOLD, textShadow: "0 0 8px rgba(212,175,55,0.7)" }}>$MDD</span>
                </div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
              style={{ transform: walletOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
          </button>

          <AnimatePresence>
            {walletOpen && (
              <motion.div key="wallet-content"
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                style={{ overflow: "hidden" }}>
                <div className="space-y-4 px-4 py-4"
                  style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.09),rgba(5,25,15,0.7))" }}>

                  {/* MDD locked balance */}
                  <div className="text-center relative overflow-hidden rounded-2xl px-4 py-5"
                    style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.15) 0%,rgba(0,10,5,0.5) 100%)", border: `1.5px solid rgba(212,175,55,0.4)` }}>
                    <motion.div className="absolute inset-0 pointer-events-none"
                      style={{ background: "linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.09) 50%,transparent 70%)" }}
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ repeat: Infinity, duration: 3.5, ease: "linear", repeatDelay: 2 }} />
                    <div className="relative z-10 flex flex-col items-center gap-3">
                      <div className="flex flex-col items-center gap-2">
                        {/* MDD token coin — centred, 50% larger, no border, no lock */}
                        <img src="/mdd-token.jpg" className="w-24 h-24 rounded-full object-cover"
                          style={{
                            border: "3px solid rgba(212,175,55,0.85)",
                            boxShadow: `0 0 28px rgba(212,175,55,0.6), 0 0 52px rgba(212,175,55,0.3), 0 0 0 6px rgba(212,175,55,0.12)`,
                            outline: "none",
                          }} alt="MDD" />
                        <span className="font-mono font-black text-lg tracking-widest"
                          style={{ color: GOLD, textShadow: `0 0 14px ${GOLD}90`, WebkitTextStroke: "0.5px rgba(255,220,100,0.5)" }}>$MDD</span>
                        <p className="font-mono font-black text-3xl tracking-[0.35em]"
                          style={{ color: GOLD, textShadow: `0 0 22px ${GOLD}70, 0 0 8px ${GOLD}40` }}>**********</p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-xl px-4 py-2"
                        style={{ background: "rgba(212,175,55,0.15)", border: `1.5px solid rgba(212,175,55,0.45)`,
                          boxShadow: "0 2px 12px rgba(212,175,55,0.15)" }}>
                        <Lock className="w-3.5 h-3.5" style={{ color: GOLD }} />
                        <span className="font-arabic text-xs font-bold" style={{ color: GOLD, textShadow: `0 0 10px ${GOLD}50` }}>تفتح قريبا بعد الايردروب</span>
                      </div>
                    </div>
                  </div>

                  {/* Wallet address placeholder */}
                  <div className="rounded-2xl px-4 py-4"
                    style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.1) 0%,rgba(0,10,5,0.45) 100%)", border: `1.5px solid rgba(212,175,55,0.35)` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Wallet className="w-3.5 h-3.5" style={{ color: GOLD }} />
                      <p className="font-arabic text-[11px] font-black" style={{ color: "#22c55e", textShadow: "0 0 8px rgba(34,197,94,0.4)" }}>عنوان المحفظة</p>
                      <span className="font-mono text-[9px] px-2 py-0.5 rounded-full mr-auto font-bold"
                        style={{ background: "rgba(212,175,55,0.18)", color: GOLD, border: `1px solid rgba(212,175,55,0.45)` }}>
                        قريباً
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                      style={{ background: "rgba(0,0,0,0.25)", border: `1.5px solid rgba(212,175,55,0.3)` }}>
                      <Lock className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
                      <span className="font-mono text-base tracking-widest flex-1 text-center"
                        style={{ color: "rgba(212,175,55,0.75)", letterSpacing: "0.25em",
                          textShadow: "0 0 8px rgba(212,175,55,0.4)" }}>
                        **************
                      </span>
                    </div>
                    <p className="font-arabic text-[11px] font-bold text-center mt-3"
                      style={{ color: "#22c55e", textShadow: "0 0 8px rgba(34,197,94,0.35)" }}>يُفعَّل بعد الإيردروب الرسمي</p>
                  </div>

                  {/* Account keys */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" style={{ color: GOLD }} />
                      <p className="font-arabic text-sm font-black" style={{ color: "#22c55e", textShadow: "0 0 10px rgba(34,197,94,0.5)" }}>مفاتيح الحساب</p>
                    </div>

                    {/* Wine-red warning */}
                    <div className="rounded-2xl p-3.5"
                      style={{ background: "linear-gradient(135deg,rgba(127,0,40,0.45) 0%,rgba(80,0,20,0.55) 100%)",
                        border: "2px solid rgba(180,30,60,0.6)", boxShadow: "0 2px 16px rgba(160,0,40,0.3)" }}>
                      <p className="font-arabic font-black text-sm leading-6 text-center"
                        style={{ color: "#ff6b8a", textShadow: "0 0 12px rgba(255,60,100,0.5)" }}>
                        ⚠️ لا تشارك هذه المفاتيح مع أي أحد — إنها كلمات سرك الخاصة
                      </p>
                    </div>

                    {/* Golden info box */}
                    <div className="rounded-2xl p-3.5"
                      style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.18) 0%,rgba(0,0,0,0.2) 100%)",
                        border: "1.5px solid rgba(212,175,55,0.5)", boxShadow: "0 2px 14px rgba(212,175,55,0.12)" }}>
                      <p className="font-arabic font-black text-[12px] leading-6 text-center"
                        style={{ color: "#22c55e", textShadow: "0 0 10px rgba(34,197,94,0.45)" }}>
                        🔑 فقدان هذه المفاتيح يعني فقدان رصيدك من $MDD يوم الإيردروب — احتفظ بها في مكان آمن
                      </p>
                    </div>

                    <KeyRow label="🔐 مفتاح الخزينة — Vault Key"    value={userData.vaultKey}    accent="#60a5fa" />
                    <KeyRow label="🪪 مفتاح الهوية — Identity Key"  value={userData.identityKey} accent="#a78bfa" />
                    <KeyRow label="👑 المفتاح الرئيسي — Master Key"  value={userData.masterKey}   accent={GOLD}    />
                  </div>

                  {/* ── Airdrop announcement box ── */}
                  <div className="rounded-2xl p-4 text-right"
                    style={{
                      background: "linear-gradient(135deg, rgba(212,175,55,0.13) 0%, rgba(0,30,15,0.55) 60%, rgba(34,197,94,0.08) 100%)",
                      border: "1.5px solid rgba(212,175,55,0.45)",
                      boxShadow: "0 4px 24px rgba(212,175,55,0.12), inset 0 1px 0 rgba(255,255,255,0.07)",
                    }}>
                    <div className="flex items-center justify-end gap-2 mb-3">
                      <p className="font-arabic text-sm font-black"
                        style={{ color: GOLD, textShadow: `0 0 12px rgba(212,175,55,0.7)` }}>🏆 جوائز وإيردروب $MDD</p>
                      <img src="/mdd-token.jpg" className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                        style={{ boxShadow: "0 0 10px rgba(212,175,55,0.6)" }} alt="MDD" />
                    </div>
                    <div className="space-y-3 font-arabic text-[12px] leading-7" dir="rtl">
                      <p style={{ color: "#e8fff0", textShadow: "0 0 6px rgba(34,197,94,0.2)" }}>
                        🥇 سيحصل <span className="font-black" style={{ color: "#4ade80" }}>أعلى 500 مشترك</span> من جامعي نقاط الولاء على{" "}
                        <span className="font-black" style={{ color: GOLD }}>جوائز مالية فورية</span> بالإضافة لحصة من إيردروب <span className="font-black" style={{ color: GOLD }}>$MDD</span>.
                      </p>
                      <p style={{ color: "#e8fff0", textShadow: "0 0 6px rgba(34,197,94,0.2)" }}>
                        🥈 كما سيحصل <span className="font-black" style={{ color: "#4ade80" }}>أعلى 1000 مشترك</span> من جامعي العملة على كمية{" "}
                        <span className="font-black" style={{ color: GOLD }}>مضاعفة 300%</span> من عملة <span className="font-black" style={{ color: GOLD }}>$MDD</span> في الإيردروب القادم.
                      </p>
                      <p style={{ color: "#e8fff0", textShadow: "0 0 6px rgba(34,197,94,0.2)" }}>
                        🪙 وكل مشترك يجمع نقاط ولاء سيحصل على كمية متناسبة مع نسبة نقاطه في يوم الإيردروب.
                      </p>
                      <p className="font-black text-center pt-1"
                        style={{ color: GOLD, textShadow: `0 0 14px rgba(212,175,55,0.6)`, letterSpacing: "0.04em" }}>
                        ✨ ترقّبوا موعد إطلاق العملة وتوزيعها ✨
                      </p>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Card 2: نقاط الولاء ── */}
        <div className="rounded-2xl overflow-hidden" style={{
          border: "1.5px solid rgba(212,175,55,0.32)",
          background: "linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(0,0,0,0.28) 60%, rgba(34,197,94,0.04) 100%)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 4px 24px rgba(212,175,55,0.07), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}>
          <button
            onClick={() => setPointsOpen(p => !p)}
            className="w-full flex items-center gap-3 px-4 py-4 font-arabic font-bold transition-all active:scale-[0.98]"
            style={{
              borderBottom: pointsOpen ? "1px solid rgba(212,175,55,0.18)" : "none",
              color: pointsOpen ? GOLD : "rgba(212,175,55,0.6)",
            }}>
            <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(212,175,55,0.15)", border: "1.5px solid rgba(212,175,55,0.38)",
                boxShadow: "0 2px 10px rgba(212,175,55,0.15), inset 0 1px 0 rgba(255,255,255,0.12)" }}>
              <motion.span className="text-xl"
                animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.12, 1.12, 1] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", repeatDelay: 2 }}>
                ⭐
              </motion.span>
            </div>
            <div className="flex-1 text-right">
              <p className="text-sm font-black" style={{
                color: "#f0f4ff",
                textShadow: "0 0 12px rgba(255,255,255,0.35), 0 1px 2px rgba(0,0,0,0.6)"
              }}>نقاط الولاء</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-base leading-none">🪙</span>
                <span className="text-base leading-none">🪙</span>
                <span className="text-base leading-none">🪙</span>
                <span className="font-mono text-[10px] font-black ml-1" style={{ color: GOLD, textShadow: "0 0 8px rgba(212,175,55,0.6)" }}>$MDD</span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
              style={{ transform: pointsOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
          </button>

          <AnimatePresence>
            {pointsOpen && (
              <motion.div key="points-content"
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                style={{ overflow: "hidden" }}>
                <div className="px-4 py-5 space-y-4"
                  style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.06) 0%,rgba(5,20,10,0.65) 100%)", borderTop: "1px solid rgba(212,175,55,0.2)" }}>
                  {/* Hero row: shield + points */}
                  <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.12) 0%,rgba(0,10,5,0.4) 100%)", border: "1.5px solid rgba(212,175,55,0.35)" }}>
                    <GoldenShield level={userData.level} size="sm" />
                    <div className="w-px self-stretch mx-1" style={{ background: "linear-gradient(to bottom, transparent, rgba(212,175,55,0.4), transparent)" }} />
                    <div className="flex-1 min-w-0" dir="rtl">
                      <motion.p className="font-mono font-black text-3xl leading-none"
                        style={{ color: GREEN, textShadow: `0 0 22px ${GREEN}80` }}
                        initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 280 }}>
                        {userData.loyaltyPoints.toLocaleString()}
                      </motion.p>
                      <p className="font-arabic text-[11px] font-bold mt-1"
                        style={{ color: "#e8f4ff", textShadow: "0 0 8px rgba(255,255,255,0.2)" }}>مجموع النقاط المكتسبة</p>
                      <span className="inline-block mt-2 font-arabic text-[10px] font-bold px-2 py-0.5 rounded-lg"
                        style={{ background: `${rankInfo.current.color}25`, border: `1.5px solid ${rankInfo.current.color}55`, color: rankInfo.current.color,
                          textShadow: `0 0 8px ${rankInfo.current.color}60` }}>
                        {rankInfo.current.name}
                      </span>
                    </div>
                  </div>
                  {/* Statement */}
                  <div className="rounded-xl px-3 py-2.5 text-center"
                    style={{ background: "rgba(34,197,94,0.1)", border: "1.5px solid rgba(34,197,94,0.3)" }}>
                    <p className="font-arabic text-[11px] leading-5 font-bold"
                      style={{ color: "#e8fff0", textShadow: "0 0 10px rgba(255,255,255,0.2)" }}>
                      ✦ نقاطك هي حصتك من عوائد المنظومة الإعلامية التشاركية ✦
                    </p>
                    <p className="font-arabic text-[10px] mt-0.5 font-bold"
                      style={{ color: "#d0ffe0" }}>تُحتسب كـ $MDD بعد الإيردروب الرسمي</p>
                  </div>
                  {/* Rank progress */}
                  {rankInfo.next && (
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="font-arabic text-[10px] font-bold" style={{ color: rankInfo.current.color }}>{rankInfo.current.name}</span>
                        <span className="font-arabic text-[10px] font-bold" style={{ color: rankInfo.next.color }}>{rankInfo.next.name}</span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <motion.div className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg,${rankInfo.current.color},${rankInfo.next.color})`,
                            boxShadow: `0 0 10px ${rankInfo.next.color}60` }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(rankInfo.progress * 100, 100)}%` }}
                          transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }} />
                      </div>
                      <p className="font-arabic text-[10px] font-bold mt-1.5 text-center"
                        style={{ color: "#c8f0d8" }}>
                        {rankInfo.next.minPts - userData.loyaltyPoints > 0
                          ? `${(rankInfo.next.minPts - userData.loyaltyPoints).toLocaleString()} نقطة للوصول إلى ${rankInfo.next.name}`
                          : "وصلت إلى الرتبة القصوى!"}
                      </p>
                    </div>
                  )}
                  {/* Point sources */}
                  <p className="font-arabic text-xs font-bold text-center"
                    style={{ color: "#e0f0ff", textShadow: "0 0 8px rgba(255,255,255,0.2)" }}>مصادر كسب النقاط السيادية</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { emoji: "🔬", label: "رصد وتوثيق",     pts: "+5 / شهادة" },
                      { emoji: "🏆", label: "مسابقات ثقافية", pts: "+5 / سؤال" },
                      { emoji: "🧠", label: "محرك المعرفة",   pts: "+10 / مستوى" },
                    ].map(it => (
                      <div key={it.label} className="rounded-xl p-2 text-center"
                        style={{ background: "rgba(34,197,94,0.1)", border: "1.5px solid rgba(34,197,94,0.3)" }}>
                        <div className="text-base mb-0.5">{it.emoji}</div>
                        <p className="font-arabic text-[9px] font-bold leading-tight" style={{ color: "#d0ffe8" }}>{it.label}</p>
                        <p className="font-mono text-[10px] font-black" style={{ color: GREEN, textShadow: `0 0 8px ${GREEN}60` }}>{it.pts}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom motto */}
        <p className="font-arabic text-center text-white/20 text-sm italic pt-2 pb-2">حقٌّ لا يموت</p>
      </div>
      )}
    </motion.div>
  );
}
