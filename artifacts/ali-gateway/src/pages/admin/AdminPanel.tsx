import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Users, FileText, Bell, Shield, ChevronDown,
  Ban, UserCheck, Trash2, RefreshCw, Search,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

const GOLD   = "#d4af37";
const RED    = "#ef4444";
const GREEN  = "#22c55e";
const BG     = "linear-gradient(160deg, #020e04 0%, #061409 50%, #020e04 100%)";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdminUser {
  id: number;
  aliId: string;
  pseudonym: string;
  telegramId: string;
  telegramUsername: string | null;
  firstName: string | null;
  role: string;
  civicRole: string | null;
  loyaltyPoints: number;
  level: number;
  isBanned: boolean;
  banReason: string | null;
  createdAt: string;
}

interface ContentItem {
  id: number;
  title: string;
  body: string | null;
  mediaUrl: string | null;
  authorPseudonym: string;
  authorAliId: string;
  authorTelegramId: string;
  category: string | null;
  viewCount: number;
  createdAt: string;
  isAdar: boolean;
}

interface AdminNotif {
  id: number;
  type: string;
  refId: string | null;
  refTitle: string | null;
  actorName: string | null;
  seen: boolean;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  totalArticles: number;
  bannedUsers: number;
  unseenNotifs: number;
}

// ── Role badge ─────────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  admin: "#ef4444", staff: "#f97316", moderator: "#8b5cf6",
  publisher: "#3b82f6", member: "#6b7280",
};
const ROLE_LABELS: Record<string, string> = {
  admin: "مشرف", staff: "طاقم", moderator: "مراقب",
  publisher: "ناشر", member: "عضو",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full"
      style={{ background: `${ROLE_COLORS[role] ?? "#6b7280"}22`, color: ROLE_COLORS[role] ?? "#6b7280", border: `1px solid ${ROLE_COLORS[role] ?? "#6b7280"}44` }}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

// ── Stats row ─────────────────────────────────────────────────────────────────
function StatsRow({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  const items = [
    { label: "المستخدمون", value: stats.totalUsers, color: GOLD },
    { label: "المنشورات", value: stats.totalArticles, color: "#3b82f6" },
    { label: "محظورون", value: stats.bannedUsers, color: RED },
    { label: "إشعارات جديدة", value: stats.unseenNotifs, color: GREEN },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 px-4 py-3" dir="rtl">
      {items.map(({ label, value, color }) => (
        <div key={label} className="flex flex-col items-center rounded-xl py-2"
          style={{ background: `${color}0d`, border: `1px solid ${color}25` }}>
          <span className="font-mono font-bold text-lg" style={{ color }}>{value}</span>
          <span className="font-arabic text-[9px] text-white/40 mt-0.5 text-center leading-tight">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [q, setQ]                 = useState("");
  const [expanded, setExpanded]   = useState<number | null>(null);
  const [actionLoading, setAL]    = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/users?limit=60&q=${encodeURIComponent(q)}`);
      if (res.ok) setUsers(await res.json());
    } finally { setLoading(false); }
  }, [q]);

  useEffect(() => { void load(); }, [load]);

  async function changeRole(telegramId: number | string, role: string) {
    setAL(Number(telegramId));
    await apiFetch(`/api/admin/users/${telegramId}/role`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setAL(null);
    void load();
  }

  async function toggleBan(user: AdminUser) {
    setAL(user.id);
    const reason = user.isBanned ? undefined : prompt("سبب الحظر (اختياري)") ?? undefined;
    await apiFetch(`/api/admin/users/${user.telegramId}/ban`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: !user.isBanned, reason }),
    });
    setAL(null);
    void load();
  }

  const ROLES = ["member", "publisher", "moderator", "staff", "admin"];

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Search */}
      <div className="flex-shrink-0 px-4 py-2">
        <div className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.15)" }}>
          <Search size={14} color="rgba(255,255,255,0.35)" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="بحث بالاسم أو aliId أو ID..."
            className="flex-1 bg-transparent text-white text-sm font-arabic outline-none placeholder:text-white/25"
            dir="rtl"
          />
          {q && <button onClick={() => setQ("")}><X size={13} color="rgba(255,255,255,0.35)" /></button>}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {loading && (
          <div className="flex justify-center pt-8">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }} />
          </div>
        )}
        {!loading && users.map(u => (
          <motion.div key={u.id} layout className="rounded-2xl overflow-hidden"
            style={{ background: u.isBanned ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.04)", border: `1px solid ${u.isBanned ? RED + "33" : "rgba(212,175,55,0.12)"}` }}>

            {/* Row header */}
            <button className="w-full flex items-center gap-3 px-3 py-3 text-right"
              onClick={() => setExpanded(e => e === u.id ? null : u.id)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-arabic font-bold text-sm text-white/90 truncate">{u.pseudonym}</span>
                  <RoleBadge role={u.role} />
                  {u.isBanned && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: `${RED}22`, color: RED, border: `1px solid ${RED}44` }}>محظور</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px] text-white/30">{u.aliId}</span>
                  {u.telegramUsername && <span className="font-mono text-[10px] text-white/25">@{u.telegramUsername}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-arabic text-[10px] text-white/30">نقاط: {u.loyaltyPoints}</span>
                <ChevronDown size={14} color="rgba(255,255,255,0.3)"
                  style={{ transform: expanded === u.id ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </div>
            </button>

            {/* Expanded actions */}
            <AnimatePresence>
              {expanded === u.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                  className="overflow-hidden">
                  <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    {/* Role change */}
                    <div className="pt-2">
                      <p className="font-arabic text-[10px] text-white/40 mb-1.5">تغيير الدور</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ROLES.map(r => (
                          <button key={r} onClick={() => changeRole(u.telegramId, r)}
                            disabled={actionLoading === u.id || u.role === r}
                            className="text-[10px] font-mono px-2 py-1 rounded-lg transition-all disabled:opacity-40"
                            style={{
                              background: u.role === r ? `${ROLE_COLORS[r]}25` : "rgba(255,255,255,0.06)",
                              color: u.role === r ? ROLE_COLORS[r] : "rgba(255,255,255,0.5)",
                              border: `1px solid ${u.role === r ? ROLE_COLORS[r] + "55" : "rgba(255,255,255,0.1)"}`,
                            }}>
                            {ROLE_LABELS[r]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ban/Unban */}
                    <div className="flex items-center justify-between pt-1">
                      {u.banReason && (
                        <span className="font-arabic text-[10px] text-white/30 flex-1 ml-3">سبب: {u.banReason}</span>
                      )}
                      <button onClick={() => toggleBan(u)}
                        disabled={actionLoading === u.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-arabic font-bold transition-all disabled:opacity-40"
                        style={{
                          background: u.isBanned ? `${GREEN}15` : `${RED}15`,
                          color: u.isBanned ? GREEN : RED,
                          border: `1px solid ${u.isBanned ? GREEN : RED}44`,
                        }}>
                        {u.isBanned ? <UserCheck size={12} /> : <Ban size={12} />}
                        {u.isBanned ? "رفع الحظر" : "حظر المستخدم"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
        {!loading && users.length === 0 && (
          <p className="text-center font-arabic text-white/25 text-sm pt-10">لا توجد نتائج</p>
        )}
      </div>
    </div>
  );
}

// ── Content Tab ───────────────────────────────────────────────────────────────
function ContentTab() {
  const [items, setItems]       = useState<ContentItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/content?limit=50");
      if (res.ok) setItems(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function deleteItem(id: number) {
    if (!confirm("حذف هذا المنشور نهائياً؟")) return;
    setDeleting(id);
    await apiFetch(`/api/admin/articles/${id}`, { method: "DELETE" });
    setDeleting(null);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  const MEDIA_RE = /\.(mp4|webm|mov|avi|mkv|png|jpe?g|gif|webp)(\?|$)/i;

  return (
    <div className="flex flex-col h-full" dir="rtl">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2">
        <p className="font-arabic text-white/40 text-xs">{items.length} منشور</p>
        <button onClick={load} className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
          <RefreshCw size={13} color={GOLD} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {loading && (
          <div className="flex justify-center pt-8">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }} />
          </div>
        )}
        {!loading && items.map(item => {
          const isMedia = item.mediaUrl ? MEDIA_RE.test(item.mediaUrl) : false;
          const typeLabel = item.isAdar ? "ADAR" : isMedia ? "ريلز" : "تقرير";
          const typeColor = item.isAdar ? GOLD : isMedia ? "#8b5cf6" : "#3b82f6";
          return (
            <div key={item.id} className="flex items-start gap-3 rounded-2xl px-3 py-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.10)" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{ background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}33` }}>
                    {typeLabel}
                  </span>
                  <span className="font-arabic text-white/30 text-[10px]">{item.authorPseudonym}</span>
                </div>
                <p className="font-arabic text-sm text-white/80 leading-snug line-clamp-2">
                  {item.title || item.body?.slice(0, 80) || "—"}
                </p>
                <p className="font-mono text-[9px] text-white/25 mt-1">
                  {new Date(item.createdAt).toLocaleDateString("ar-SY")} · {item.viewCount} مشاهدة
                </p>
              </div>
              <button onClick={() => deleteItem(item.id)} disabled={deleting === item.id}
                className="flex-shrink-0 p-2 rounded-xl transition-all active:scale-90 disabled:opacity-30"
                style={{ background: `${RED}15`, border: `1px solid ${RED}33` }}>
                {deleting === item.id
                  ? <div className="w-4 h-4 border border-red-400 rounded-full animate-spin" style={{ borderTopColor: "transparent" }} />
                  : <Trash2 size={14} color={RED} />
                }
              </button>
            </div>
          );
        })}
        {!loading && items.length === 0 && (
          <p className="text-center font-arabic text-white/25 text-sm pt-10">لا يوجد محتوى</p>
        )}
      </div>
    </div>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────────
const NOTIF_ICONS: Record<string, string> = {
  new_report: "📋", new_media: "🎬", new_user: "👤", flag: "🚩",
};
const NOTIF_LABELS: Record<string, string> = {
  new_report: "تقرير جديد", new_media: "ريلز جديد", new_user: "مستخدم جديد", flag: "بلاغ",
};

function NotifsTab({ onMarkSeen }: { onMarkSeen: () => void }) {
  const [notifs, setNotifs]   = useState<AdminNotif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/notifications");
      if (res.ok) setNotifs(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function markAllSeen() {
    await apiFetch("/api/admin/notifications/seen", { method: "POST" });
    setNotifs(prev => prev.map(n => ({ ...n, seen: true })));
    onMarkSeen();
  }

  const unseen = notifs.filter(n => !n.seen).length;

  return (
    <div className="flex flex-col h-full" dir="rtl">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2">
        {unseen > 0 && (
          <button onClick={markAllSeen}
            className="font-arabic text-xs px-3 py-1.5 rounded-xl"
            style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}33` }}>
            تعليم الكل مقروء ({unseen})
          </button>
        )}
        <button onClick={load} className="p-1.5 rounded-lg mr-auto" style={{ background: "rgba(255,255,255,0.06)" }}>
          <RefreshCw size={13} color={GOLD} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {loading && (
          <div className="flex justify-center pt-8">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }} />
          </div>
        )}
        {!loading && notifs.map(n => (
          <div key={n.id} className="flex items-start gap-3 rounded-2xl px-3 py-3 transition-all"
            style={{
              background: n.seen ? "rgba(255,255,255,0.03)" : "rgba(212,175,55,0.06)",
              border: `1px solid ${n.seen ? "rgba(255,255,255,0.07)" : "rgba(212,175,55,0.22)"}`,
            }}>
            <span className="text-xl flex-shrink-0 mt-0.5">{NOTIF_ICONS[n.type] ?? "🔔"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-arabic text-sm font-bold" style={{ color: n.seen ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.9)" }}>
                  {NOTIF_LABELS[n.type] ?? n.type}
                </span>
                {!n.seen && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GOLD }} />}
              </div>
              {n.refTitle && <p className="font-arabic text-xs text-white/50 line-clamp-2">{n.refTitle}</p>}
              {n.actorName && <p className="font-arabic text-[10px] text-white/30 mt-0.5">بواسطة: {n.actorName}</p>}
              <p className="font-mono text-[9px] text-white/20 mt-1">
                {new Date(n.createdAt).toLocaleString("ar-SY")}
              </p>
            </div>
          </div>
        ))}
        {!loading && notifs.length === 0 && (
          <div className="flex flex-col items-center pt-12 gap-3">
            <Bell size={32} color="rgba(255,255,255,0.1)" />
            <p className="font-arabic text-white/25 text-sm">لا توجد إشعارات</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main AdminPanel ───────────────────────────────────────────────────────────
type AdminTab = "users" | "content" | "notifs";

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab]         = useState<AdminTab>("notifs");
  const [stats, setStats]     = useState<Stats | null>(null);
  const [unseenCount, setUnseen] = useState(0);

  useEffect(() => {
    apiFetch("/api/admin/stats").then(r => r.ok ? r.json() : null).then(d => {
      if (d) { setStats(d); setUnseen(d.unseenNotifs); }
    }).catch(() => {});
  }, []);

  const TABS: { id: AdminTab; label: string; Icon: typeof Bell }[] = [
    { id: "notifs",  label: "الإشعارات", Icon: Bell      },
    { id: "users",   label: "المستخدمون", Icon: Users     },
    { id: "content", label: "المحتوى",    Icon: FileText  },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: BG }}
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 340, damping: 36 }}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-4 pb-2"
        style={{ borderBottom: "1px solid rgba(212,175,55,0.14)" }}>
        <Shield size={20} color={GOLD} style={{ filter: `drop-shadow(0 0 6px ${GOLD}88)` }} />
        <div className="flex-1">
          <h1 className="font-arabic font-black text-base text-white leading-tight">لوحة الإدارة</h1>
          <p className="font-mono text-[9px] text-white/30">ADMIN CONTROL PANEL</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl active:scale-90 transition-transform"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <X size={16} color="rgba(255,255,255,0.7)" />
        </button>
      </div>

      {/* Stats */}
      <StatsRow stats={stats} />

      {/* Tab switcher */}
      <div className="flex-shrink-0 flex gap-2 px-4 pb-2">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          const hasBadge = id === "notifs" && unseenCount > 0;
          return (
            <button key={id} onClick={() => setTab(id)}
              className="relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-arabic text-xs font-bold transition-all"
              style={{
                background: active ? `${GOLD}18` : "rgba(255,255,255,0.04)",
                color: active ? GOLD : "rgba(255,255,255,0.4)",
                border: `1px solid ${active ? GOLD + "44" : "rgba(255,255,255,0.08)"}`,
              }}>
              <Icon size={13} />
              {label}
              {hasBadge && (
                <span className="absolute -top-1 -left-1 min-w-[16px] h-4 rounded-full flex items-center justify-center font-mono text-[9px] font-bold px-1"
                  style={{ background: RED, color: "white" }}>
                  {unseenCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} className="h-full"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {tab === "notifs"  && <NotifsTab  onMarkSeen={() => setUnseen(0)} />}
            {tab === "users"   && <UsersTab   />}
            {tab === "content" && <ContentTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
