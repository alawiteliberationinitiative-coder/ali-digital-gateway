import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, Mic, MicOff, PhoneOff, Hand, Users,
  Plus, Clock, Radio, Share2, X, Loader2, Crown,
  CheckCircle, ChevronDown,
} from "lucide-react";
import { useTelegram } from "../../lib/telegram";

const GOLD = "#d4af37";
const BLUE = "#60a5fa";
const GREEN = "#4ade80";
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// ─── Types ──────────────────────────────────────────────────────────────────
type SpaceStatus = "scheduled" | "live" | "ended";
type ParticipantRole = "host" | "speaker" | "listener";

interface Participant {
  id: number;
  spaceId: number;
  telegramId: string;
  pseudonym: string;
  aliId: string;
  role: ParticipantRole;
  isMuted: boolean;
  raisedHand: boolean;
  joinedAt: string;
  lastSeenAt: string;
}

interface SpaceDetails {
  id: number;
  title: string;
  description: string | null;
  hostTelegramId: string;
  hostPseudonym: string;
  hostAliId: string;
  status: SpaceStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  participants: Participant[];
}

interface SpaceSummary {
  id: number;
  title: string;
  hostPseudonym: string;
  status: SpaceStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  participantCount: number;
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({
  pseudonym, role, isMuted, isSpeaking, size = 52,
}: {
  pseudonym: string; role: ParticipantRole; isMuted: boolean;
  isSpeaking?: boolean; size?: number;
}) {
  const initials = pseudonym.slice(0, 2).toUpperCase();
  const accent = role === "host" ? GOLD : role === "speaker" ? BLUE : "rgba(255,255,255,0.2)";
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <motion.div
        className="w-full h-full rounded-full flex items-center justify-center font-mono font-black"
        animate={isSpeaking ? { boxShadow: [`0 0 0 0 ${accent}60`, `0 0 0 8px ${accent}00`] } : {}}
        transition={{ repeat: Infinity, duration: 1.2 }}
        style={{
          background: `linear-gradient(135deg, ${accent}30, ${accent}15)`,
          border: `2px solid ${accent}60`,
          fontSize: size * 0.3,
          color: accent,
        }}>
        {initials}
      </motion.div>
      {role === "host" && (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: "#1a1200", border: `1px solid ${GOLD}60` }}>
          <Crown style={{ width: 9, height: 9, color: GOLD }} />
        </div>
      )}
      {(role === "speaker" || role === "host") && (
        <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: "#0d0d1a", border: `1px solid ${isMuted ? "rgba(239,68,68,0.5)" : BLUE + "60"}` }}>
          {isMuted
            ? <MicOff style={{ width: 8, height: 8, color: "#ef4444" }} />
            : <Mic style={{ width: 8, height: 8, color: BLUE }} />}
        </div>
      )}
    </div>
  );
}

// ─── WebRTC Audio Hook ───────────────────────────────────────────────────────
function useSpaceAudio({
  spaceId, myTelegramId, myRole, participants, enabled,
}: {
  spaceId: number; myTelegramId: string; myRole: ParticipantRole;
  participants: Participant[]; enabled: boolean;
}) {
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioEls = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [speakingPeers] = useState<Set<string>>(new Set());
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
      localStreamRef.current.getTracks().forEach(t =>
        pc.addTrack(t, localStreamRef.current!)
      );
    }

    pc.ontrack = (e) => {
      const [stream] = e.streams;
      let el = audioEls.current.get(peerId);
      if (!el) {
        el = new Audio();
        el.autoplay = true;
        audioEls.current.set(peerId, el);
      }
      el.srcObject = stream;
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        postSignal(peerId, "ice", JSON.stringify(e.candidate));
      }
    };

    return pc;
  }, [postSignal]);

  useEffect(() => {
    if (!enabled || myRole === "listener") return;
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        localStreamRef.current = stream;
        setAudioReady(true);
      })
      .catch(() => { });
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    };
  }, [enabled, myRole]);

  useEffect(() => {
    if (!enabled) return;
    const speakersAndHost = participants.filter(
      p => (p.role === "speaker" || p.role === "host") && p.telegramId !== myTelegramId
    );

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
        } else {
          createPC(p.telegramId);
        }
      });
    }
  }, [participants, enabled, audioReady, myRole, myTelegramId, createPC, postSignal]);

  useEffect(() => {
    if (!enabled) return;
    const poll = async () => {
      const res = await fetch(`/api/spaces/${spaceId}/signals`, {
        headers: { "x-telegram-id": myTelegramId },
      });
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
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(sig.payload)));
          }
        } else if (sig.type === "ice" && pc) {
          try { await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(sig.payload))); } catch { }
        }
      }
    };

    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [spaceId, myTelegramId, enabled, createPC, postSignal]);

  useEffect(() => {
    return () => {
      pcsRef.current.forEach(pc => pc.close());
      pcsRef.current.clear();
      audioEls.current.forEach(el => { el.srcObject = null; });
      audioEls.current.clear();
    };
  }, []);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(p => !p);
  }, []);

  return { isMuted, toggleMute, audioReady, speakingPeers };
}

// ─── Create Space Modal ──────────────────────────────────────────────────────
function CreateSpaceModal({
  telegramId, onClose, onCreated,
}: { telegramId: string; onClose: () => void; onCreated: (s: SpaceDetails) => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const scheduledAt = scheduleDate && scheduleTime
        ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
        : undefined;
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-id": telegramId },
        body: JSON.stringify({ title: title.trim(), description: desc.trim() || undefined, scheduledAt }),
      });
      if (res.ok) {
        const space = await res.json();
        const detailRes = await fetch(`/api/spaces/${space.id}`, { headers: { "x-telegram-id": telegramId } });
        if (detailRes.ok) onCreated(await detailRes.json());
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, padding: "9px 12px", color: "rgba(255,255,255,0.85)",
    fontFamily: "'Cairo', sans-serif", fontSize: 13, outline: "none", direction: "rtl",
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <motion.div className="w-full rounded-t-3xl p-5 space-y-4"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        style={{ background: "#0d1f0d", border: `1px solid ${GOLD}30`, borderBottom: "none" }}>
        <div className="flex items-center justify-between" dir="rtl">
          <p className="font-arabic text-base font-bold" style={{ color: GOLD }}>إنشاء مجلس جديد</p>
          <button onClick={onClose} className="p-1.5 rounded-xl active:scale-95"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>
        <div dir="rtl" className="space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="عنوان الجلسة..." style={{ ...inputStyle, fontWeight: 700 }} />
          <textarea value={desc} onChange={e => setDesc(e.target.value)}
            rows={2} placeholder="وصف اختياري..."
            style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }} />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
              style={{ ...inputStyle, colorScheme: "dark" }} />
            <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
              style={{ ...inputStyle, colorScheme: "dark" }} />
          </div>
          <p className="font-arabic text-[10px] text-white/30" dir="rtl">
            اترك الوقت فارغاً لبدء الجلسة الآن فوراً
          </p>
        </div>
        <button onClick={handleCreate} disabled={!title.trim() || loading}
          className="w-full py-3 rounded-2xl font-arabic font-bold text-sm active:scale-95 transition-all disabled:opacity-40"
          style={{ background: `linear-gradient(135deg, ${GOLD}30, ${GOLD}15)`, border: `1.5px solid ${GOLD}50`, color: GOLD }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "✦ إنشاء الجلسة"}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Spaces List ─────────────────────────────────────────────────────────────
function SpacesList({
  spaces, canCreate, telegramId, loading,
  onJoin, onEnter, onCreateClick,
}: {
  spaces: SpaceSummary[];
  canCreate: boolean;
  telegramId: string;
  loading: boolean;
  onJoin: (id: number) => void;
  onEnter: (id: number) => void;
  onCreateClick: () => void;
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
          style={{ background: `rgba(212,175,55,0.08)`, border: `1.5px solid ${GOLD}35`, color: GOLD }}>
          <Plus className="w-4 h-4" />
          إنشاء مجلس جديد
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
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(239,68,68,0.35)" }}>
                  <div className="px-4 py-3" style={{ background: "rgba(239,68,68,0.06)", borderBottom: "1px solid rgba(239,68,68,0.15)" }}>
                    <div className="flex items-center justify-between" dir="rtl">
                      <div className="flex items-center gap-2">
                        <motion.div className="w-2 h-2 rounded-full bg-red-500"
                          animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
                        <span className="font-arabic text-[10px] text-red-400 font-bold">مباشر</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-white/40">
                        <Users className="w-3.5 h-3.5" />
                        <span className="font-arabic text-[10px]">{s.participantCount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3" dir="rtl">
                    <p className="font-arabic text-sm font-bold text-white/90 mb-0.5">{s.title}</p>
                    <p className="font-arabic text-[10px] text-white/40">{s.hostPseudonym}</p>
                    <button onClick={() => { onJoin(s.id); onEnter(s.id); }}
                      className="w-full mt-3 py-2.5 rounded-xl font-arabic text-xs font-bold active:scale-95 transition-all"
                      style={{ background: "rgba(239,68,68,0.18)", border: "1.5px solid rgba(239,68,68,0.4)", color: "#f87171" }}>
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
                <Clock className="w-3.5 h-3.5 text-white/40" />
                <p className="font-arabic text-xs font-bold text-white/50">جلسات مجدولة</p>
              </div>
              {scheduled.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1.5px solid ${GOLD}22` }}>
                  <div className="px-4 py-3" dir="rtl">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-arabic text-sm font-bold text-white/90 mb-0.5">{s.title}</p>
                        <p className="font-arabic text-[10px] text-white/40">{s.hostPseudonym}</p>
                      </div>
                      {s.scheduledAt && (
                        <div className="text-left flex-shrink-0">
                          <p className="font-arabic text-[10px] font-bold" style={{ color: GOLD }}>{fmtTime(s.scheduledAt)}</p>
                          <p className="font-arabic text-[9px] text-white/35">{fmtDate(s.scheduledAt)}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1 text-white/30">
                        <Users className="w-3 h-3" />
                        <span className="font-arabic text-[9px]">{s.participantCount} منضم</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {live.length === 0 && scheduled.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 rounded-2xl"
              style={{ border: `1px dashed ${GOLD}15` }}>
              <span className="text-4xl" style={{ opacity: 0.3 }}>🎙</span>
              <p className="font-arabic text-sm text-white/20">لا توجد جلسات نشطة حالياً</p>
              {!canCreate && (
                <p className="font-arabic text-[10px] text-white/15">تابع الإعلانات لمعرفة موعد الجلسة القادمة</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Space View (inside a space) ─────────────────────────────────────────────
function SpaceView({
  space, telegramId, myParticipant, onLeave,
  onRaiseHand, onMuteToggle, onPromote, onKick, onRefresh,
  isMuted,
}: {
  space: SpaceDetails;
  telegramId: string;
  myParticipant: Participant | undefined;
  onLeave: () => void;
  onRaiseHand: () => void;
  onMuteToggle: () => void;
  onPromote: (tgId: string, role: ParticipantRole) => void;
  onKick: (tgId: string) => void;
  onRefresh: () => void;
  isMuted: boolean;
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [showHandsMenu, setShowHandsMenu] = useState(false);

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

  const handleShare = () => {
    const text = `🎙 جلسة مباشرة في المجلس الاجتماعي\n📌 ${space.title}\n👤 ${space.hostPseudonym}\n\nانضم الآن عبر تطبيق A.L.I`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(
        `https://t.me/share/url?url=https://t.me/&text=${encodeURIComponent(text)}`
      );
    }
  };

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Space Header */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {space.status === "live" && (
              <motion.div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
            )}
            <p className="font-arabic text-sm font-bold text-white/90 truncate">{space.title}</p>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="font-arabic text-[10px] text-white/35">{space.participants.length} مشارك</span>
            {space.startedAt && (
              <span className="font-arabic text-[10px] text-white/25">{fmtDuration()}</span>
            )}
          </div>
        </div>
        <button onClick={handleShare}
          className="p-2 rounded-xl active:scale-95 flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Share2 className="w-4 h-4 text-white/40" />
        </button>
      </div>

      {/* Stage */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Host */}
        {host && (
          <div>
            <p className="font-arabic text-[10px] text-white/30 mb-3">المضيف</p>
            <div className="flex flex-col items-center gap-2">
              <Avatar pseudonym={host.pseudonym} role="host" isMuted={host.isMuted} isSpeaking={!host.isMuted} size={72} />
              <p className="font-arabic text-xs font-bold" style={{ color: GOLD }}>{host.pseudonym}</p>
              <span className="font-mono text-[9px] px-2 py-0.5 rounded-full"
                style={{ background: `${GOLD}15`, color: `${GOLD}90`, border: `1px solid ${GOLD}25` }}>
                {host.aliId}
              </span>
            </div>
          </div>
        )}

        {/* Speakers */}
        {speakers.length > 0 && (
          <div>
            <p className="font-arabic text-[10px] text-white/30 mb-3">المتحدثون</p>
            <div className="grid grid-cols-3 gap-4">
              {speakers.map(p => (
                <div key={p.id} className="flex flex-col items-center gap-1.5">
                  <div className="relative">
                    <Avatar pseudonym={p.pseudonym} role="speaker" isMuted={p.isMuted} isSpeaking={!p.isMuted} size={56} />
                    {isHost && (
                      <button
                        onClick={() => onKick(p.telegramId)}
                        className="absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(239,68,68,0.8)" }}>
                        <X style={{ width: 8, height: 8, color: "white" }} />
                      </button>
                    )}
                  </div>
                  <p className="font-arabic text-[10px] text-white/60 text-center leading-tight truncate w-full text-center">{p.pseudonym}</p>
                  {isHost && (
                    <button onClick={() => onMuteToggle()}
                      className="font-arabic text-[9px] px-1.5 py-0.5 rounded-full active:scale-95"
                      style={{ background: p.isMuted ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)", color: p.isMuted ? GREEN : "#f87171", border: `1px solid ${p.isMuted ? GREEN + "30" : "rgba(239,68,68,0.3)"}` }}>
                      {p.isMuted ? "تمكين" : "كتم"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raised hands (host only) */}
        {isHost && raisedHands.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${GOLD}25`, background: `${GOLD}08` }}>
            <button className="w-full flex items-center justify-between px-4 py-2.5"
              onClick={() => setShowHandsMenu(p => !p)}>
              <div className="flex items-center gap-2">
                <span>✋</span>
                <p className="font-arabic text-xs font-bold" style={{ color: GOLD }}>{raisedHands.length} طلب للكلام</p>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showHandsMenu ? "rotate-180" : ""}`} style={{ color: GOLD }} />
            </button>
            <AnimatePresence>
              {showHandsMenu && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                  style={{ overflow: "hidden", borderTop: `1px solid ${GOLD}15` }}>
                  {raisedHands.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                      <p className="font-arabic text-xs text-white/70">{p.pseudonym}</p>
                      <div className="flex gap-2">
                        <button onClick={() => onPromote(p.telegramId, "speaker")}
                          className="font-arabic text-[10px] px-2.5 py-1 rounded-full active:scale-95"
                          style={{ background: "rgba(74,222,128,0.15)", color: GREEN, border: `1px solid ${GREEN}35` }}>
                          <CheckCircle className="w-3 h-3 inline ml-1" />قبول
                        </button>
                        <button onClick={() => onKick(p.telegramId)}
                          className="font-arabic text-[10px] px-2.5 py-1 rounded-full active:scale-95"
                          style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
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
              <p className="font-arabic text-[10px] text-white/30">المستمعون</p>
              <span className="font-arabic text-[10px] text-white/25">{listeners.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {listeners.slice(0, 24).map(p => (
                <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {p.raisedHand && <span className="text-[10px]">✋</span>}
                  <p className="font-arabic text-[10px] text-white/45">{p.pseudonym}</p>
                </div>
              ))}
              {listeners.length > 24 && (
                <div className="flex items-center px-2.5 py-1.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="font-arabic text-[10px] text-white/25">+{listeners.length - 24}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="px-4 pb-6 pt-3 flex items-center justify-between gap-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.4)" }}>

        {/* Leave */}
        <button onClick={onLeave}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-arabic text-xs font-bold active:scale-95 transition-all"
          style={{ background: "rgba(239,68,68,0.15)", border: "1.5px solid rgba(239,68,68,0.35)", color: "#f87171" }}>
          <PhoneOff className="w-4 h-4" />
          {isHost ? "إنهاء" : "مغادرة"}
        </button>

        {/* Raise hand (listener only) */}
        {myRole === "listener" && (
          <button onClick={onRaiseHand}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-arabic text-xs font-bold active:scale-95 transition-all flex-1 justify-center"
            style={{
              background: myParticipant?.raisedHand ? `${GOLD}18` : "rgba(255,255,255,0.05)",
              border: `1.5px solid ${myParticipant?.raisedHand ? GOLD + "45" : "rgba(255,255,255,0.1)"}`,
              color: myParticipant?.raisedHand ? GOLD : "rgba(255,255,255,0.45)",
            }}>
            <Hand className="w-4 h-4" />
            {myParticipant?.raisedHand ? "إلغاء الطلب" : "طلب الكلام"}
          </button>
        )}

        {/* Mute toggle (speaker/host) */}
        {(myRole === "speaker" || myRole === "host") && (
          <button onClick={onMuteToggle}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-arabic text-xs font-bold active:scale-95 transition-all flex-1 justify-center"
            style={{
              background: isMuted ? "rgba(239,68,68,0.15)" : `rgba(96,165,250,0.15)`,
              border: `1.5px solid ${isMuted ? "rgba(239,68,68,0.35)" : BLUE + "35"}`,
              color: isMuted ? "#f87171" : BLUE,
            }}>
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isMuted ? "كتم" : "يبث"}
          </button>
        )}

        {/* Invite */}
        <button onClick={() => setShowInvite(true)}
          className="p-2.5 rounded-2xl active:scale-95 transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
          <Share2 className="w-4 h-4 text-white/40" />
        </button>

        {/* Refresh */}
        <button onClick={onRefresh}
          className="p-2.5 rounded-2xl active:scale-95 transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Radio className="w-4 h-4 text-white/30" />
        </button>
      </div>

      {/* Invite sheet */}
      <AnimatePresence>
        {showInvite && (
          <motion.div className="fixed inset-0 z-50 flex items-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: "rgba(0,0,0,0.75)" }}
            onClick={() => setShowInvite(false)}>
            <motion.div className="w-full rounded-t-3xl p-5"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{ background: "#0d1f0d", border: `1px solid ${GOLD}25`, borderBottom: "none" }}
              onClick={e => e.stopPropagation()}>
              <p className="font-arabic text-sm font-bold mb-4" style={{ color: GOLD }} dir="rtl">دعوة للاستماع</p>
              <button onClick={handleShare}
                className="w-full flex items-center gap-3 p-4 rounded-2xl active:scale-95 transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                dir="rtl">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${BLUE}20`, border: `1px solid ${BLUE}30` }}>
                  <Share2 className="w-5 h-5" style={{ color: BLUE }} />
                </div>
                <div>
                  <p className="font-arabic text-sm font-bold text-white/80">مشاركة رابط الجلسة</p>
                  <p className="font-arabic text-[10px] text-white/35">إرسال دعوة عبر تيليغرام</p>
                </div>
              </button>
            </motion.div>
          </motion.div>
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
    fetch("/api/users/me", { headers: { "x-telegram-id": telegramId } })
      .then(r => r.ok ? r.json() : null)
      .then(u => { if (u) setUserRole(u.role ?? "member"); });
  }, [fetchSpaces, telegramId]);

  useEffect(() => {
    if (!activeSpace) return;
    const interval = setInterval(() => fetchSpaceDetails(activeSpace.id), 4000);
    return () => clearInterval(interval);
  }, [activeSpace?.id, fetchSpaceDetails]);

  const handleJoin = async (id: number) => {
    const res = await fetch(`/api/spaces/${id}/join`, {
      method: "POST",
      headers: { "x-telegram-id": telegramId },
    });
    if (res.ok) {
      const { participant, space, participants } = await res.json();
      setMyParticipant(participant);
      setActiveSpace({ ...space, participants });
    }
  };

  const handleLeave = async () => {
    if (!activeSpace) return;
    await fetch(`/api/spaces/${activeSpace.id}/leave`, {
      method: "POST",
      headers: { "x-telegram-id": telegramId },
    });
    setActiveSpace(null);
    setMyParticipant(undefined);
    fetchSpaces();
  };

  const handleRaiseHand = async () => {
    if (!activeSpace) return;
    const res = await fetch(`/api/spaces/${activeSpace.id}/raise-hand`, {
      method: "POST",
      headers: { "x-telegram-id": telegramId },
    });
    if (res.ok) await fetchSpaceDetails(activeSpace.id);
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
        style={{ background: "rgba(6,13,26,0.97)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(96,165,250,0.12)" }}>
        <button onClick={activeSpace ? handleLeave : onBack}
          className="p-2 rounded-xl active:scale-95 transition-transform flex-shrink-0"
          style={{ background: "rgba(96,165,250,0.08)", border: `1px solid ${BLUE}25` }}>
          <ChevronRight className="w-5 h-5" style={{ color: BLUE }} />
        </button>
        <div dir="rtl" className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-arabic text-base font-black text-white/90">المجلس الاجتماعي</span>
            {activeSpace && (
              <span className="font-arabic text-[9px] px-2 py-0.5 rounded-full font-bold"
                style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
                مباشر
              </span>
            )}
          </div>
          <p className="font-arabic text-[10px] text-white/30">
            {activeSpace ? activeSpace.title : "مساحات النقاش الصوتي"}
          </p>
        </div>
        {activeSpace && myParticipant && (myParticipant.role === "host" || myParticipant.role === "speaker") && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: audioReady ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${audioReady ? GREEN + "30" : "rgba(239,68,68,0.3)"}` }}>
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
            space={activeSpace}
            telegramId={telegramId}
            myParticipant={myParticipant}
            isMuted={isMuted}
            onLeave={handleLeave}
            onRaiseHand={handleRaiseHand}
            onMuteToggle={handleMuteToggle}
            onPromote={handlePromote}
            onKick={handleKick}
            onRefresh={() => fetchSpaceDetails(activeSpace.id)}
          />
        ) : (
          <div className="px-4 py-5 pb-24">
            <SpacesList
              spaces={spaces}
              canCreate={canCreate}
              telegramId={telegramId}
              loading={loading}
              onJoin={handleJoin}
              onEnter={id => fetchSpaceDetails(id)}
              onCreateClick={() => setShowCreate(true)}
            />
          </div>
        )}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateSpaceModal
            telegramId={telegramId}
            onClose={() => setShowCreate(false)}
            onCreated={(space) => {
              setShowCreate(false);
              setActiveSpace(space);
              setMyParticipant(space.participants.find(p => p.telegramId === telegramId));
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

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
    <motion.button
      onClick={onOpen}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full overflow-hidden rounded-2xl mt-2 active:scale-95 transition-all"
      style={{
        background: isLive ? "rgba(239,68,68,0.1)" : "rgba(96,165,250,0.08)",
        border: `1px solid ${isLive ? "rgba(239,68,68,0.35)" : BLUE + "30"}`,
      }}>
      <div className="flex items-center overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-2 flex-shrink-0"
          style={{ borderLeft: `1px solid ${isLive ? "rgba(239,68,68,0.25)" : BLUE + "20"}` }}>
          {isLive
            ? <motion.div className="w-2 h-2 rounded-full bg-red-500"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
            : <Clock className="w-3 h-3" style={{ color: BLUE }} />}
          <span className="font-arabic text-[9px] font-bold" style={{ color: isLive ? "#f87171" : BLUE }}>
            {timeLabel}
          </span>
        </div>
        <div className="flex-1 overflow-hidden px-2 py-2">
          <motion.div
            animate={{ x: ["100%", "-120%"] }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            className="whitespace-nowrap">
            <span className="font-arabic text-[10px] text-white/60">
              🎙 {liveSpace.title} · {liveSpace.hostPseudonym}
            </span>
          </motion.div>
        </div>
      </div>
    </motion.button>
  );
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        openTelegramLink?: (url: string) => void;
      };
    };
  }
}
