import { useState, useEffect, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, Copy, Check, Eye, EyeOff,
  Shield, Star, Lock, Zap, Users, Gift, Pencil, X, Loader2,
  UserPlus, UserCheck, Search, ChevronDown, MessageSquare, Send, Mail,
  Trash2, Ban,
} from "lucide-react";
import { useTelegram } from "../../lib/telegram";
import { apiFetch, getInitData } from "../../lib/api";
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

// ─── Civic Role Mini Shield ────────────────────────────────────────────────────
function CivicRoleShield({ role, size = "sm" }: { role: string | null | undefined; size?: "sm" | "xs" }) {
  if (!role) return null;
  const isGuardian = role === "guardian";
  const label = isGuardian ? "حارس الأرض" : "سفير القضية";
  const w = size === "xs" ? 36 : 48;
  const h = size === "xs" ? 40 : 54;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full"
      style={{ background: "rgba(212,175,55,0.13)", border: "1px solid rgba(212,175,55,0.45)",
               padding: size === "xs" ? "2px 7px" : "3px 10px" }}>

      <svg viewBox="0 0 32 36" width={w} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
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
        : isFollowing ? <><UserCheck className="w-3 h-3" />متابَع</>
        : <><UserPlus className="w-3 h-3" />متابعة</>}
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

function NetworkSection({ myTelegramId, onMessage }: { myTelegramId: string; onMessage?: (u: NetUser) => void }) {
  const [tab, setTab] = useState<"followers" | "following">("followers");
  const [expanded, setExpanded] = useState(false);
  const [followers, setFollowers] = useState<NetUser[]>([]);
  const [following, setFollowing] = useState<NetUser[]>([]);
  const [stats, setStats] = useState({ followersCount: 0, followingCount: 0 });
  const [loadingList, setLoadingList] = useState(false);
  const [query, setQuery] = useState("");
  const [searchRes, setSearchRes] = useState<NetUser[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    apiFetch("/api/users/me/network-stats")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); });
  }, [myTelegramId]);

  const loadList = useCallback(async (t: "followers" | "following") => {
    setLoadingList(true);
    const url = t === "followers" ? "/api/users/me/followers" : "/api/users/me/following";
    const res = await apiFetch(url);
    if (res.ok) {
      const data = await res.json();
      if (t === "followers") setFollowers(data); else setFollowing(data);
    }
    setLoadingList(false);
  }, [myTelegramId]);

  useEffect(() => {
    if (!expanded) return;
    loadList(tab);
  }, [expanded, tab, loadList]);

  useEffect(() => {
    if (!showSearch || query.length < 2) { setSearchRes([]); return; }
    const t = setTimeout(async () => {
      const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) setSearchRes(await res.json());
    }, 350);
    return () => clearTimeout(t);
  }, [query, showSearch, myTelegramId]);

  const displayList = tab === "followers" ? followers : following;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.025)", border: "1.5px solid rgba(96,165,250,0.18)", backdropFilter: "blur(20px)" }}>

      {/* Stats Row */}
      <div className="flex items-center gap-0 divide-x divide-white/5" dir="rtl">
        {/* Followers */}
        <button onClick={() => { setTab("followers"); setExpanded(true); setShowSearch(false); }}
          className="flex-1 flex flex-col items-center py-4 active:bg-white/5 transition-colors">
          <p className="font-mono font-black text-2xl" style={{ color: "#60a5fa", textShadow: "0 0 12px rgba(96,165,250,0.4)" }}>
            {stats.followersCount}
          </p>
          <p className="font-arabic text-[10px] text-white/40 mt-0.5">متابِع</p>
        </button>

        <div className="w-px self-stretch" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Following */}
        <button onClick={() => { setTab("following"); setExpanded(true); setShowSearch(false); }}
          className="flex-1 flex flex-col items-center py-4 active:bg-white/5 transition-colors">
          <p className="font-mono font-black text-2xl" style={{ color: "#4ade80", textShadow: "0 0 12px rgba(74,222,128,0.4)" }}>
            {stats.followingCount}
          </p>
          <p className="font-arabic text-[10px] text-white/40 mt-0.5">متابَع</p>
        </button>

        <div className="w-px self-stretch" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Search */}
        <button onClick={() => { setShowSearch(p => !p); setExpanded(true); }}
          className="px-4 flex flex-col items-center py-4 active:bg-white/5 transition-colors">
          <Search className="w-5 h-5 text-white/30" />
          <p className="font-arabic text-[10px] text-white/30 mt-0.5">بحث</p>
        </button>

        {/* Expand toggle */}
        <button onClick={() => setExpanded(p => !p)}
          className="px-3 self-stretch flex items-center active:bg-white/5 transition-colors">
          <ChevronDown className={`w-4 h-4 text-white/25 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Expandable Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div key="panel"
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            style={{ overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.05)" }}>

            {/* Tab bar + search (when not in search mode) */}
            {!showSearch && (
              <div className="flex gap-2 px-4 pt-3 pb-2" dir="rtl">
                {(["followers", "following"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-arabic text-xs font-bold transition-all"
                    style={{
                      background: tab === t ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${tab === t ? "rgba(96,165,250,0.35)" : "rgba(255,255,255,0.07)"}`,
                      color: tab === t ? "#60a5fa" : "rgba(255,255,255,0.35)",
                    }}>
                    {t === "followers" ? `متابِعون (${stats.followersCount})` : `متابَعون (${stats.followingCount})`}
                  </button>
                ))}
              </div>
            )}

            {/* Search mode */}
            {showSearch && (
              <div className="px-4 pt-3 pb-2 space-y-2">
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.09)" }}>
                  <Search className="w-4 h-4 text-white/25 flex-shrink-0" />
                  <input value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="ابحث بالاسم المستعار أو رقم الهوية..."
                    className="flex-1 bg-transparent font-arabic text-sm text-white/75 outline-none placeholder:text-white/20"
                    dir="rtl" autoFocus />
                  {query && <button onClick={() => { setQuery(""); setSearchRes([]); }} className="text-white/30"><X className="w-3.5 h-3.5" /></button>}
                </div>
              </div>
            )}

            {/* List */}
            <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
              {loadingList && !showSearch ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                </div>
              ) : showSearch ? (
                searchRes.length === 0 ? (
                  <p className="font-arabic text-xs text-white/20 text-center py-4">
                    {query.length < 2 ? "اكتب للبحث..." : "لا نتائج"}
                  </p>
                ) : (
                  searchRes.map(u => (
                    <NetUserRow key={u.telegramId} user={u} myTelegramId={myTelegramId} onMessage={onMessage} />
                  ))
                )
              ) : displayList.length === 0 ? (
                <p className="font-arabic text-xs text-white/20 text-center py-6">
                  {tab === "followers" ? "لا يتابعك أحد بعد" : "لا تتابع أحداً بعد"}
                </p>
              ) : (
                displayList.map(u => (
                  <NetUserRow key={u.telegramId} user={u} myTelegramId={myTelegramId} onMessage={onMessage} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NetUserRow({ user, myTelegramId, onMessage }: { user: NetUser; myTelegramId: string; onMessage?: (u: NetUser) => void }) {
  const RANKS: Record<string, string> = {
    Initiate: "#94a3b8", Guardian: "#22c55e", Sentinel: "#3b82f6",
    Champion: "#a855f7", Sovereign: "#d4af37", Legendary: "#f97316",
  };
  const rankColor = RANKS[user.rank] ?? "#94a3b8";

  return (
    <div className="rounded-xl px-2.5 py-2"
      style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}
      dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center font-mono font-black text-sm flex-shrink-0"
          style={{ background: `${rankColor}18`, border: `1.5px solid ${rankColor}30`, color: rankColor }}>
          {user.pseudonym.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-arabic text-xs font-bold text-white/80 truncate">{user.pseudonym}</p>
          <p className="font-mono text-[9px] text-white/30">{user.aliId} · LVL {user.level}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onMessage && myTelegramId !== user.telegramId && (
            <button onClick={() => onMessage(user)}
              className="flex items-center gap-0.5 px-2 py-1 rounded-xl font-arabic text-[10px] font-bold active:scale-90 transition-all"
              style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", color: GOLD }}>
              <MessageSquare className="w-3 h-3" />
              مراسلة
            </button>
          )}
          <ProfileFollowButton targetTelegramId={user.telegramId} myTelegramId={myTelegramId} />
        </div>
      </div>
      {user.civicRole && (
        <div className="mt-1.5 mr-12">
          <CivicRoleShield role={user.civicRole} size="xs" />
        </div>
      )}
    </div>
  );
}

// ─── Inbox View ───────────────────────────────────────────────────────────────
function InboxView({ myTelegramId, onOpenChat }: { myTelegramId: string; onOpenChat: (p: ChatPartner) => void }) {
  const [convs, setConvs]       = useState<Conversation[]>([]);
  const [loading, setLoading]   = useState(true);
  const RANK_COLORS: Record<string, string> = { Initiate: "#94a3b8", Guardian: "#22c55e", Sentinel: "#3b82f6", Champion: "#a855f7", Sovereign: "#d4af37", Legendary: "#f97316" };

  useEffect(() => {
    apiFetch("/api/messages/conversations")
      .then(r => r.ok ? r.json() : [])
      .then((data: Conversation[]) => { setConvs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [myTelegramId]);

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
                className="w-full flex items-center gap-3 rounded-xl px-3 py-3 active:bg-white/5 transition-colors"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {/* Avatar with unread dot */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-mono font-black text-sm"
                    style={{ background: `${rc}18`, border: `1.5px solid ${rc}30`, color: rc }}>
                    {conv.pseudonym.slice(0, 2).toUpperCase()}
                  </div>
                  {conv.unread > 0 && (
                    <div className="absolute -top-1 -left-1 rounded-full flex items-center justify-center font-mono font-black text-[9px] text-white"
                      style={{ background: "#ef4444", minWidth: 16, minHeight: 16, padding: "0 3px", boxShadow: "0 0 8px rgba(239,68,68,0.6)" }}>
                      {conv.unread}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-arabic text-xs font-bold text-white/80 truncate">{conv.pseudonym}</span>
                      {conv.civicRole && <CivicRoleShield role={conv.civicRole} size="xs" />}
                    </div>
                    <span className="font-mono text-[9px] text-white/25 flex-shrink-0">{formatMsgTime(conv.lastAt)}</span>
                  </div>
                  <p className="font-arabic text-[11px] text-white/40 truncate text-right">
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
            className="w-full bg-transparent font-arabic text-sm text-white/85 outline-none resize-none placeholder:text-white/25"
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
}: {
  myTelegramId: string;
  partner: ChatPartner;
  onBack: () => void;
  onDeleted?: () => void;
  onBlocked?: () => void;
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
    <motion.div className="absolute inset-0 z-40 flex flex-col"
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
                  <p className="font-arabic text-sm text-white/90 leading-relaxed" dir="auto">{msg.content}</p>
                  <p className="font-mono text-[9px] text-white/30 mt-0.5" style={{ direction: "ltr", textAlign: "right" }}>{formatMsgTime(msg.createdAt)}</p>
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

  const updateMutation = useUpdatePseudonym();

  // Tabs + chat state
  const [profileTab,   setProfileTab]   = useState<"profile" | "inbox">("profile");
  const [chatPartner,  setChatPartner]  = useState<ChatPartner | null>(null);
  const [unreadCount,  setUnreadCount]  = useState(0);

  // Civic role
  const [civicRole,    setCivicRole]    = useState<string | null>(userData.civicRole ?? null);
  const [savingRole,   setSavingRole]   = useState(false);

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

  const photoUrl  = user?.photo_url;
  const firstName = userData.firstName || user?.first_name || "";
  const lastName  = userData.lastName  || user?.last_name  || "";
  const username  = userData.telegramUsername || user?.username;
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || pseudonym;
  const initials  = displayName.slice(0, 2).toUpperCase();

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

  const joinDate = new Date(userData.createdAt).toLocaleDateString("ar-SY", { year: "numeric", month: "long", day: "numeric" });

  const activities = [
    ...(userData.level > 1 ? [{ emoji: "🧠", text: `أكملت ${userData.level - 1} مستوى في محرك المعرفة`, sub: `المستوى الحالي: ${userData.level}`, color: GOLD }] : []),
    ...(userData.loyaltyPoints > 0 ? [{ emoji: "⭐", text: `جمعت ${userData.loyaltyPoints.toLocaleString()} نقطة ولاء`, sub: "من الأسئلة ومشاهدة الإعلانات", color: GREEN }] : []),
    ...(userData.keysConfirmed ? [{ emoji: "🔐", text: "أكّدت مفاتيح الأمان الثلاثة", sub: "حسابك محمي بالكامل", color: "#60a5fa" }] : []),
    { emoji: "🌿", text: "انضممت إلى مبادرة التحرير العلوي", sub: joinDate, color: GREEN },
  ];

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
            <h1 className="font-arabic font-bold text-[#d4af37] text-lg leading-tight">ملف العضو</h1>
            <p className="font-arabic text-white/35 text-xs">{userData.aliId}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full px-3 py-1"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <span className="font-mono text-xs font-bold text-green-400">LVL {userData.level}</span>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex px-4 pb-2 gap-2" dir="rtl">
          <button onClick={() => setProfileTab("profile")}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-arabic text-xs font-bold transition-all"
            style={{
              background: profileTab === "profile" ? "rgba(212,175,55,0.12)" : "transparent",
              border: `1px solid ${profileTab === "profile" ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.08)"}`,
              color: profileTab === "profile" ? GOLD : "rgba(255,255,255,0.35)",
            }}>
            <Shield className="w-3.5 h-3.5" />
            ملفي
          </button>
          <button onClick={() => setProfileTab("inbox")}
            className="relative flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-arabic text-xs font-bold transition-all"
            style={{
              background: profileTab === "inbox" ? "rgba(96,165,250,0.12)" : "transparent",
              border: `1px solid ${profileTab === "inbox" ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.08)"}`,
              color: profileTab === "inbox" ? "#60a5fa" : "rgba(255,255,255,0.35)",
            }}>
            <Mail className="w-3.5 h-3.5" />
            البريد الخاص
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 rounded-full font-mono font-black text-white flex items-center justify-center"
                style={{ background: "#ef4444", minWidth: 16, minHeight: 16, fontSize: 9, padding: "0 3px", boxShadow: "0 0 8px rgba(239,68,68,0.7)" }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

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
          />
        )}
      </AnimatePresence>

      {/* ── Inbox tab ── */}
      {profileTab === "inbox" && !chatPartner && (
        <div className="flex-1 overflow-y-auto">
          <InboxView myTelegramId={telegramId} onOpenChat={handleOpenChat} />
        </div>
      )}

      {/* ── Profile tab ── */}
      {profileTab === "profile" && (
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

          {/* ── Civic Role Selector ── */}
          <div className="mt-4 w-full" dir="rtl">
            <p className="font-arabic text-[11px] text-white/40 mb-2 text-center">الدور المدني (اختياري)</p>
            <div className="flex gap-2 justify-center flex-wrap">
              {[
                { key: "guardian", label: "حارس الأرض", color: "#22c55e", desc: "🌿" },
                { key: "ambassador", label: "سفير القضية", color: "#60a5fa", desc: "🕊️" },
              ].map(opt => (
                <button key={opt.key}
                  onClick={() => saveCivicRole(civicRole === opt.key ? null : opt.key)}
                  disabled={savingRole}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-arabic text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
                  style={{
                    background: civicRole === opt.key ? `${opt.color}18` : "rgba(0,0,0,0.2)",
                    border: `1.5px solid ${civicRole === opt.key ? opt.color + "60" : "rgba(255,255,255,0.1)"}`,
                    color: civicRole === opt.key ? opt.color : "rgba(255,255,255,0.35)",
                  }}>
                  {opt.desc} {opt.label}
                  {civicRole === opt.key && <Check className="w-3 h-3 mr-0.5" />}
                </button>
              ))}
            </div>
            {civicRole && (
              <div className="flex justify-center mt-2">
                <CivicRoleShield role={civicRole} size="sm" />
              </div>
            )}
          </div>
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
          <div className="text-center mb-3">
            <motion.p className="font-mono font-black text-4xl leading-none"
              style={{ color: GREEN, textShadow: `0 0 20px ${GREEN}60` }}
              initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
              {userData.loyaltyPoints.toLocaleString()}
            </motion.p>
            <p className="font-arabic text-white/40 text-xs mt-1">مجموع النقاط المكتسبة</p>
          </div>

          {/* Sovereignty statement */}
          <div className="rounded-xl px-3 py-2.5 mb-4 text-center"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <p className="font-arabic text-[11px] leading-5" style={{ color: "rgba(74,222,128,0.8)" }}>
              ✦ نقاطك هي حصتك من عوائد المنظومة الإعلامية التشاركية ✦
            </p>
            <p className="font-arabic text-[10px] text-white/30 mt-0.5">تُحتسب كـ $MDD بعد الإيردروب الرسمي</p>
          </div>

          {/* Progress to next rank */}
          {rankInfo.next && (
            <div className="mb-4">
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

          {/* How to earn — 3 sovereign activities */}
          <p className="font-arabic text-[10px] text-white/35 mb-2 text-center">مصادر كسب النقاط السيادية</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { emoji: "🔬", label: "الرصد الميداني", pts: "+5 / شهادة" },
              { emoji: "🏆", label: "مسابقات ثقافية", pts: "+5 / سؤال" },
              { emoji: "🧠", label: "محرك المعرفة",   pts: "+10 / مستوى" },
            ].map(it => (
              <div key={it.label} className="rounded-xl p-2 text-center"
                style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <div className="text-base mb-0.5">{it.emoji}</div>
                <p className="font-arabic text-[9px] text-white/50 leading-tight">{it.label}</p>
                <p className="font-mono text-[10px] font-bold" style={{ color: GREEN }}>{it.pts}</p>
              </div>
            ))}
          </div>

          {/* Sovereign Contribution Log */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(34,197,94,0.2)" }}>
            <div className="px-3 py-2 flex items-center gap-2"
              style={{ background: "rgba(34,197,94,0.08)", borderBottom: "1px solid rgba(34,197,94,0.12)" }}>
              <span className="text-sm">📋</span>
              <p className="font-arabic text-xs font-bold" style={{ color: GREEN }}>سجل المساهمات السيادية</p>
            </div>
            <div className="divide-y" style={{ divideColor: "rgba(255,255,255,0.04)" }}>
              {[
                { icon: "🔬", label: "وثائق مرفوعة للأرشيف",         value: "—", hint: "عبر تبويب الرصد" },
                { icon: "📊", label: "إحصائيات تمت المشاركة بها",     value: "—", hint: "عبر تبويب الرصد" },
                { icon: "🏆", label: "مسابقات ثقافية مُنجزة",         value: userData.level > 1 ? `${userData.level - 1}` : "—", hint: "عبر مركز ADAR" },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="text-base flex-shrink-0">{row.icon}</span>
                  <div className="flex-1">
                    <p className="font-arabic text-[11px] text-white/60">{row.label}</p>
                    <p className="font-arabic text-[9px] text-white/25">{row.hint}</p>
                  </div>
                  <span className="font-mono text-sm font-bold" style={{ color: GREEN }}>{row.value}</span>
                </div>
              ))}
            </div>
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
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] text-white/30 truncate">t.me/ALI_MDD_BOT/app?startapp={referralCode}</p>
              <CopyButton text={botDeepLink} label="نسخ الرابط" />
            </div>
          </div>

          {/* Share button */}
          <button
            onClick={openInviteLink}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-arabic font-bold text-sm active:scale-95 transition-all mb-3"
            style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.2),rgba(22,163,74,0.25))", border: `1.5px solid ${GREEN}45`, color: GREEN }}>
            <Gift className="w-4 h-4" />
            دعوة صديق إلى البوت عبر تيليغرام
          </button>

          {/* Real referral count */}
          <ReferralCount telegramId={telegramId} />
        </GlassCard>

        {/* ── NETWORK ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span style={{ color: "#60a5fa" }}><Users className="w-4 h-4" /></span>
            <span className="font-arabic font-bold text-sm" style={{ color: "#60a5fa" }}>شبكتي الاجتماعية</span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg,rgba(96,165,250,0.4),transparent)" }} />
          </div>
          <NetworkSection myTelegramId={telegramId} onMessage={handleOpenChat} />
        </div>

        {/* Bottom motto */}
        <p className="font-arabic text-center text-white/20 text-sm italic pt-2">حقٌّ لا يموت</p>
      </div>
      )}
    </motion.div>
  );
}
