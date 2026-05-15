import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, Mic, MicOff, PhoneOff, Hand, Users, Plus,
  Clock, Radio, Share2, X, Loader2, Crown, CheckCircle,
  ChevronDown, Search, UserPlus, UserCheck, Bell, ShieldCheck,
  Lock, Globe, Hash,
} from "lucide-react";
import { useTelegram } from "../../lib/telegram";
import { apiFetch, getInitData } from "../../lib/api";
import { AvatarFrame } from "../../components/ui/avatar-frame";

const GOLD  = "#d4af37";
const BLUE  = "#60a5fa";
const GREEN = "#4ade80";

/** Fallback ICE servers used before fetching config from server */
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.telegram.org:443" },   // Telegram's own STUN server
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

// ─── Types ──────────────────────────────────────────────────────────────────
type SpaceStatus = "scheduled" | "live" | "ended";
type ParticipantRole = "host" | "speaker" | "listener";

interface Participant {
  id: number; spaceId: number; telegramId: string; pseudonym: string;
  aliId: string; role: ParticipantRole; isMuted: boolean; raisedHand: boolean;
  joinedAt: string; lastSeenAt: string;
  photoUrl?:  string | null;
  civicRole?: string | null;
}
interface SpaceDetails {
  id: number; title: string; description: string | null;
  hostTelegramId: string; hostPseudonym: string; hostAliId: string;
  status: SpaceStatus; scheduledAt: string | null; startedAt: string | null;
  isPrivate: boolean; participants: Participant[];
}
interface SpaceSummary {
  id: number; title: string; hostPseudonym: string; status: SpaceStatus;
  scheduledAt: string | null; startedAt: string | null; endedAt: string | null;
  participantCount: number; isPrivate: boolean;
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
    apiFetch("/api/users/follow-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramIds: [targetTelegramId] }),
    }).then(r => r.ok ? r.json() : {})
      .then(map => setIsFollowing(!!map[targetTelegramId]));
  }, [targetTelegramId, myTelegramId]);

  if (myTelegramId === targetTelegramId || isFollowing === null) return null;

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    const method = isFollowing ? "DELETE" : "POST";
    await apiFetch(`/api/users/follow/${targetTelegramId}`, { method });
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

// ─── Avatar (voice session) ───────────────────────────────────────────────────
function Avatar({ pseudonym, role, isMuted, isSpeaking, size = 64, photoUrl, civicRole, raisedHand }: {
  pseudonym: string; role: ParticipantRole; isMuted: boolean;
  isSpeaking?: boolean; size?: number;
  photoUrl?: string | null; civicRole?: string | null;
  raisedHand?: boolean;
}) {
  const initials = pseudonym.slice(0, 2).toUpperCase();
  const accent   = role === "host" ? GOLD : role === "speaker" ? BLUE : "rgba(255,255,255,0.28)";

  const badge = (
    <div className="flex justify-between px-0.5">
      {role === "host" && (
        <div className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "#1a1200", border: `1.5px solid ${GOLD}60` }}>
          <Crown style={{ width: 10, height: 10, color: GOLD }} />
        </div>
      )}
      {/* Raised hand badge for listeners */}
      {role === "listener" && raisedHand && (
        <div className="w-5 h-5 rounded-full flex items-center justify-center ml-auto"
          style={{ background: `${GOLD}22`, border: `1.5px solid ${GOLD}70` }}>
          <span style={{ fontSize: 8, lineHeight: 1 }}>✋</span>
        </div>
      )}
      {(role === "speaker" || role === "host") && (
        <div className="w-5 h-5 rounded-full flex items-center justify-center ml-auto"
          style={{ background: "#0d0d1a", border: `1.5px solid ${isMuted ? "rgba(239,68,68,0.5)" : BLUE + "55"}` }}>
          {isMuted
            ? <MicOff style={{ width: 9, height: 9, color: "#ef4444" }} />
            : <Mic    style={{ width: 9, height: 9, color: BLUE }} />}
        </div>
      )}
    </div>
  );

  return (
    <AvatarFrame
      photoUrl={photoUrl}
      initials={initials}
      civicRole={civicRole}
      size={size}
      accent={accent}
      isSpeaking={isSpeaking}
      badge={badge}
    />
  );
}

// ─── WebRTC Audio Hook (Telegram-quality voice) ──────────────────────────────
/**
 * Manages WebRTC peer connections for space voice sessions.
 * Key improvements over basic WebRTC:
 *  • ICE servers fetched from server (includes STUN stun.telegram.org + optional TURN)
 *  • High-quality Opus audio: 48 kHz, echo cancellation, noise suppression, AGC
 *  • SSE-based real-time signaling (replaces 2-second polling — near-zero latency)
 *  • VAD (Voice Activity Detection) for local speaking ring animation
 *  • Remote speaking detection via RTCPeerConnection.getStats() audioLevel
 *  • Connection state monitoring with automatic reconnect on failure
 *  • Polling fallback when SSE is unavailable
 */
function useSpaceAudio({ spaceId, myTelegramId, myRole, participants, enabled }: {
  spaceId: number; myTelegramId: string; myRole: ParticipantRole;
  participants: Participant[]; enabled: boolean;
}) {
  const localStreamRef  = useRef<MediaStream | null>(null);
  const pcsRef          = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioEls        = useRef<Map<string, HTMLAudioElement>>(new Map());
  const iceServersRef   = useRef<RTCIceServer[]>(DEFAULT_ICE_SERVERS);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const analyserRef     = useRef<AnalyserNode | null>(null);
  const vadTimerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isMuted,       setIsMuted]       = useState(false);
  const [audioReady,    setAudioReady]    = useState(false);
  const [isSpeaking,    setIsSpeaking]    = useState(false);    // local VAD
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set()); // remote

  // ── Fetch ICE server list from server (includes Telegram STUN + optional TURN) ──
  useEffect(() => {
    apiFetch("/api/spaces/ice-servers")
      .then(r => r.ok ? r.json() : null)
      .then((d: { iceServers: RTCIceServer[] } | null) => {
        if (d?.iceServers?.length) iceServersRef.current = d.iceServers;
      })
      .catch(() => {});
  }, []);

  // ── Post a WebRTC signal to a peer via the API ──────────────────────────────
  const postSignal = useCallback(async (toPeerId: string, type: string, payload: string) => {
    await apiFetch(`/api/spaces/${spaceId}/signals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toPeerId, type, payload }),
    });
  }, [spaceId]);

  // ── Create or replace a RTCPeerConnection for a peer ────────────────────────
  const createPC = useCallback((peerId: string): RTCPeerConnection => {
    // Close and replace any existing PC for this peer
    const old = pcsRef.current.get(peerId);
    if (old) { try { old.close(); } catch {} }

    const pc = new RTCPeerConnection({
      iceServers:          iceServersRef.current,
      iceCandidatePoolSize: 10,
      bundlePolicy:        "max-bundle",
      rtcpMuxPolicy:       "require",
    });
    pcsRef.current.set(peerId, pc);

    // Add local audio tracks if we have a stream (speakers/host)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t =>
        pc.addTrack(t, localStreamRef.current!)
      );
    }

    // Handle incoming remote audio
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      let el = audioEls.current.get(peerId);
      if (!el) {
        el = new Audio();
        el.autoplay = true;
        (el as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
        audioEls.current.set(peerId, el);
      }
      el.srcObject = stream;
      // Resume AudioContext if suspended (mobile browsers)
      el.play().catch(() => {});
    };

    // Send ICE candidates to peer
    pc.onicecandidate = (e) => {
      if (e.candidate) postSignal(peerId, "ice", JSON.stringify(e.candidate));
    };

    // Monitor connection state — auto-reconnect on failure
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        // Remove stale PC so peers effect recreates it
        if (pcsRef.current.get(peerId) === pc) {
          pcsRef.current.delete(peerId);
        }
      }
    };

    return pc;
  }, [postSignal]);

  // ── Mic capture with Telegram-quality Opus constraints ──────────────────────
  useEffect(() => {
    if (!enabled || myRole === "listener") return;

    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation:  true,
        noiseSuppression:  true,
        autoGainControl:   true,
        sampleRate:        48000,  // Opus preferred sample rate
        sampleSize:        16,
        channelCount:      1,
      } as MediaTrackConstraints,
      video: false,
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        localStreamRef.current = stream;
        setAudioReady(true);

        // ── VAD: local speaking detection via Web Audio API ──
        try {
          const ctx      = new AudioContext();
          audioCtxRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize              = 512;
          analyser.smoothingTimeConstant = 0.7;
          analyserRef.current = analyser;

          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);

          const data = new Uint8Array(analyser.frequencyBinCount);
          vadTimerRef.current = setInterval(() => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(data);
            const rms = data.reduce((s, v) => s + v, 0) / data.length;
            setIsSpeaking(rms > 10); // threshold (~-46 dBFS)
          }, 80);
        } catch {}
      })
      .catch((err) => {
        console.warn("Mic access denied:", err?.message ?? err);
        window.Telegram?.WebApp?.showAlert?.(
          "❌ لم يتم منح إذن الميكروفون. يرجى السماح باستخدام الميكروفون من إعدادات التطبيق ثم المحاولة مجدداً."
        );
      });

    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      if (vadTimerRef.current) clearInterval(vadTimerRef.current);
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
      setAudioReady(false);
      setIsSpeaking(false);
    };
  }, [enabled, myRole]);

  // ── Clear PCs when role changes (listener→speaker needs sendrecv connections) ─
  const prevRoleRef = useRef<ParticipantRole>(myRole);
  useEffect(() => {
    if (prevRoleRef.current === myRole) return;
    prevRoleRef.current = myRole;
    pcsRef.current.forEach(pc => { try { pc.close(); } catch {} });
    pcsRef.current.clear();
  }, [myRole]);

  // ── Peer connection management — push model ───────────────────────────────
  // Speakers/hosts are ALWAYS responsible for pushing audio to every participant.
  // Listeners never initiate — they simply respond to incoming offers.
  // This is more reliable: speakers are already active with stable SSE connections.
  useEffect(() => {
    if (!enabled || myRole === "listener" || !audioReady) return;

    const others = participants.filter(p => p.telegramId !== myTelegramId);

    others.forEach(async (p) => {
      if (pcsRef.current.has(p.telegramId)) return;

      if (p.role === "listener") {
        // Speaker → listener: speaker always initiates with sendonly offer
        const pc = createPC(p.telegramId);
        pc.addTransceiver("audio", { direction: "sendonly" });
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        postSignal(p.telegramId, "offer", JSON.stringify(offer));
      } else {
        // Speaker/host ↔ speaker/host: bidirectional, higher ID is the offerer
        if (myTelegramId > p.telegramId) {
          const pc = createPC(p.telegramId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          postSignal(p.telegramId, "offer", JSON.stringify(offer));
        } else {
          createPC(p.telegramId); // wait for their offer
        }
      }
    });
  }, [participants, enabled, audioReady, myRole, myTelegramId, createPC, postSignal]);

  // ── Remote speaking detection via RTCPeerConnection.getStats() ───────────────
  useEffect(() => {
    if (!enabled) return;

    statsTimerRef.current = setInterval(async () => {
      const speaking = new Set<string>();
      const checks = [...pcsRef.current.entries()].map(async ([peerId, pc]) => {
        if (pc.connectionState !== "connected") return;
        try {
          const stats = await pc.getStats();
          stats.forEach((report) => {
            if (
              report.type === "inbound-rtp" &&
              (report as RTCInboundRtpStreamStats).kind === "audio"
            ) {
              const level = (report as RTCInboundRtpStreamStats & { audioLevel?: number }).audioLevel ?? 0;
              if (level > 0.008) speaking.add(peerId);
            }
          });
        } catch {}
      });
      await Promise.all(checks);
      setSpeakingPeers(prev => {
        const same = prev.size === speaking.size && [...speaking].every(id => prev.has(id));
        return same ? prev : speaking;
      });
    }, 200);

    return () => {
      if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    };
  }, [enabled]);

  // ── SSE-based real-time signaling (with polling fallback) ────────────────────
  useEffect(() => {
    if (!enabled) return;

    const processSignal = async (sig: {
      id: number; fromTelegramId: string; type: string; payload: string;
    }) => {
      let pc = pcsRef.current.get(sig.fromTelegramId);

      if (sig.type === "offer") {
        if (!pc) pc = createPC(sig.fromTelegramId);

        // Glare resolution: rollback if we also sent an offer
        if (pc.signalingState !== "stable") {
          try { await pc.setLocalDescription({ type: "rollback" }); } catch {}
        }

        await pc.setRemoteDescription(
          new RTCSessionDescription(JSON.parse(sig.payload) as RTCSessionDescriptionInit)
        );
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        postSignal(sig.fromTelegramId, "answer", JSON.stringify(answer));

      } else if (sig.type === "answer" && pc) {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(
            new RTCSessionDescription(JSON.parse(sig.payload) as RTCSessionDescriptionInit)
          );
        }

      } else if (sig.type === "ice" && pc) {
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(
              new RTCIceCandidate(JSON.parse(sig.payload) as RTCIceCandidateInit)
            );
          } catch {}
        }
      }
    };

    let es: EventSource | null = null;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const startPollingFallback = () => {
      if (fallbackTimer) return;
      const seen = new Set<number>();
      fallbackTimer = setInterval(async () => {
        try {
          const res = await apiFetch(`/api/spaces/${spaceId}/signals`);
          if (!res.ok) return;
          const signals: { id: number; fromTelegramId: string; type: string; payload: string }[] = await res.json();
          for (const sig of signals) {
            if (!seen.has(sig.id)) { seen.add(sig.id); processSignal(sig); }
          }
        } catch {}
      }, 2000);
    };

    const connectSSE = async () => {
      try {
        // Obtain a 30-second single-use ticket via authenticated POST (header auth)
        const ticketRes = await apiFetch(`/api/spaces/${spaceId}/sse-ticket`, { method: "POST" });
        if (!ticketRes.ok || cancelled) { startPollingFallback(); return; }
        const { ticket } = await ticketRes.json() as { ticket: string };
        if (cancelled) return;

        // Ticket is a random UUID — safe to use in URL (not raw initData)
        es = new EventSource(`/api/spaces/${spaceId}/signals/sse?ticket=${encodeURIComponent(ticket)}`);

        es.addEventListener("signal", (e: MessageEvent) => {
          try { processSignal(JSON.parse(e.data as string)); } catch {}
        });

        es.onerror = () => {
          es?.close();
          es = null;
          if (!cancelled) startPollingFallback();
        };
      } catch {
        if (!cancelled) startPollingFallback();
      }
    };

    if (typeof EventSource !== "undefined") {
      connectSSE();
    } else {
      startPollingFallback();
    }

    return () => {
      cancelled = true;
      es?.close();
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [spaceId, enabled, createPC, postSignal]);

  // ── Cleanup all PCs and audio elements on unmount ───────────────────────────
  useEffect(() => {
    return () => {
      pcsRef.current.forEach(pc => { try { pc.close(); } catch {} });
      pcsRef.current.clear();
      audioEls.current.forEach(el => {
        try {
          el.pause();
          el.srcObject = null;
          el.load();
          el.remove();
        } catch {}
      });
      audioEls.current.clear();
      if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    };
  }, []);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const next = !isMuted;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !next; });
    setIsMuted(next);
  }, [isMuted]);

  return { isMuted, toggleMute, audioReady, isSpeaking, speakingPeers };
}

// ─── Invite Modal (followers list + search) ───────────────────────────────────
function InviteModal({ spaceId, myTelegramId, canInvite, onClose }: {
  spaceId: number; myTelegramId: string; canInvite: boolean; onClose: () => void;
}) {
  const [tab, setTab] = useState<"friends" | "search">("friends");
  const [friends, setFriends] = useState<UserResult[]>([]);
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/users/me/friends")
      .then(r => r.ok ? r.json() : [])
      .then(data => { setFriends(data); setLoading(false); });
  }, [myTelegramId]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    if (res.ok) setSearchResults(await res.json());
  }, [myTelegramId]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 350);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  const invite = async (user: UserResult) => {
    setSending(user.telegramId);
    await apiFetch(`/api/spaces/${spaceId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteeTelegramId: user.telegramId }),
    });
    setInvited(prev => new Set(prev).add(user.telegramId));
    setSending(null);
  };

  const displayList = tab === "friends" ? friends : searchResults;

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <motion.div className="w-full rounded-t-3xl flex flex-col"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        style={{ background: "#080d1a", border: `1px solid ${GOLD}20`, borderBottom: "none", maxHeight: "80dvh" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0" dir="rtl">
          <div>
            <p className="font-arabic text-base font-bold" style={{ color: GOLD }}>🎙 دعوة للحديث</p>
            <p className="font-arabic text-[10px] text-white/35 mt-0.5">سينضم المدعو كضيف متحدث مباشرةً</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-5 pb-3 flex-shrink-0" dir="rtl">
          {(["friends", "search"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-arabic text-xs font-bold transition-all"
              style={{
                background: tab === t ? `${GOLD}18` : "rgba(255,255,255,0.04)",
                border: `1px solid ${tab === t ? GOLD + "40" : "rgba(255,255,255,0.08)"}`,
                color: tab === t ? GOLD : "rgba(255,255,255,0.4)",
              }}>
              {t === "friends" ? <><Users className="w-3 h-3" />الأصدقاء</> : <><Search className="w-3 h-3" />بحث</>}
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
          {loading && tab === "friends" ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: GOLD }} />
            </div>
          ) : displayList.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="font-arabic text-sm text-white/25">
                {tab === "friends" ? "لا يوجد أصدقاء بعد" : query.length < 2 ? "اكتب للبحث عن مستخدمين" : "لا نتائج"}
              </p>
            </div>
          ) : (
            displayList.map(u => (
              <div key={u.telegramId} className="flex items-center gap-3 py-2.5 rounded-2xl px-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                dir="rtl">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-mono font-black text-sm flex-shrink-0"
                  style={{ background: `${GOLD}18`, border: `1.5px solid ${GOLD}30`, color: GOLD }}>
                  {u.pseudonym.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-arabic text-sm font-bold text-white/80 truncate">{u.pseudonym}</p>
                  <p className="font-mono text-[9px] text-white/30">{u.aliId}</p>
                </div>
                <FollowButton targetTelegramId={u.telegramId} myTelegramId={myTelegramId} small />
                {invited.has(u.telegramId) ? (
                  <span className="font-arabic text-[10px] px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1"
                    style={{ background: "rgba(74,222,128,0.1)", color: GREEN, border: `1px solid ${GREEN}25` }}>
                    <CheckCircle className="w-2.5 h-2.5" />مدعو
                  </span>
                ) : canInvite ? (
                  <button onClick={() => invite(u)}
                    disabled={sending === u.telegramId}
                    className="font-arabic text-[10px] px-2.5 py-1.5 rounded-full active:scale-90 flex items-center gap-1 flex-shrink-0"
                    style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30` }}>
                    {sending === u.telegramId
                      ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      : <><UserPlus className="w-2.5 h-2.5" />دعوة 🎙</>}
                  </button>
                ) : null}
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
  const [titleTouched, setTitleTouched] = useState(false);
  const [desc, setDesc] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  // Guest invitation state
  const [guestTab, setGuestTab] = useState<"followers" | "search" | "manual">("followers");
  const [followers, setFollowers] = useState<UserResult[]>([]);
  const [followersLoading, setFollowersLoading] = useState(true);
  const [guestQuery, setGuestQuery] = useState("");
  const [guestResults, setGuestResults] = useState<UserResult[]>([]);
  const [searchingGuests, setSearchingGuests] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [selectedGuests, setSelectedGuests] = useState<UserResult[]>([]);

  // Load followers on mount
  useEffect(() => {
    apiFetch("/api/users/me/following")
      .then(r => r.ok ? r.json() : [])
      .then(data => { setFollowers(data); setFollowersLoading(false); });
  }, [telegramId]);

  // Search guests debounced
  useEffect(() => {
    if (guestTab !== "search" || guestQuery.length < 2) { setGuestResults([]); return; }
    const t = setTimeout(async () => {
      setSearchingGuests(true);
      const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(guestQuery)}`);
      if (res.ok) setGuestResults(await res.json());
      setSearchingGuests(false);
    }, 350);
    return () => clearTimeout(t);
  }, [guestQuery, guestTab, telegramId]);

  const toggleGuest = (u: UserResult) => {
    setSelectedGuests(prev =>
      prev.find(g => g.telegramId === u.telegramId)
        ? prev.filter(g => g.telegramId !== u.telegramId)
        : [...prev, u]
    );
  };

  const addManual = async () => {
    const q = manualInput.trim();
    if (!q) return;
    // Try to find user by aliId or pseudonym
    const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const results: UserResult[] = await res.json();
      if (results.length > 0 && !selectedGuests.find(g => g.telegramId === results[0].telegramId)) {
        setSelectedGuests(prev => [...prev, results[0]]);
      }
    }
    setManualInput("");
  };

  const handleCreate = async () => {
    if (!title.trim()) { setTitleTouched(true); return; }
    setLoading(true);
    try {
      const scheduledAt = scheduleDate && scheduleTime
        ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString() : undefined;
      const res = await apiFetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: desc.trim() || undefined, scheduledAt, isPrivate }),
      });
      if (!res.ok) return;
      const space = await res.json();
      await Promise.all(
        selectedGuests.map(g =>
          apiFetch(`/api/spaces/${space.id}/invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inviteeTelegramId: g.telegramId, role: "speaker" }),
          })
        )
      );
      const detailRes = await apiFetch(`/api/spaces/${space.id}`);
      if (detailRes.ok) onCreated(await detailRes.json());
    } finally { setLoading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, padding: "9px 12px", color: "rgba(255,255,255,0.85)",
    fontFamily: "'Cairo', sans-serif", fontSize: 13, outline: "none", direction: "rtl",
  };

  const titleInvalid = titleTouched && !title.trim();

  const guestListToShow = guestTab === "followers"
    ? followers.filter(u => !selectedGuests.find(g => g.telegramId === u.telegramId))
    : guestResults.filter(u => !selectedGuests.find(g => g.telegramId === u.telegramId)).slice(0, 5);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
      <motion.div className="w-full rounded-t-3xl flex flex-col"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        style={{ background: "#0a1020", border: `1px solid ${GOLD}25`, borderBottom: "none", maxHeight: "92dvh" }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
        </div>

        <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0" dir="rtl">
          <p className="font-arabic text-base font-bold" style={{ color: GOLD }}>إنشاء مجلس جديد</p>
          <button onClick={onClose} className="p-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">

          {/* ── Title (required) ── */}
          <div>
            <div className="flex items-center gap-1 mb-1.5" dir="rtl">
              <span className="font-arabic text-xs text-white/50">عنوان الجلسة</span>
              <span style={{ color: "#ef4444", fontSize: 14, lineHeight: 1 }}>*</span>
            </div>
            <input value={title} onChange={e => { setTitle(e.target.value); setTitleTouched(true); }}
              onBlur={() => setTitleTouched(true)}
              placeholder="أدخل عنوان الجلسة..." dir="rtl"
              style={{
                ...inputStyle, fontWeight: 700,
                borderColor: titleInvalid ? "rgba(239,68,68,0.55)" : "rgba(255,255,255,0.1)",
              }} />
            {titleInvalid && (
              <p className="font-arabic text-[10px] mt-1 text-right" style={{ color: "#f87171" }}>⚠ عنوان الجلسة مطلوب</p>
            )}
          </div>

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

          {/* ── Privacy toggle ── */}
          <div className="rounded-2xl p-3 flex items-center gap-3" dir="rtl"
            style={{ background: isPrivate ? "rgba(212,175,55,0.06)" : "rgba(96,165,250,0.05)", border: `1px solid ${isPrivate ? GOLD + "30" : BLUE + "25"}` }}>
            <div className="flex-1">
              <p className="font-arabic text-xs font-bold" style={{ color: isPrivate ? GOLD : BLUE }}>
                {isPrivate ? "🔒 جلسة خاصة" : "🌐 جلسة عامة"}
              </p>
              <p className="font-arabic text-[10px] text-white/35 mt-0.5">
                {isPrivate
                  ? "الانضمام عبر دعوة المضيف أو الضيوف الأساسيين فقط"
                  : "مفتوحة لجميع الأعضاء الراغبين في الانضمام"}
              </p>
            </div>
            <button onClick={() => setIsPrivate(p => !p)}
              className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
              style={{ background: isPrivate ? `${GOLD}35` : "rgba(255,255,255,0.1)", border: `1.5px solid ${isPrivate ? GOLD + "55" : "rgba(255,255,255,0.15)"}` }}>
              <motion.div className="absolute top-0.5 w-4 h-4 rounded-full"
                animate={{ left: isPrivate ? "calc(100% - 18px)" : "2px" }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                style={{ background: isPrivate ? GOLD : "rgba(255,255,255,0.45)" }} />
            </button>
          </div>

          {/* ── Guest invitation ── */}
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${GOLD}20` }}>
            <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0"
              style={{ background: `${GOLD}08`, borderBottom: `1px solid ${GOLD}15` }}>
              <div className="flex items-center gap-2" dir="rtl">
                <Crown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD }} />
                <p className="font-arabic text-xs font-bold" style={{ color: GOLD }}>
                  الضيوف الأساسيون
                  {selectedGuests.length > 0 && (
                    <span className="font-mono text-[10px] mr-1.5 px-1.5 py-0.5 rounded-full"
                      style={{ background: `${GOLD}20`, color: GOLD }}>
                      {selectedGuests.length}
                    </span>
                  )}
                </p>
              </div>
              <p className="font-arabic text-[9px] text-white/30">
                {isPrivate ? "مطلوب للجلسة الخاصة" : "اختياري"}
              </p>
            </div>

            {/* Selected guests chips */}
            {selectedGuests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3 pt-2.5" dir="rtl">
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

            {/* Sub-tabs */}
            <div className="flex gap-1.5 px-3 pt-2.5 pb-2" dir="rtl">
              {(["followers", "search", "manual"] as const).map(t => (
                <button key={t} onClick={() => setGuestTab(t)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-arabic text-[10px] font-bold transition-all"
                  style={{
                    background: guestTab === t ? `${GOLD}18` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${guestTab === t ? GOLD + "40" : "rgba(255,255,255,0.07)"}`,
                    color: guestTab === t ? GOLD : "rgba(255,255,255,0.35)",
                  }}>
                  {t === "followers" ? <><Users className="w-2.5 h-2.5" />متابَعون</>
                    : t === "search" ? <><Search className="w-2.5 h-2.5" />بحث</>
                    : <><Hash className="w-2.5 h-2.5" />يدوي</>}
                </button>
              ))}
            </div>

            <div className="px-3 pb-3 space-y-2">
              {/* Followers tab */}
              {guestTab === "followers" && (
                followersLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} />
                  </div>
                ) : guestListToShow.length === 0 ? (
                  <p className="font-arabic text-[10px] text-white/25 text-center py-3">
                    {followers.length === 0 ? "لا تتابع أحداً بعد" : "تم إضافة جميع متابَعيك"}
                  </p>
                ) : (
                  guestListToShow.slice(0, 8).map(u => (
                    <button key={u.telegramId} onClick={() => toggleGuest(u)}
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
                  ))
                )
              )}

              {/* Search tab */}
              {guestTab === "search" && (
                <>
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2"
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {searchingGuests ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white/30 flex-shrink-0" />
                      : <Search className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />}
                    <input value={guestQuery} onChange={e => setGuestQuery(e.target.value)}
                      placeholder="ابحث بالاسم أو رقم الهوية..."
                      className="flex-1 bg-transparent font-arabic text-xs text-white/70 outline-none placeholder:text-white/20"
                      dir="rtl" />
                  </div>
                  {guestListToShow.map(u => (
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
                  {guestQuery.length < 2 && (
                    <p className="font-arabic text-[10px] text-white/25 text-center py-1">اكتب حرفين للبدء بالبحث</p>
                  )}
                </>
              )}

              {/* Manual entry tab */}
              {guestTab === "manual" && (
                <div className="space-y-2">
                  <p className="font-arabic text-[10px] text-white/35 text-right">أدخل الاسم المستعار أو رقم الهوية التسلسلي</p>
                  <div className="flex items-center gap-2">
                    <input value={manualInput} onChange={e => setManualInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addManual()}
                      placeholder="ALI-XXXX أو الاسم المستعار..."
                      className="flex-1 bg-transparent font-mono text-xs text-white/70 outline-none placeholder:text-white/20 px-3 py-2 rounded-xl"
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}
                      dir="ltr" />
                    <button onClick={addManual}
                      className="px-3 py-2 rounded-xl font-arabic text-xs font-bold active:scale-90 transition-all flex-shrink-0"
                      style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}35`, color: GOLD }}>
                      إضافة
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button onClick={handleCreate} disabled={loading}
            className="w-full py-3 rounded-2xl font-arabic font-bold text-sm active:scale-95 transition-all"
            style={{
              background: !title.trim() ? "rgba(255,255,255,0.04)" : `linear-gradient(135deg,${GOLD}28,${GOLD}12)`,
              border: `1.5px solid ${!title.trim() ? "rgba(255,255,255,0.1)" : GOLD + "45"}`,
              color: !title.trim() ? "rgba(255,255,255,0.25)" : GOLD,
            }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              : selectedGuests.length > 0
                ? `✦ ${isPrivate ? "🔒" : "🌐"} إنشاء الجلسة (${selectedGuests.length} ضيوف)`
                : `✦ ${isPrivate ? "🔒" : "🌐"} إنشاء الجلسة`}
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
      const res = await apiFetch("/api/spaces/my-invites");
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
          style={{ background: `${GOLD}0a`, border: `1px solid ${GOLD}35` }}>
          <div className="flex items-center gap-3 px-4 py-3" dir="rtl">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30` }}>
              <Mic className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-arabic text-xs font-bold" style={{ color: GOLD }}>
                دُعيت للحديث كضيف 🎙
              </p>
              <p className="font-arabic text-[10px] text-white/50 truncate mt-0.5">
                {inv.spaceTitle}
                <span className="text-white/30"> · {inv.hostPseudonym}</span>
              </p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => { onAccept(inv.spaceId, inv.id); setInvites(p => p.filter(i => i.id !== inv.id)); }}
                className="font-arabic text-[10px] px-3 py-1.5 rounded-xl font-bold active:scale-90 flex items-center gap-1"
                style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}40` }}>
                <Mic className="w-3 h-3" />انضم الآن
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

// ─── Privacy badge ────────────────────────────────────────────────────────────
function PrivacyBadge({ isPrivate }: { isPrivate: boolean }) {
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full flex-shrink-0"
      style={{
        background: isPrivate ? "rgba(212,175,55,0.1)" : "rgba(96,165,250,0.08)",
        border: `1px solid ${isPrivate ? GOLD + "35" : BLUE + "28"}`,
      }}>
      {isPrivate
        ? <Lock style={{ width: 8, height: 8, color: GOLD }} />
        : <Globe style={{ width: 8, height: 8, color: BLUE }} />}
      <span className="font-arabic text-[8px] font-bold" style={{ color: isPrivate ? GOLD : BLUE }}>
        {isPrivate ? "خاصة" : "عامة"}
      </span>
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
  const ended = spaces.filter(s => s.status === "ended");
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" });
  const fmtEndedAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 60) return `انتهت منذ ${mins} د`;
    const hrs = Math.floor(mins / 60);
    return hrs < 24 ? `انتهت منذ ${hrs} س` : `انتهت أمس`;
  };

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
          {/* ── Live sessions ── */}
          {live.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2" dir="rtl">
                <div className="w-2 h-2 rounded-full bg-red-500 ali-pulse-dot" />
                <p className="font-arabic text-xs font-bold text-white/50">جلسات مباشرة</p>
              </div>
              {live.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }} className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1.5px solid rgba(239,68,68,0.3)" }}>
                  <div className="px-4 py-2.5 flex items-center justify-between"
                    style={{ background: "rgba(239,68,68,0.05)", borderBottom: "1px solid rgba(239,68,68,0.12)" }} dir="rtl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 ali-pulse-dot" />
                      <span className="font-arabic text-[10px] text-red-400 font-bold">مباشر</span>
                      <PrivacyBadge isPrivate={s.isPrivate} />
                    </div>
                    <div className="flex items-center gap-1.5 text-white/35">
                      <Users className="w-3.5 h-3.5" />
                      <span className="font-arabic text-[10px]">{s.participantCount}</span>
                    </div>
                  </div>
                  <div className="px-4 py-3" dir="rtl">
                    <p className="font-arabic text-sm font-bold text-white/90 mb-0.5">{s.title}</p>
                    <p className="font-arabic text-[10px] text-white/35 mb-3">{s.hostPseudonym}</p>
                    {s.isPrivate ? (
                      <div className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2"
                        style={{ background: "rgba(212,175,55,0.06)", border: `1px solid ${GOLD}20` }}>
                        <Lock style={{ width: 12, height: 12, color: GOLD + "80" }} />
                        <span className="font-arabic text-xs text-white/35">تتطلب دعوة للانضمام</span>
                      </div>
                    ) : (
                      <button onClick={() => { onJoin(s.id); onEnter(s.id); }}
                        className="w-full py-2.5 rounded-xl font-arabic text-xs font-bold active:scale-95 transition-all"
                        style={{ background: "rgba(239,68,68,0.14)", border: "1.5px solid rgba(239,68,68,0.35)", color: "#f87171" }}>
                        🎙 الانضمام للاستماع
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Scheduled sessions ── */}
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
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-arabic text-sm font-bold text-white/85">{s.title}</p>
                        <PrivacyBadge isPrivate={s.isPrivate} />
                      </div>
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

          {/* ── Empty state ── */}
          {live.length === 0 && scheduled.length === 0 && ended.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 rounded-2xl"
              style={{ border: `1px dashed ${GOLD}12` }}>
              <span className="text-4xl opacity-20">🎙</span>
              <p className="font-arabic text-sm text-white/20">لا توجد جلسات نشطة حالياً</p>
              {!canCreate && (
                <p className="font-arabic text-[10px] text-white/12">تابع الإعلانات لمعرفة موعد الجلسة القادمة</p>
              )}
            </div>
          )}

          {/* ── Ended sessions (archived, no chat) ── */}
          {ended.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2" dir="rtl">
                <div className="w-2 h-2 rounded-full bg-white/20 flex-shrink-0" />
                <p className="font-arabic text-[10px] font-bold text-white/30">جلسات منتهية</p>
              </div>
              {ended.map((s) => (
                <div key={s.id} className="rounded-2xl px-4 py-2.5 flex items-center gap-3" dir="rtl"
                  style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-arabic text-xs font-bold text-white/45 truncate">{s.title}</p>
                    <p className="font-arabic text-[9px] text-white/25">{s.hostPseudonym}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1 text-white/20">
                      <Users className="w-3 h-3" />
                      <span className="font-mono text-[9px]">{s.participantCount}</span>
                    </div>
                    <PrivacyBadge isPrivate={s.isPrivate} />
                  </div>
                  {s.endedAt && (
                    <span className="font-arabic text-[8px] text-white/18 flex-shrink-0">{fmtEndedAgo(s.endedAt)}</span>
                  )}
                </div>
              ))}
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
  onPromote, onKick, onRefresh, isMuted, isSpeaking, speakingPeers }: {
  space: SpaceDetails; telegramId: string; myParticipant: Participant | undefined;
  onLeave: () => void; onRaiseHand: () => void; onMuteToggle: () => void;
  onPromote: (tgId: string, role: ParticipantRole) => void; onKick: (tgId: string) => void;
  onRefresh: () => void; isMuted: boolean; isSpeaking: boolean; speakingPeers: Set<string>;
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
              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 ali-pulse-dot" />
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
              <Avatar pseudonym={host.pseudonym} role="host" isMuted={host.isMuted}
                isSpeaking={host.telegramId === telegramId ? (isSpeaking && !isMuted) : speakingPeers.has(host.telegramId)}
                photoUrl={host.photoUrl} civicRole={host.civicRole}
                size={76} />
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
                    <Avatar pseudonym={p.pseudonym} role="speaker" isMuted={p.isMuted}
                      isSpeaking={p.telegramId === telegramId ? (isSpeaking && !isMuted) : speakingPeers.has(p.telegramId)}
                      photoUrl={p.photoUrl} civicRole={p.civicRole}
                      size={60} />
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

        {/* Raised hands (host + speakers can grant permission) */}
        {(isHost || myRole === "speaker") && raisedHands.length > 0 && (
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

        {/* Listeners — avatars with raised-hand badge */}
        {listeners.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-arabic text-[10px] text-white/25">المستمعون</p>
              <span className="font-arabic text-[10px] text-white/20">{listeners.length}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {listeners.slice(0, 24).map(p => (
                <div key={p.id} className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <Avatar
                      pseudonym={p.pseudonym}
                      role="listener"
                      isMuted={false}
                      photoUrl={p.photoUrl}
                      civicRole={p.civicRole}
                      raisedHand={p.raisedHand}
                      size={44}
                    />
                    {/* Quick-approve button for host/speakers when hand is raised */}
                    {(isHost || myRole === "speaker") && p.raisedHand && (
                      <button
                        onClick={() => onPromote(p.telegramId, "speaker")}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center active:scale-90"
                        style={{ background: `${GOLD}dd`, boxShadow: `0 0 5px ${GOLD}55` }}>
                        <CheckCircle style={{ width: 9, height: 9, color: "#000" }} />
                      </button>
                    )}
                  </div>
                  <p className="font-arabic text-[9px] text-white/35 text-center truncate"
                    style={{ maxWidth: 44 }}>
                    {p.pseudonym}
                  </p>
                </div>
              ))}
              {listeners.length > 24 && (
                <div className="flex flex-col items-center justify-center gap-1">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="font-arabic text-[10px] text-white/25">+{listeners.length - 24}</p>
                  </div>
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
            canInvite={isHost || myRole === "speaker"}
            onClose={() => setShowInvite(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────
export function CommunitySection({ onBack, initialSpaceId }: { onBack: () => void; initialSpaceId?: number }) {
  const { user } = useTelegram();
  const telegramId = user?.id?.toString() || "";

  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [activeSpace, setActiveSpace] = useState<SpaceDetails | null>(null);
  const [myParticipant, setMyParticipant] = useState<Participant | undefined>();
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [userRole, setUserRole] = useState("member");
  const [joinToast, setJoinToast] = useState<{ pseudonym: string } | null>(null);
  const joinToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin = ["6213952907"].includes(telegramId);
  const canCreate = isAdmin || userRole === "staff" || userRole === "admin";

  const { isMuted, toggleMute, audioReady, isSpeaking, speakingPeers } = useSpaceAudio({
    spaceId: activeSpace?.id ?? 0,
    myTelegramId: telegramId,
    myRole: myParticipant?.role ?? "listener",
    participants: activeSpace?.participants ?? [],
    enabled: !!activeSpace && activeSpace.status === "live",
  });

  const fetchSpaces = useCallback(async () => {
    const res = await apiFetch("/api/spaces");
    if (res.ok) setSpaces(await res.json());
    setLoading(false);
  }, []);

  const fetchSpaceDetails = useCallback(async (id: number) => {
    const res = await apiFetch(`/api/spaces/${id}`);
    if (res.ok) {
      const data: SpaceDetails = await res.json();
      setActiveSpace(data);
      setMyParticipant(data.participants.find(p => p.telegramId === telegramId));
    }
  }, [telegramId]);

  useEffect(() => {
    fetchSpaces();
    if (telegramId) {
      apiFetch("/api/users/me")
        .then(r => r.ok ? r.json() : null)
        .then(u => { if (u) setUserRole(u.role ?? "member"); });
    }
  }, [fetchSpaces, telegramId]);

  // فتح المجلس تلقائياً وقبول الدعوة والانضمام عند الوصول عبر رابط إشعار البوت
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!initialSpaceId || autoOpenedRef.current || !telegramId) return;
    autoOpenedRef.current = true;
    const autoJoin = async () => {
      // قبول أي دعوة معلّقة لهذه الجلسة أولاً
      try {
        const invRes = await apiFetch("/api/spaces/my-invites");
        if (invRes.ok) {
          const pendingInvites: SpaceInviteAlert[] = await invRes.json();
          const pending = pendingInvites.find(inv => inv.spaceId === initialSpaceId);
          if (pending) {
            await apiFetch(`/api/spaces/invites/${pending.id}/accept`, { method: "POST" });
          }
        }
      } catch { /* ignore */ }
      // الانضمام مباشرةً كمتحدث
      const joinRes = await apiFetch(`/api/spaces/${initialSpaceId}/join`, { method: "POST" });
      if (joinRes.ok) {
        const { participant, space, participants } = await joinRes.json();
        setMyParticipant(participant);
        setActiveSpace({ ...space, participants });
      } else {
        // احتياطي: عرض تفاصيل الجلسة فقط
        fetchSpaceDetails(initialSpaceId);
      }
    };
    autoJoin();
  }, [initialSpaceId, telegramId, fetchSpaceDetails]);

  // ── SSE for real-time participant updates (replaces 4-second polling) ────────
  useEffect(() => {
    if (!activeSpace) return;

    let es: EventSource | null = null;
    let fallback: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    const spaceId = activeSpace.id;

    const startFallback = () => {
      if (fallback) return;
      fallback = setInterval(() => fetchSpaceDetails(spaceId), 5000);
    };

    const connectParticipantSSE = async () => {
      try {
        // Get a short-lived ticket (safe for URL use — not raw initData)
        const ticketRes = await apiFetch(`/api/spaces/${spaceId}/sse-ticket`, { method: "POST" });
        if (!ticketRes.ok || cancelled) { startFallback(); return; }
        const { ticket } = await ticketRes.json() as { ticket: string };
        if (cancelled) return;

        es = new EventSource(`/api/spaces/${spaceId}/participants/sse?ticket=${encodeURIComponent(ticket)}`);

        es.addEventListener("participants", (e: MessageEvent) => {
          try {
            const rows = JSON.parse(e.data as string) as Participant[];
            setActiveSpace(prev => prev ? { ...prev, participants: rows } : null);
            setMyParticipant(rows.find(p => p.telegramId === telegramId));
          } catch {}
        });

        es.addEventListener("ended", () => {
          setActiveSpace(null);
          setMyParticipant(undefined);
          fetchSpaces();
        });

        es.addEventListener("joined", (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data as string) as { telegramId: string; pseudonym: string };
            if (data.telegramId === telegramId) return;
            if (joinToastTimer.current) clearTimeout(joinToastTimer.current);
            setJoinToast({ pseudonym: data.pseudonym });
            joinToastTimer.current = setTimeout(() => setJoinToast(null), 4000);
          } catch {}
        });

        es.onerror = () => {
          es?.close();
          es = null;
          if (!cancelled) startFallback();
        };
      } catch {
        if (!cancelled) startFallback();
      }
    };

    if (typeof EventSource !== "undefined") {
      connectParticipantSSE();
    } else {
      startFallback();
    }

    return () => {
      cancelled = true;
      es?.close();
      if (fallback) clearInterval(fallback);
    };
  }, [activeSpace?.id, telegramId, fetchSpaceDetails, fetchSpaces]);

  const handleJoin = async (id: number) => {
    const res = await apiFetch(`/api/spaces/${id}/join`, { method: "POST" });
    if (res.ok) {
      const { participant, space, participants } = await res.json();
      setMyParticipant(participant);
      setActiveSpace({ ...space, participants });
    }
  };

  const handleAcceptInvite = async (spaceId: number, inviteId: number) => {
    const res = await apiFetch(`/api/spaces/invites/${inviteId}/accept`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      await handleJoin(data.spaceId);
    }
  };

  const handleDismissInvite = async (inviteId: number) => {
    await apiFetch(`/api/spaces/invites/${inviteId}/dismiss`, { method: "POST" });
  };

  const handleLeave = async () => {
    if (!activeSpace) return;
    await apiFetch(`/api/spaces/${activeSpace.id}/leave`, { method: "POST" });
    setActiveSpace(null); setMyParticipant(undefined); fetchSpaces();
  };

  const handleRaiseHand = async () => {
    if (!activeSpace) return;
    // Server will broadcast participant update via SSE
    await apiFetch(`/api/spaces/${activeSpace.id}/raise-hand`, { method: "POST" });
  };

  const handlePromote = async (tgId: string, role: ParticipantRole) => {
    if (!activeSpace) return;
    await apiFetch(`/api/spaces/${activeSpace.id}/participants/${tgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        raisedHand: false,
        // Ensure promoted speakers start unmuted so other participants can hear them
        ...(role === "speaker" ? { isMuted: false } : {}),
      }),
    });
    // Server broadcasts updated participants via SSE — no manual refresh needed
  };

  const handleKick = async (tgId: string) => {
    if (!activeSpace) return;
    await apiFetch(`/api/spaces/${activeSpace.id}/participants/${tgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "listener" }),
    });
  };

  const handleMuteToggle = async () => {
    toggleMute();
    if (!activeSpace || !myParticipant) return;
    await apiFetch(`/api/spaces/${activeSpace.id}/participants/${telegramId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isMuted: !isMuted }),
    });
  };

  return (
    <motion.div className="flex flex-col h-full"
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
      <div className="flex-1 overflow-y-auto">
        {activeSpace ? (
          <div className="relative">
            {/* Join notification toast */}
            <AnimatePresence>
              {joinToast && (
                <motion.div
                  key="join-toast"
                  initial={{ y: -16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -16, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute top-3 right-3 left-3 z-50 flex items-center gap-2 rounded-2xl px-4 py-2.5 pointer-events-none"
                  style={{ background: "rgba(0,20,10,0.93)", border: "1px solid rgba(212,175,55,0.35)" }}
                >
                  <span className="text-xs" style={{ color: "#d4af37" }}>✦</span>
                  <span className="font-arabic text-xs text-white/85">
                    <span style={{ color: "#d4af37" }}>{joinToast.pseudonym}</span> انضم إلى الجلسة
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <SpaceView
              space={activeSpace} telegramId={telegramId}
              myParticipant={myParticipant} isMuted={isMuted}
              isSpeaking={isSpeaking} speakingPeers={speakingPeers}
              onLeave={handleLeave} onRaiseHand={handleRaiseHand}
              onMuteToggle={handleMuteToggle} onPromote={handlePromote}
              onKick={handleKick} onRefresh={() => fetchSpaceDetails(activeSpace.id)}
            />
          </div>
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
      const res = await apiFetch("/api/spaces");
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
            ? <div className="w-2 h-2 rounded-full bg-red-500 ali-pulse-dot" />
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
