import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, Mic, MicOff, PhoneOff, Hand, Users, Plus,
  Clock, Radio, Share2, X, Loader2, Crown, CheckCircle,
  ChevronDown, Search, UserPlus, UserCheck, Bell, ShieldCheck,
} from "lucide-react";
import { useTelegram } from "../../lib/telegram";

const GOLD  = "#d4af37";
const BLUE  = "#60a5fa";
const GREEN = "#4ade80";
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// ─── Types ──────────────────────────────────────────────────────────────────
type SpaceStatus = "scheduled" | "live" | "ended";
type ParticipantRole = "host" | "speaker" | "listener";

interface Participant {
  id: number; spaceId: number; telegramId: string; pseudonym: string;
  aliId: string; role: ParticipantRole; isMuted: boolean; raisedHand: boolean;
  joinedAt: string; lastSeenAt: string;
}
interface SpaceDetails {
  id: number; title: string; description: string | null;
  hostTelegramId: string; hostPseudonym: string; hostAliId: string;
  status: SpaceStatus; scheduledAt: string | null; startedAt: string | null;
  participants: Participant[];
}
interface SpaceSummary {
  id: number; title: string; hostPseudonym: string; status: SpaceStatus;
  scheduledAt: string | null; startedAt: string | null; participantCount: number;
}
interface UserResult {
  telegramId: string; aliId: string; pseudonym: string; rank: string; level: number;
}
interface SpaceInviteAlert {
  id: number; spaceId: number; role: string; spaceTitle: string;
  spaceStatus: string; hostPseudonym: string;
}

// ─── Follow Button ───────────────────────────────────────────────────────────
function FollowButton({ targetTelegramId, myTelegramId, small = false }: {
  targetTelegramId: string; myTelegramId: string; small?: boolean;
}) {
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!myTelegramId || !targetTelegramId || myTelegramId === targetTelegramId) return;
    fetch("/api/users/follow-check", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-telegram-id": myTelegramId },
      body: JSON.stringify({ telegramIds: [targetTelegramId] }),
    }).then(r => r.ok ? r.json() : {})
      .then(map => setIsFollowing(!!map[targetTelegramId]));
  }, [targetTelegramId, myTelegramId]);

  if (myTelegramId === targetTelegramId || isFollowing === null) return null;

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    const method = isFollowing ? "DELETE" : "POST";
    await fetch(`/api/users/follow/${targetTelegramId}`, {
      method, headers: { "x-telegram-id": myTelegramId },
    });
    setIsFollowing(p => !p);
    setLoading(false);
  };

  if (small) {
    return (
      <button onClick={toggle} disabled={loading}
        className="p-1.5 rounded-full active:scale-90 transition-all flex-shrink-0"
        style={{
          background: isFollowing ? "rgba(74,222,128,0.1)" : "rgba(96,165,250,0.12)",
          border: `1px solid ${isFollowing ? GREEN + "30" : BLUE + "30"}`,
        }}>
        {loading ? <Loader2 style={{ width: 10, height: 10, color: BLUE }} className="animate-spin" />
          : isFollowing ? <UserCheck style={{ width: 10, height: 10, color: GREEN }} />
          : <UserPlus style={{ width: 10, height: 10, color: BLUE }} />}
      </button>
    );
  }

  return (
    <button onClick={toggle} disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-arabic text-xs font-bold active:scale-95 transition-all"
      style={{
        background: isFollowing ? "rgba(74,222,128,0.08)" : "rgba(96,165,250,0.1)",
        border: `1px solid ${isFollowing ? GREEN + "30" : BLUE + "25"}`,
        color: isFollowing ? GREEN : BLUE,
      }}>
      {loading ? <Loader2 className="w-3 h-3 animate-spin" />
        : isFollowing ? <><UserCheck className="w-3 h-3" />متابَع</>
        : <><UserPlus className="w-3 h-3" />متابعة</>}
    </button>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ pseudonym, role, isMuted, isSpeaking, size = 52 }: {
  pseudonym: string; role: ParticipantRole; isMuted: boolean;
  isSpeaking?: boolean; size?: number;
}) {
  const initials = pseudonym.slice(0, 2).toUpperCase();
  const accent = role === "host" ? GOLD : role === "speaker" ? BLUE : "rgba(255,255,255,0.18)";
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <motion.div className="w-full h-full rounded-full flex items-center justify-center font-mono font-black"
        animate={isSpeaking ? { boxShadow: [`0 0 0 0 ${accent}60`, `0 0 0 8px ${accent}00`] } : {}}
        transition={{ repeat: Infinity, duration: 1.2 }}
        style={{ background: `linear-gradient(135deg,${accent}30,${accent}12)`, border: `2px solid ${accent}55`, fontSize: size * 0.3, color: accent }}>
        {initials}
      </motion.div>
      {role === "host" && (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: "#1a1200", border: `1px solid ${GOLD}50` }}>
          <Crown style={{ width: 9, height: 9, color: GOLD }} />
        </div>
      )}
      {(role === "speaker" || role === "host") && (
        <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: "#0d0d1a", border: `1px solid ${isMuted ? "rgba(239,68,68,0.45)" : BLUE + "50"}` }}>
          {isMuted
            ? <MicOff style={{ width: 8, height: 8, color: "#ef4444" }} />
            : <Mic style={{ width: 8, height: 8, color: BLUE }} />}
        </div>
      )}
    </div>
  );
}

// ─── WebRTC Audio Hook ───────────────────────────────────────────────────────
function useSpaceAudio({ spaceId, myTelegramId, myRole, participants, enabled }: {
  spaceId: number; myTelegramId: string; myRole: ParticipantRole;
  participants: Participant[]; enabled: boolean;
}) {
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioEls = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const processedRef = useRef<Set<number>>(new Set());

  const postSignal = useCallback(async (toPeerId: string, type: string, payload: string) => {
    await fetch(`/api/spaces/${spaceId}/signals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-telegram-id": myTelegramId },
      body: JSON.stringify({ toPeerId, type, payload }),
    });
  }, [spaceId, myTelegramId]);

  const createPC = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcsRef.current.set(peerId, pc);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
    }
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      let el = audioEls.current.get(peerId);
      if (!el) { el = new Audio(); el.autoplay = true; audioEls.current.set(peerId, el); }
      el.srcObject = stream;
    };
    pc.onicecandidate = (e) => { if (e.candidate) postSignal(peerId, "ice", JSON.stringify(e.candidate)); };
    return pc;
  }, [postSignal]);

  useEffect(() => {
    if (!enabled || myRole === "listener") return;
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => { localStreamRef.current = stream; setAudioReady(true); })
      .catch(() => {});
    return () => { localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null; };
  }, [enabled, myRole]);

  useEffect(() => {
    if (!enabled) return;
    const speakersAndHost = participants.filter(p => (p.role === "speaker" || p.role === "host") && p.telegramId !== myTelegramId);
    if (myRole === "listener") {
      speakersAndHost.forEach(async (p) => {
        if (pcsRef.current.has(p.telegramId)) return;
        const pc = createPC(p.telegramId);
        pc.addTransceiver("audio", { direction: "recvonly" });
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        postSignal(p.telegramId, "offer", JSON.stringify(offer));
      });
    } else if (audioReady) {
      speakersAndHost.forEach(async (p) => {
        if (pcsRef.current.has(p.telegramId)) return;
        const initiator = myTelegramId > p.telegramId;
        if (initiator) {
          const pc = createPC(p.telegramId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          postSignal(p.telegramId, "offer", JSON.stringify(offer));
        } else { createPC(p.telegramId); }
      });
    }
  }, [participants, enabled, audioReady, myRole, myTelegramId, createPC, postSignal]);

  useEffect(() => {
    if (!enabled) return;
    const poll = async () => {
      const res = await fetch(`/api/spaces/${spaceId}/signals`, { headers: { "x-telegram-id": myTelegramId } });
      if (!res.ok) return;
      const signals: { id: number; fromTelegramId: string; type: string; payload: string }[] = await res.json();
      for (const sig of signals) {
        if (processedRef.current.has(sig.id)) continue;
        processedRef.current.add(sig.id);
        let pc = pcsRef.current.get(sig.fromTelegramId);
        if (sig.type === "offer") {
          if (!pc) pc = createPC(sig.fromTelegramId);
          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(sig.payload)));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          postSignal(sig.fromTelegramId, "answer", JSON.stringify(answer));
        } else if (sig.type === "answer" && pc) {
          if (pc.signalingState === "have-local-offer") await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(sig.payload)));
        } else if (sig.type === "ice" && pc) {
          try { await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(sig.payload))); } catch {}
        }
      }
    };
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [spaceId, myTelegramId, enabled, createPC, postSignal]);

  useEffect(() => {
    return () => {
      pcsRef.current.forEach(pc => pc.close()); pcsRef.current.clear();
      audioEls.current.forEach(el => { el.srcObject = null; }); audioEls.current.clear();
    };
  }, []);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(p => !p);
  }, []);

  return { isMuted, toggleMute, audioReady };
}

// ─── Invite Modal (followers list + search) ───────────────────────────────────
function InviteModal({ spaceId, myTelegramId, isHost, onClose }: {
  spaceId: number; myTelegramId: string; isHost: boolean; onClose: () => void;
}) {
  const [tab, setTab] = useState<"following" | "search">("following");
  const [following, setFollowing] = useState<UserResult[]>([]);
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users/me/following", { headers: { "x-telegram-id": myTelegramId } })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setFollowing(data); setLoading(false); });
  }, [myTelegramId]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, { headers: { "x-telegram-id": myTelegramId } });
    if (res.ok) setSearchResults(await res.json());
  }, [myTelegramId]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 350);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  const invite = async (user: UserResult, role: "listener" | "speaker") => {
    const key = `${user.telegramId}-${role}`;
    setSending(key);
    await fetch(`/api/spaces/${spaceId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-telegram-id": myTelegramId },
      body: JSON.stringify({ inviteeTelegramId: user.telegramId, role }),
    });
    setInvited(prev => new Set(prev).add(user.telegramId));
    setSending(null);
  };

  const displayList = tab === "following" ? following : searchResults;

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <motion.div className="w-full rounded-t-3xl flex flex-col"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        style={{ background: "#080d1a", border: `1px solid ${BLUE}20`, borderBottom: "none", maxHeight: "80dvh" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0" dir="rtl">
          <p className="font-arabic text-base font-bold" style={{ color: BLUE }}>دعوة للجلسة</p>
          <button onClick={onClose} className="p-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-5 pb-3 flex-shrink-0" dir="rtl">
          {(["following", "search"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-arabic text-xs font-bold transition-all"
              style={{
                background: tab === t ? `${BLUE}18` : "rgba(255,255,255,0.04)",
                border: `1px solid ${tab === t ? BLUE + "40" : "rgba(255,255,255,0.08)"}`,
                color: tab === t ? BLUE : "rgba(255,255,255,0.4)",
              }}>
              {t === "following" ? <><Users className="w-3 h-3" />متابَعون</> : <><Search className="w-3 h-3" />بحث</>}
            </button>
          ))}
        </div>

        {/* Search box */}
        {tab === "search" && (
          <div className="px-5 pb-3 flex-shrink-0">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="ابحث بالاسم المستعار أو رقم الهوية..."
                className="flex-1 bg-transparent font-arabic text-sm text-white/80 outline-none placeholder:text-white/25"
                dir="rtl" />
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
          {loading && tab === "following" ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: BLUE }} />
            </div>
          ) : displayList.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="font-arabic text-sm text-white/25">
                {tab === "following" ? "لا تتابع أحداً بعد" : query.length < 2 ? "اكتب للبحث عن مستخدمين" : "لا نتائج"}
              </p>
            </div>
          ) : (
            displayList.map(u => (
              <div key={u.telegramId} className="flex items-center gap-3 py-2.5 rounded-2xl px-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                dir="rtl">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-mono font-black text-sm flex-shrink-0"
                  style={{ background: `${BLUE}18`, border: `1.5px solid ${BLUE}30`, color: BLUE }}>
                  {u.pseudonym.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-arabic text-sm font-bold text-white/80 truncate">{u.pseudonym}</p>
                  <p className="font-mono text-[9px] text-white/30">{u.aliId}</p>
                </div>
                <FollowButton targetTelegramId={u.telegramId} myTelegramId={myTelegramId} small />
                {invited.has(u.telegramId) ? (
                  <span className="font-arabic text-[10px] px-2 py-1 rounded-full flex-shrink-0"
                    style={{ background: "rgba(74,222,128,0.1)", color: GREEN, border: `1px solid ${GREEN}25` }}>
                    ✓ مدعو
                  </span>
                ) : (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => invite(u, "listener")}
                      disabled={sending === `${u.telegramId}-listener`}
                      className="font-arabic text-[9px] px-2 py-1 rounded-full active:scale-90"
                      style={{ background: "rgba(96,165,250,0.1)", color: BLUE, border: `1px solid ${BLUE}25` }}>
                      {sending === `${u.telegramId}-listener` ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : "مستمع"}
                    </button>
                    {isHost && (
                      <button onClick={() => invite(u, "speaker")}
                        disabled={sending === `${u.telegramId}-speaker`}
                        className="font-arabic text-[9px] px-2 py-1 rounded-full active:scale-90"
                        style={{ background: `${GOLD}12`, color: GOLD, border: `1px solid ${GOLD}25` }}>
                        {sending === `${u.telegramId}-speaker` ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : "ضيف 🎙"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Create Space Modal ──────────────────────────────────────────────────────
function CreateSpaceModal({ telegramId, onClose, onCreated }: {
  telegramId: string; onClose: () => void; onCreated: (s: SpaceDetails) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestQuery, setGuestQuery] = useState("");
  const [guestResults, setGuestResults] = useState<UserResult[]>([]);
  const [selectedGuests, setSelectedGuests] = useState<UserResult[]>([]);
  const [searchingGuests, setSearchingGuests] = useState(false);

  useEffect(() => {
    if (guestQuery.length < 2) { setGuestResults([]); return; }
    const t = setTimeout(async () => {
      setSearchingGuests(true);
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(guestQuery)}`, { headers: { "x-telegram-id": telegramId } });
      if (res.ok) setGuestResults(await res.json());
      setSearchingGuests(false);
    }, 350);
    return () => clearTimeout(t);
  }, [guestQuery, telegramId]);

  const toggleGuest = (u: UserResult) => {
    setSelectedGuests(prev =>
      prev.find(g => g.telegramId === u.telegramId)
        ? prev.filter(g => g.telegramId !== u.telegramId)
        : [...prev, u]
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const scheduledAt = scheduleDate && scheduleTime
        ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString() : undefined;
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-id": telegramId },
        body: JSON.stringify({ title: title.trim(), description: desc.trim() || undefined, scheduledAt }),
      });
      if (!res.ok) return;
      const space = await res.json();
      await Promise.all(
        selectedGuests.map(g =>
          fetch(`/api/spaces/${space.id}/invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-telegram-id": telegramId },
            body: JSON.stringify({ inviteeTelegramId: g.telegramId, role: "speaker" }),
          })
        )
      );
      const detailRes = await fetch(`/api/spaces/${space.id}`, { headers: { "x-telegram-id": telegramId } });
      if (detailRes.ok) onCreated(await detailRes.json());
    } finally { setLoading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, padding: "9px 12px", color: "rgba(255,255,255,0.85)",
    fontFamily: "'Cairo', sans-serif", fontSize: 13, outline: "none", direction: "rtl",
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
      <motion.div className="w-full rounded-t-3xl flex flex-col"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        style={{ background: "#0a1020", border: `1px solid ${GOLD}25`, borderBottom: "none", maxHeight: "88dvh" }}>

        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0" dir="rtl">
          <p className="font-arabic text-base font-bold" style={{ color: GOLD }}>إنشاء مجلس جديد</p>
          <button onClick={onClose} className="p-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="عنوان الجلسة..." style={{ ...inputStyle, fontWeight: 700 }} />
          <textarea value={desc} onChange={e => setDesc(e.target.value)}
            rows={2} placeholder="وصف الجلسة (اختياري)..."
            style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }} />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
              style={{ ...inputStyle, colorScheme: "dark" }} />
            <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
              style={{ ...inputStyle, colorScheme: "dark" }} />
          </div>
          <p className="font-arabic text-[10px] text-white/25" dir="rtl">اترك الوقت فارغاً لبدء الجلسة الآن فوراً</p>

          {/* ── Guest selection ── */}
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${GOLD}20` }}>
            <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: `${GOLD}08`, borderBottom: `1px solid ${GOLD}15` }}>
              <Crown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD }} />
              <p className="font-arabic text-xs font-bold" style={{ color: GOLD }}>الضيوف المميزون للجلسة</p>
            </div>
            <div className="p-3 space-y-2">
              {selectedGuests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedGuests.map(g => (
                    <div key={g.telegramId} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}25` }}>
                      <span className="font-arabic text-[10px]" style={{ color: GOLD }}>{g.pseudonym}</span>
                      <button onClick={() => toggleGuest(g)}>
                        <X style={{ width: 9, height: 9, color: `${GOLD}80` }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {searchingGuests ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white/30 flex-shrink-0" />
                  : <Search className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />}
                <input value={guestQuery} onChange={e => setGuestQuery(e.target.value)}
                  placeholder="ابحث عن ضيوف بالاسم أو الهوية..."
                  className="flex-1 bg-transparent font-arabic text-xs text-white/70 outline-none placeholder:text-white/20"
                  dir="rtl" />
              </div>
              {guestResults.filter(u => !selectedGuests.find(g => g.telegramId === u.telegramId)).slice(0, 5).map(u => (
                <button key={u.telegramId} onClick={() => { toggleGuest(u); setGuestQuery(""); setGuestResults([]); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl active:scale-98 transition-all"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  dir="rtl">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center font-mono font-black text-xs flex-shrink-0"
                    style={{ background: `${GOLD}15`, color: GOLD }}>
                    {u.pseudonym.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 text-right">
                    <p className="font-arabic text-xs text-white/75">{u.pseudonym}</p>
                    <p className="font-mono text-[9px] text-white/30">{u.aliId}</p>
                  </div>
                  <Plus style={{ width: 12, height: 12, color: `${GOLD}70` }} />
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleCreate} disabled={!title.trim() || loading}
            className="w-full py-3 rounded-2xl font-arabic font-bold text-sm active:scale-95 transition-all disabled:opacity-40"
            style={{ background: `linear-gradient(135deg,${GOLD}28,${GOLD}12)`, border: `1.5px solid ${GOLD}45`, color: GOLD }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              : selectedGuests.length > 0 ? `✦ إنشاء الجلسة (${selectedGuests.length} ضيوف)` : "✦ إنشاء الجلسة"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Space Invites Banner ─────────────────────────────────────────────────────
function SpaceInvitesBanner({ telegramId, onAccept, onDismiss }: {
  telegramId: string;
  onAccept: (spaceId: number, inviteId: number) => void;
  onDismiss: (inviteId: number) => void;
}) {
  const [invites, setInvites] = useState<SpaceInviteAlert[]>([]);

  useEffect(() => {
    if (!telegramId) return;
    const check = async () => {
      const res = await fetch("/api/spaces/my-invites", { headers: { "x-telegram-id": telegramId } });
      if (res.ok) setInvites(await res.json());
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [telegramId]);

  if (invites.length === 0) return null;

  return (
    <div className="space-y-2">
      {invites.map(inv => (
        <motion.div key={inv.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: inv.role === "speaker" ? `${GOLD}0a` : "rgba(96,165,250,0.06)", border: `1px solid ${inv.role === "speaker" ? GOLD + "35" : BLUE + "30"}` }}>
          <div className="flex items-center gap-3 px-4 py-3" dir="rtl">
            <Bell className="w-4 h-4 flex-shrink-0" style={{ color: inv.role === "speaker" ? GOLD : BLUE }} />
            <div className="flex-1 min-w-0">
              <p className="font-arabic text-xs font-bold text-white/80">
                دُعيت {inv.role === "speaker" ? "كضيف مميز 🎙" : "للاستماع 🎧"}
              </p>
              <p className="font-arabic text-[10px] text-white/40 truncate">{inv.spaceTitle} · {inv.hostPseudonym}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => { onAccept(inv.spaceId, inv.id); setInvites(p => p.filter(i => i.id !== inv.id)); }}
                className="font-arabic text-[10px] px-2.5 py-1.5 rounded-xl font-bold active:scale-90"
                style={{ background: inv.role === "speaker" ? `${GOLD}18` : "rgba(96,165,250,0.15)", color: inv.role === "speaker" ? GOLD : BLUE, border: `1px solid ${inv.role === "speaker" ? GOLD + "35" : BLUE + "30"}` }}>
                انضمام
              </button>
              <button onClick={() => { onDismiss(inv.id); setInvites(p => p.filter(i => i.id !== inv.id)); }}
                className="p-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                <X className="w-3 h-3 text-white/30" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Spaces List ─────────────────────────────────────────────────────────────
function SpacesList({ spaces, canCreate, telegramId, loading, onJoin, onEnter, onCreateClick }: {
  spaces: SpaceSummary[]; canCreate: boolean; telegramId: string; loading: boolean;
  onJoin: (id: number) => void; onEnter: (id: number) => void; onCreateClick: () => void;
}) {
  const live = spaces.filter(s => s.status === "live");
  const scheduled = spaces.filter(s => s.status === "scheduled");
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="space-y-4">
      {canCreate && (
        <button onClick={onCreateClick}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-arabic text-sm font-bold active:scale-95 transition-all"
          style={{ background: `${GOLD}08`, border: `1.5px solid ${GOLD}30`, color: GOLD }}>
          <Plus className="w-4 h-4" />إنشاء مجلس جديد
        </button>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: GOLD }} />
          <p className="font-arabic text-sm text-white/35">جاري التحميل...</p>
        </div>
      ) : (
        <>
          {live.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2" dir="rtl">
                <motion.div className="w-2 h-2 rounded-full bg-red-500"
                  animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
                <p className="font-arabic text-xs font-bold text-white/50">جلسات مباشرة</p>
              </div>
              {live.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }} className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1.5px solid rgba(239,68,68,0.3)" }}>
                  <div className="px-4 py-2.5 flex items-center justify-between"
                    style={{ background: "rgba(239,68,68,0.05)", borderBottom: "1px solid rgba(239,68,68,0.12)" }} dir="rtl">
                    <div className="flex items-center gap-1.5">
                      <motion.div className="w-2 h-2 rounded-full bg-red-500"
                        animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
                      <span className="font-arabic text-[10px] text-red-400 font-bold">مباشر</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/35">
                      <Users className="w-3.5 h-3.5" />
                      <span className="font-arabic text-[10px]">{s.participantCount}</span>
                    </div>
                  </div>
                  <div className="px-4 py-3" dir="rtl">
                    <p className="font-arabic text-sm font-bold text-white/90 mb-0.5">{s.title}</p>
                    <p className="font-arabic text-[10px] text-white/35 mb-3">{s.hostPseudonym}</p>
                    <button onClick={() => { onJoin(s.id); onEnter(s.id); }}
                      className="w-full py-2.5 rounded-xl font-arabic text-xs font-bold active:scale-95 transition-all"
                      style={{ background: "rgba(239,68,68,0.14)", border: "1.5px solid rgba(239,68,68,0.35)", color: "#f87171" }}>
                      🎙 الانضمام للاستماع
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {scheduled.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2" dir="rtl">
                <Clock className="w-3.5 h-3.5 text-white/35" />
                <p className="font-arabic text-xs font-bold text-white/45">جلسات مجدولة</p>
              </div>
              {scheduled.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }} className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.025)", border: `1.5px solid ${GOLD}18` }}>
                  <div className="px-4 py-3 flex items-start gap-2" dir="rtl">
                    <div className="flex-1">
                      <p className="font-arabic text-sm font-bold text-white/85 mb-0.5">{s.title}</p>
                      <p className="font-arabic text-[10px] text-white/35 mb-1">{s.hostPseudonym}</p>
                      <div className="flex items-center gap-1.5 text-white/25">
                        <Users className="w-3 h-3" />
                        <span className="font-arabic text-[9px]">{s.participantCount} منضم</span>
                      </div>
                    </div>
                    {s.scheduledAt && (
                      <div className="text-left flex-shrink-0">
                        <p className="font-arabic text-xs font-bold" style={{ color: GOLD }}>{fmtTime(s.scheduledAt)}</p>
                        <p className="font-arabic text-[9px] text-white/30">{fmtDate(s.scheduledAt)}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {live.length === 0 && scheduled.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 rounded-2xl"
              style={{ border: `1px dashed ${GOLD}12` }}>
              <span className="text-4xl opacity-20">🎙</span>
              <p className="font-arabic text-sm text-white/20">لا توجد جلسات نشطة حالياً</p>
              {!canCreate && (
                <p className="font-arabic text-[10px] text-white/12">تابع الإعلانات لمعرفة موعد الجلسة القادمة</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Space View (inside a space) ─────────────────────────────────────────────
// ─── Privacy Notice Modal ─────────────────────────────────────────────────────
function PrivacyNoticeModal({ onAck }: { onAck: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)" }}
    >
      <motion.div
        className="w-full rounded-t-3xl flex flex-col"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
        style={{ background: "linear-gradient(160deg,#060d1a,#0a1428)", border: `1px solid ${BLUE}25`, borderBottom: "none" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
        </div>

        <div className="px-5 pt-2 pb-6 text-right" dir="rtl">
          {/* Title */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(96,165,250,0.1)", border: `1.5px solid ${BLUE}35` }}>
              <ShieldCheck style={{ width: 20, height: 20, color: BLUE }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 15, color: BLUE }}>
                بروتوكول الخصوصية — المجلس الاجتماعي
              </p>
              <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 10, color: "rgba(96,165,250,0.45)" }}>
                ADAR Social Council · Privacy Protocol v2
              </p>
            </div>
          </div>

          {/* Notice points */}
          <div className="space-y-3 mb-5">
            {[
              { icon: "🎙", title: "لا تسجيل للصوت", desc: "النظام مُصمَّم برمجياً لعدم تسجيل أي محادثة — البث مباشر فقط عبر WebRTC" },
              { icon: "🗑", title: "بيانات مؤقتة تُحذف تلقائياً", desc: "تُحذف بيانات الجلسة كاملاً فور انتهائها — لا تُخزَّن سجلات للمشاركين" },
              { icon: "🤖", title: "البوتات الخارجية محظورة", desc: "لا يُسمح لأي برنامج بالتسجيل أو الاستماع خارج هذه المنصة السيادية" },
              { icon: "🔒", title: "هوية المشاركين مشفرة", desc: "تُعرض الأسماء المستعارة فقط — هويتك الحقيقية غير مكشوفة للآخرين" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-2xl"
                style={{ background: "rgba(96,165,250,0.04)", border: `1px solid ${BLUE}12` }}>
                <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <p style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                    {item.title}
                  </p>
                  <p style={{ fontFamily: "'Amiri', serif", fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, marginTop: 1 }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Confirm button */}
          <button
            onClick={onAck}
            className="w-full py-3.5 rounded-2xl font-arabic font-bold text-sm active:scale-95 transition-all"
            style={{
              background: `linear-gradient(135deg, ${BLUE}30, ${BLUE}15)`,
              border: `1.5px solid ${BLUE}50`,
              color: BLUE,
            }}
          >
            فهمت — الدخول للجلسة
          </button>
          <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 9, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 8 }}>
            يُعرض هذا الإشعار مرة واحدة فقط خلال الجلسة
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Space View (inside a space) ─────────────────────────────────────────────
function SpaceView({ space, telegramId, myParticipant, onLeave, onRaiseHand, onMuteToggle,
  onPromote, onKick, onRefresh, isMuted }: {
  space: SpaceDetails; telegramId: string; myParticipant: Participant | undefined;
  onLeave: () => void; onRaiseHand: () => void; onMuteToggle: () => void;
  onPromote: (tgId: string, role: ParticipantRole) => void; onKick: (tgId: string) => void;
  onRefresh: () => void; isMuted: boolean;
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [showHandsMenu, setShowHandsMenu] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(
    () => !sessionStorage.getItem("community_privacy_ack")
  );

  const handleAckPrivacy = () => {
    sessionStorage.setItem("community_privacy_ack", "1");
    setShowPrivacyModal(false);
  };

  const myRole = myParticipant?.role ?? "listener";
  const isHost = space.hostTelegramId === telegramId;
  const host = space.participants.find(p => p.role === "host");
  const speakers = space.participants.filter(p => p.role === "speaker");
  const listeners = space.participants.filter(p => p.role === "listener");
  const raisedHands = space.participants.filter(p => p.raisedHand && p.role === "listener");

  const fmtDuration = () => {
    if (!space.startedAt) return "";
    const mins = Math.floor((Date.now() - new Date(space.startedAt).getTime()) / 60000);
    return mins < 60 ? `${mins} د` : `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")} س`;
  };

  return (
    <div className="flex flex-col h-full relative" dir="rtl">
      {/* Header */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {space.status === "live" && (
              <motion.div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
            )}
            <p className="font-arabic text-sm font-bold text-white/90 truncate">{space.title}</p>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="font-arabic text-[10px] text-white/30">{space.participants.length} مشارك</span>
            {space.startedAt && <span className="font-arabic text-[10px] text-white/20">{fmtDuration()}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* No-Record indicator */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full"
            style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.22)" }}>
            <ShieldCheck style={{ width: 10, height: 10, color: "#4ade80" }} />
            <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: 9, color: "#4ade80", fontWeight: 700 }}>
              لا تسجيل
            </span>
          </div>
          <button onClick={() => setShowInvite(true)}
            className="p-2 rounded-xl active:scale-95"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Share2 className="w-4 h-4 text-white/35" />
          </button>
        </div>
      </div>

      {/* No-Record Privacy Banner */}
      {!showPrivacyModal && (
        <div className="flex items-center gap-2 px-4 py-2"
          style={{ background: "rgba(34,197,94,0.04)", borderBottom: "1px solid rgba(34,197,94,0.1)" }}>
          <ShieldCheck style={{ width: 11, height: 11, flexShrink: 0, color: "#4ade80", opacity: 0.7 }} />
          <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 10, color: "rgba(74,222,128,0.5)", lineHeight: 1.4 }}>
            هذه الجلسة غير مُسجَّلة · مباشر عبر WebRTC · البيانات تُحذف فور الانتهاء
          </p>
        </div>
      )}

      {/* Stage */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Host */}
        {host && (
          <div>
            <p className="font-arabic text-[10px] text-white/25 mb-3">المضيف</p>
            <div className="flex flex-col items-center gap-2">
              <Avatar pseudonym={host.pseudonym} role="host" isMuted={host.isMuted} isSpeaking={!host.isMuted} size={72} />
              <p className="font-arabic text-xs font-bold" style={{ color: GOLD }}>{host.pseudonym}</p>
              <span className="font-mono text-[9px] px-2 py-0.5 rounded-full"
                style={{ background: `${GOLD}12`, color: `${GOLD}80`, border: `1px solid ${GOLD}20` }}>
                {host.aliId}
              </span>
              <FollowButton targetTelegramId={host.telegramId} myTelegramId={telegramId} />
            </div>
          </div>
        )}

        {/* Speakers */}
        {speakers.length > 0 && (
          <div>
            <p className="font-arabic text-[10px] text-white/25 mb-3">المتحدثون</p>
            <div className="grid grid-cols-3 gap-4">
              {speakers.map(p => (
                <div key={p.id} className="flex flex-col items-center gap-1.5">
                  <div className="relative">
                    <Avatar pseudonym={p.pseudonym} role="speaker" isMuted={p.isMuted} isSpeaking={!p.isMuted} size={56} />
                    {isHost && (
                      <button onClick={() => onKick(p.telegramId)}
                        className="absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(239,68,68,0.85)" }}>
                        <X style={{ width: 8, height: 8, color: "white" }} />
                      </button>
                    )}
                  </div>
                  <p className="font-arabic text-[10px] text-white/55 text-center truncate w-full">{p.pseudonym}</p>
                  <FollowButton targetTelegramId={p.telegramId} myTelegramId={telegramId} small />
                  {isHost && (
                    <button onClick={() => onPromote(p.telegramId, "listener")}
                      className="font-arabic text-[9px] px-1.5 py-0.5 rounded-full active:scale-90"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                      إزالة
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raised hands (host only) */}
        {isHost && raisedHands.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${GOLD}22`, background: `${GOLD}06` }}>
            <button className="w-full flex items-center justify-between px-4 py-2.5"
              onClick={() => setShowHandsMenu(p => !p)}>
              <div className="flex items-center gap-2">
                <span>✋</span>
                <p className="font-arabic text-xs font-bold" style={{ color: GOLD }}>{raisedHands.length} طلب كلام</p>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showHandsMenu ? "rotate-180" : ""}`} style={{ color: GOLD }} />
            </button>
            <AnimatePresence>
              {showHandsMenu && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                  style={{ overflow: "hidden", borderTop: `1px solid ${GOLD}12` }}>
                  {raisedHands.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FollowButton targetTelegramId={p.telegramId} myTelegramId={telegramId} small />
                        <p className="font-arabic text-xs text-white/70 truncate">{p.pseudonym}</p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => onPromote(p.telegramId, "speaker")}
                          className="font-arabic text-[10px] px-2.5 py-1 rounded-full active:scale-90"
                          style={{ background: "rgba(74,222,128,0.14)", color: GREEN, border: `1px solid ${GREEN}30` }}>
                          <CheckCircle className="w-3 h-3 inline ml-1" />قبول
                        </button>
                        <button onClick={() => onKick(p.telegramId)}
                          className="font-arabic text-[10px] px-2 py-1 rounded-full active:scale-90"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                          رفض
                        </button>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Listeners */}
        {listeners.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-arabic text-[10px] text-white/25">المستمعون</p>
              <span className="font-arabic text-[10px] text-white/20">{listeners.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {listeners.slice(0, 24).map(p => (
                <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {p.raisedHand && <span className="text-[10px]">✋</span>}
                  <p className="font-arabic text-[10px] text-white/40">{p.pseudonym}</p>
                  <FollowButton targetTelegramId={p.telegramId} myTelegramId={telegramId} small />
                </div>
              ))}
              {listeners.length > 24 && (
                <div className="px-2.5 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.025)" }}>
                  <p className="font-arabic text-[10px] text-white/20">+{listeners.length - 24}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="px-4 pb-6 pt-3 flex items-center justify-between gap-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.45)" }}>
        <button onClick={onLeave}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-arabic text-xs font-bold active:scale-95"
          style={{ background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
          <PhoneOff className="w-4 h-4" />{isHost ? "إنهاء" : "مغادرة"}
        </button>

        {myRole === "listener" && (
          <button onClick={onRaiseHand}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-arabic text-xs font-bold active:scale-95 flex-1 justify-center"
            style={{
              background: myParticipant?.raisedHand ? `${GOLD}15` : "rgba(255,255,255,0.04)",
              border: `1.5px solid ${myParticipant?.raisedHand ? GOLD + "40" : "rgba(255,255,255,0.09)"}`,
              color: myParticipant?.raisedHand ? GOLD : "rgba(255,255,255,0.4)",
            }}>
            <Hand className="w-4 h-4" />
            {myParticipant?.raisedHand ? "إلغاء الطلب" : "طلب الكلام"}
          </button>
        )}

        {(myRole === "speaker" || myRole === "host") && (
          <button onClick={onMuteToggle}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-arabic text-xs font-bold active:scale-95 flex-1 justify-center"
            style={{
              background: isMuted ? "rgba(239,68,68,0.12)" : `rgba(96,165,250,0.12)`,
              border: `1.5px solid ${isMuted ? "rgba(239,68,68,0.3)" : BLUE + "30"}`,
              color: isMuted ? "#f87171" : BLUE,
            }}>
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {isMuted ? "كتم" : "بث"}
          </button>
        )}

        <button onClick={() => setShowInvite(true)}
          className="p-2.5 rounded-2xl active:scale-95"
          style={{ background: `rgba(96,165,250,0.1)`, border: `1px solid ${BLUE}20` }}>
          <Users className="w-4 h-4" style={{ color: BLUE }} />
        </button>
        <button onClick={onRefresh} className="p-2.5 rounded-2xl active:scale-95"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Radio className="w-4 h-4 text-white/25" />
        </button>
      </div>

      {/* Privacy Notice — shown once per session on first space entry */}
      <AnimatePresence>
        {showPrivacyModal && <PrivacyNoticeModal onAck={handleAckPrivacy} />}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInvite && (
          <InviteModal
            spaceId={space.id}
            myTelegramId={telegramId}
            isHost={isHost}
            onClose={() => setShowInvite(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────
export function CommunitySection({ onBack }: { onBack: () => void }) {
  const { user } = useTelegram();
  const telegramId = user?.id?.toString() || "";

  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [activeSpace, setActiveSpace] = useState<SpaceDetails | null>(null);
  const [myParticipant, setMyParticipant] = useState<Participant | undefined>();
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [userRole, setUserRole] = useState("member");

  const isAdmin = ["6213952907"].includes(telegramId);
  const canCreate = isAdmin || userRole === "staff" || userRole === "admin";

  const { isMuted, toggleMute, audioReady } = useSpaceAudio({
    spaceId: activeSpace?.id ?? 0,
    myTelegramId: telegramId,
    myRole: myParticipant?.role ?? "listener",
    participants: activeSpace?.participants ?? [],
    enabled: !!activeSpace && activeSpace.status === "live",
  });

  const fetchSpaces = useCallback(async () => {
    const res = await fetch("/api/spaces");
    if (res.ok) setSpaces(await res.json());
    setLoading(false);
  }, []);

  const fetchSpaceDetails = useCallback(async (id: number) => {
    const res = await fetch(`/api/spaces/${id}`, { headers: { "x-telegram-id": telegramId } });
    if (res.ok) {
      const data: SpaceDetails = await res.json();
      setActiveSpace(data);
      setMyParticipant(data.participants.find(p => p.telegramId === telegramId));
    }
  }, [telegramId]);

  useEffect(() => {
    fetchSpaces();
    if (telegramId) {
      fetch("/api/users/me", { headers: { "x-telegram-id": telegramId } })
        .then(r => r.ok ? r.json() : null)
        .then(u => { if (u) setUserRole(u.role ?? "member"); });
    }
  }, [fetchSpaces, telegramId]);

  useEffect(() => {
    if (!activeSpace) return;
    const interval = setInterval(() => fetchSpaceDetails(activeSpace.id), 4000);
    return () => clearInterval(interval);
  }, [activeSpace?.id, fetchSpaceDetails]);

  const handleJoin = async (id: number) => {
    const res = await fetch(`/api/spaces/${id}/join`, { method: "POST", headers: { "x-telegram-id": telegramId } });
    if (res.ok) {
      const { participant, space, participants } = await res.json();
      setMyParticipant(participant);
      setActiveSpace({ ...space, participants });
    }
  };

  const handleAcceptInvite = async (spaceId: number, inviteId: number) => {
    const res = await fetch(`/api/spaces/invites/${inviteId}/accept`, { method: "POST", headers: { "x-telegram-id": telegramId } });
    if (res.ok) {
      const data = await res.json();
      await handleJoin(data.spaceId);
    }
  };

  const handleDismissInvite = async (inviteId: number) => {
    await fetch(`/api/spaces/invites/${inviteId}/dismiss`, { method: "POST", headers: { "x-telegram-id": telegramId } });
  };

  const handleLeave = async () => {
    if (!activeSpace) return;
    await fetch(`/api/spaces/${activeSpace.id}/leave`, { method: "POST", headers: { "x-telegram-id": telegramId } });
    setActiveSpace(null); setMyParticipant(undefined); fetchSpaces();
  };

  const handleRaiseHand = async () => {
    if (!activeSpace) return;
    await fetch(`/api/spaces/${activeSpace.id}/raise-hand`, { method: "POST", headers: { "x-telegram-id": telegramId } });
    await fetchSpaceDetails(activeSpace.id);
  };

  const handlePromote = async (tgId: string, role: ParticipantRole) => {
    if (!activeSpace) return;
    await fetch(`/api/spaces/${activeSpace.id}/participants/${tgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-telegram-id": telegramId },
      body: JSON.stringify({ role, raisedHand: false }),
    });
    await fetchSpaceDetails(activeSpace.id);
  };

  const handleKick = async (tgId: string) => {
    if (!activeSpace) return;
    await fetch(`/api/spaces/${activeSpace.id}/participants/${tgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-telegram-id": telegramId },
      body: JSON.stringify({ role: "listener" }),
    });
    await fetchSpaceDetails(activeSpace.id);
  };

  const handleMuteToggle = async () => {
    toggleMute();
    if (!activeSpace || !myParticipant) return;
    await fetch(`/api/spaces/${activeSpace.id}/participants/${telegramId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-telegram-id": telegramId },
      body: JSON.stringify({ isMuted: !isMuted }),
    });
  };

  return (
    <motion.div className="flex flex-col min-h-full"
      style={{ background: "linear-gradient(160deg,#060d1a 0%,#0a1428 50%,#050d1a 100%)" }}
      initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}>

      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 pt-4 pb-3"
        style={{ background: "rgba(6,13,26,0.97)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${BLUE}10` }}>
        <button onClick={activeSpace ? handleLeave : onBack}
          className="p-2 rounded-xl active:scale-95 flex-shrink-0"
          style={{ background: `${BLUE}08`, border: `1px solid ${BLUE}20` }}>
          <ChevronRight className="w-5 h-5" style={{ color: BLUE }} />
        </button>
        <div dir="rtl" className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-arabic text-base font-black text-white/90">المجلس الاجتماعي</span>
            {activeSpace && (
              <span className="font-arabic text-[9px] px-2 py-0.5 rounded-full font-bold"
                style={{ background: "rgba(239,68,68,0.14)", color: "#f87171", border: "1px solid rgba(239,68,68,0.28)" }}>
                مباشر
              </span>
            )}
          </div>
          <p className="font-arabic text-[10px] text-white/28">
            {activeSpace ? activeSpace.title : "مساحات النقاش الصوتي"}
          </p>
        </div>
        {activeSpace && myParticipant && (myParticipant.role === "host" || myParticipant.role === "speaker") && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: audioReady ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${audioReady ? GREEN + "25" : "rgba(239,68,68,0.25)"}` }}>
            <motion.div className="w-1.5 h-1.5 rounded-full"
              style={{ background: audioReady ? GREEN : "#ef4444" }}
              animate={{ opacity: audioReady ? [1, 0.4, 1] : 1 }}
              transition={{ repeat: Infinity, duration: 1 }} />
            <span className="font-arabic text-[9px]" style={{ color: audioReady ? GREEN : "#f87171" }}>
              {audioReady ? "صوت" : "بدون صوت"}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {activeSpace ? (
          <SpaceView
            space={activeSpace} telegramId={telegramId}
            myParticipant={myParticipant} isMuted={isMuted}
            onLeave={handleLeave} onRaiseHand={handleRaiseHand}
            onMuteToggle={handleMuteToggle} onPromote={handlePromote}
            onKick={handleKick} onRefresh={() => fetchSpaceDetails(activeSpace.id)}
          />
        ) : (
          <div className="px-4 py-5 pb-24 space-y-4">
            <SpaceInvitesBanner telegramId={telegramId} onAccept={handleAcceptInvite} onDismiss={handleDismissInvite} />
            <SpacesList spaces={spaces} canCreate={canCreate} telegramId={telegramId} loading={loading}
              onJoin={handleJoin} onEnter={id => fetchSpaceDetails(id)} onCreateClick={() => setShowCreate(true)} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateSpaceModal telegramId={telegramId} onClose={() => setShowCreate(false)}
            onCreated={(space) => {
              setShowCreate(false);
              setActiveSpace(space);
              setMyParticipant(space.participants.find(p => p.telegramId === telegramId));
            }} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Dashboard Banner ──────────────────────────────────────────────────────────
export function SpaceAnnouncementBanner({ onOpen }: { onOpen: () => void }) {
  const [liveSpace, setLiveSpace] = useState<SpaceSummary | null>(null);

  useEffect(() => {
    const check = async () => {
      const res = await fetch("/api/spaces");
      if (!res.ok) return;
      const spaces: SpaceSummary[] = await res.json();
      const live = spaces.find(s => s.status === "live");
      const soon = spaces.find(s => {
        if (s.status !== "scheduled" || !s.scheduledAt) return false;
        return new Date(s.scheduledAt).getTime() - Date.now() < 2 * 60 * 60 * 1000;
      });
      setLiveSpace(live ?? soon ?? null);
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!liveSpace) return null;
  const isLive = liveSpace.status === "live";
  const timeLabel = isLive ? "الآن مباشر" : (() => {
    const mins = Math.floor((new Date(liveSpace.scheduledAt!).getTime() - Date.now()) / 60000);
    return mins < 60 ? `بعد ${mins} د` : `بعد ${Math.floor(mins / 60)} س`;
  })();

  return (
    <motion.button onClick={onOpen} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="w-full overflow-hidden rounded-2xl mt-2 active:scale-95 transition-all"
      style={{ background: isLive ? "rgba(239,68,68,0.08)" : "rgba(96,165,250,0.06)", border: `1px solid ${isLive ? "rgba(239,68,68,0.3)" : BLUE + "25"}` }}>
      <div className="flex items-center overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-2 flex-shrink-0"
          style={{ borderLeft: `1px solid ${isLive ? "rgba(239,68,68,0.2)" : BLUE + "18"}` }}>
          {isLive
            ? <motion.div className="w-2 h-2 rounded-full bg-red-500"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
            : <Clock className="w-3 h-3" style={{ color: BLUE }} />}
          <span className="font-arabic text-[9px] font-bold" style={{ color: isLive ? "#f87171" : BLUE }}>{timeLabel}</span>
        </div>
        <div className="flex-1 overflow-hidden px-2 py-2">
          <motion.div animate={{ x: ["100%", "-120%"] }} transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            className="whitespace-nowrap">
            <span className="font-arabic text-[10px] text-white/55">🎙 {liveSpace.title} · {liveSpace.hostPseudonym}</span>
          </motion.div>
        </div>
      </div>
    </motion.button>
  );
}
