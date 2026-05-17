import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Send, X, ChevronDown,
  Plus, Trash2, Image, Loader2, ArrowDownToLine,
  Wifi, WifiOff, Play, Pause, Gauge,
  Share2, Link2, Check, Eye, Pencil, Volume2, VolumeX,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

const GOLD = "#d4af37";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Article {
  id: number;
  title: string;
  body: string;
  mediaUrl?: string | null;
  authorPseudonym: string;
  authorAliId: string;
  viewCount?: number;
  downloadCount?: number;
  shareCount?: number;
  createdAt: string;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 < 100_000 ? 1 : 0)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n % 1_000 < 100 ? 1 : 0)}K`;
  return String(n);
}
interface CommentData {
  id: number; text: string; ts: number;
  pseudonym?: string; likeCount?: number;
  likedByMe?: boolean; isOwn?: boolean;
}

type VideoQuality = "high" | "medium" | "low";

interface NetworkState {
  quality:       VideoQuality;
  effectiveType: string;   // "4g" | "3g" | "2g" | "slow-2g" | "unknown"
  saveData:      boolean;
}

// ── Network quality hook ───────────────────────────────────────────────────────
// Uses Network Information API (Chrome/Android) with safe fallback.
function useNetworkQuality(): NetworkState {
  function read(): NetworkState {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = (navigator as any).connection
               ?? (navigator as any).mozConnection
               ?? (navigator as any).webkitConnection;

    if (!conn) return { quality: "medium", effectiveType: "unknown", saveData: false };

    const saveData: boolean = !!conn.saveData;
    const et: string = conn.effectiveType ?? "unknown";
    const dl: number = conn.downlink ?? 0;

    let quality: VideoQuality;
    if (saveData || et === "slow-2g" || et === "2g" || (dl > 0 && dl < 0.25)) {
      quality = "low";
    } else if (et === "3g" || (dl > 0 && dl < 1.5)) {
      quality = "medium";
    } else {
      quality = "high";
    }

    return { quality, effectiveType: et, saveData };
  }

  const [state, setState] = useState<NetworkState>(read);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = (navigator as any).connection
               ?? (navigator as any).mozConnection
               ?? (navigator as any).webkitConnection;
    if (!conn) return;
    const handler = () => setState(read());
    conn.addEventListener("change", handler);
    return () => conn.removeEventListener("change", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const FALLBACK: Article[] = [
  { id: -1, title: "مبادرة التحرير العلوي — البوابة الرقمية",   body: "منصة متكاملة تجمع التوثيق والرصد والمناصرة في فضاء رقمي آمن، مكرّسة لخدمة أبناء الطائفة العلوية وتوثيق قضيتهم أمام العالم.",  authorPseudonym: "فريق ALI",     authorAliId: "ALI-0001", createdAt: new Date().toISOString() },
  { id: -2, title: "مركز ADAR للرصد الإعلامي",                  body: "الباحث الرقمي — أرشيف علوي موزّع للبحث والتوثيق والرصد. نتتبّع المشهد الإعلامي ونوثّق الرواية الحقيقية للأحداث.",              authorPseudonym: "مركز ADAR",    authorAliId: "ALI-0002", createdAt: new Date().toISOString() },
  { id: -3, title: "رمز $MDD — ركيزة الدعم المالي",             body: "عملة رقمية مدعومة بمنظومة العقد الذكي، تُمكّن المجتمع من المشاركة الفاعلة في بناء المستقبل وتمويل العمل الإنساني.",           authorPseudonym: "الركن المالي", authorAliId: "ALI-0003", createdAt: new Date().toISOString() },
  { id: -4, title: "المجلس الاجتماعي — فضاء النقاش الحر",       body: "مساحات صوتية مشفّرة تتيح حوارات هادئة وعميقة بين أبناء المجتمع، بعيداً عن ضجيج وسائل التواصل التقليدية.",                   authorPseudonym: "فريق المجتمع", authorAliId: "ALI-0004", createdAt: new Date().toISOString() },
];

const CARD_BG = [
  "linear-gradient(160deg,#071a08 0%,#0c2510 100%)",
  "linear-gradient(160deg,#07090f 0%,#0b0f1e 100%)",
  "linear-gradient(160deg,#1a1200 0%,#221800 100%)",
  "linear-gradient(160deg,#0a1a0d 0%,#07150a 100%)",
];
const CARD_GLOW = [
  `radial-gradient(ellipse 70% 50% at 50% 30%,${GOLD}05 0%,transparent 70%)`,
  "radial-gradient(ellipse 70% 50% at 50% 30%,rgba(96,165,250,0.04) 0%,transparent 70%)",
  `radial-gradient(ellipse 70% 50% at 50% 30%,${GOLD}07 0%,transparent 70%)`,
  "radial-gradient(ellipse 70% 50% at 50% 30%,rgba(34,197,94,0.04) 0%,transparent 70%)",
];

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("ar-SA", { day: "numeric", month: "short" }); }
  catch { return ""; }
}
function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString("ar-SA", { day: "numeric", month: "short" });
    const time = d.toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${date} · ${time}`;
  } catch { return ""; }
}
const LAST_SEEN_KEY = "ali_last_seen_article";
function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(url);
}
function saveMedia(url: string) {
  // Try Telegram's native downloadFile API (v7.10+) — saves directly to gallery
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const twa = (window as any).Telegram?.WebApp;
    if (typeof twa?.downloadFile === "function") {
      const ext  = url.split("?")[0].split(".").pop() ?? "jpg";
      const name = `ali-media-${Date.now()}.${ext}`;
      twa.downloadFile({ url, file_name: name });
      return;
    }
  } catch { /* ignore */ }

  // Fallback: anchor with download attribute — works in most mobile browsers
  try {
    const ext  = url.split("?")[0].split(".").pop() ?? "jpg";
    const name = `ali-media-${Date.now()}.${ext}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch { /* ignore */ }
}

// Quality metadata used in the selector panel
const QUALITY_META: Record<VideoQuality, {
  label: string; desc: string; badge: string;
  dotColor: string; strategy: string;
}> = {
  high:   { label: "دقة عالية",    badge: "HD", desc: "تحميل كامل — مناسب لشبكة 4G أو Wi-Fi",   dotColor: "#4ade80", strategy: "auto"     },
  medium: { label: "دقة متوسطة",   badge: "SD", desc: "تشغيل بلمسة — يوفّر بيانات الشبكة",      dotColor: GOLD,      strategy: "metadata" },
  low:    { label: "دقة خفيفة",    badge: "LD", desc: "نص فقط — مثالي لشبكة 2G أو بيانات ضعيفة", dotColor: "#f87171", strategy: "none"     },
};

// ── QualityPanel ──────────────────────────────────────────────────────────────
function QualityPanel({
  current,
  autoQuality,
  onSelect,
  onClose,
  isBuffering,
}: {
  current: VideoQuality;
  autoQuality: VideoQuality;
  onSelect: (q: VideoQuality) => void;
  onClose: () => void;
  isBuffering: boolean;
}) {
  return (
    <>
      <motion.div className="absolute inset-0 z-30" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }} />

      <motion.div
        className="absolute inset-x-3 z-40 rounded-3xl overflow-hidden"
        style={{ bottom: 90, background: "rgba(4,18,6,0.97)", border: `1px solid ${GOLD}18` }}
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{    opacity: 0, y: 12, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}>

        {/* header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3" dir="rtl">
          <div className="flex items-center gap-2">
            <Gauge size={15} color={GOLD} />
            <span className="font-arabic font-bold text-sm text-white/90">جودة الفيديو</span>
          </div>
          {isBuffering && (
            <span className="font-arabic text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)" }}>
              التحميل بطيء
            </span>
          )}
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)" }}>
            <X size={13} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        {/* auto-detected info */}
        <div className="mx-4 mb-3 px-3 py-2 rounded-xl flex items-center gap-2" dir="rtl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Wifi size={13} color="rgba(255,255,255,0.35)" />
          <span className="font-arabic text-white/40 text-xs">
            الشبكة المكتشفة: <span style={{ color: QUALITY_META[autoQuality].dotColor }}>{QUALITY_META[autoQuality].label}</span>
          </span>
        </div>

        {/* options */}
        <div className="px-3 pb-4 space-y-2" dir="rtl">
          {(["high", "medium", "low"] as VideoQuality[]).map(q => {
            const m = QUALITY_META[q];
            const isSelected = q === current;
            return (
              <motion.button key={q} whileTap={{ scale: 0.97 }} onClick={() => onSelect(q)}
                className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-right transition-colors"
                style={{
                  background: isSelected ? `${GOLD}12` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isSelected ? GOLD + "35" : "rgba(255,255,255,0.08)"}`,
                }}>
                {/* dot */}
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.dotColor, boxShadow: isSelected ? `0 0 8px ${m.dotColor}80` : "none" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-arabic font-bold text-sm" style={{ color: isSelected ? GOLD : "rgba(255,255,255,0.85)" }}>{m.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: isSelected ? `${GOLD}20` : "rgba(255,255,255,0.07)", color: isSelected ? GOLD : "rgba(255,255,255,0.4)" }}>
                      {m.badge}
                    </span>
                    {q === autoQuality && (
                      <span className="font-arabic text-[9px] px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>تلقائي</span>
                    )}
                  </div>
                  <p className="font-arabic text-[11px] text-white/40 mt-0.5">{m.desc}</p>
                </div>
                {/* checkmark */}
                {isSelected && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${GOLD}25`, border: `1px solid ${GOLD}50` }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}

// ── SharePanel ────────────────────────────────────────────────────────────────
function buildShareText(article: Article): { text: string; url: string } {
  const url  = window.location.origin;
  const body = article.body.length > 160 ? article.body.slice(0, 160) + "…" : article.body;
  const text = `🌿 *${article.title}*\n\n${body}\n\n📲 انضم إلى بوابة ALI الرقمية — المنصة العلوية للتوثيق والمناصرة والبث الرقمي الحر`;
  return { text, url };
}

function SharePanel({ article, onClose }: { article: Article; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const { text, url } = buildShareText(article);
  const fullMsg = `${text}\n\n🔗 ${url}`;

  function openInTg(shareUrl: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const twa = (window as any).Telegram?.WebApp;
      if (twa?.openLink) { twa.openLink(shareUrl); return; }
    } catch { /* ignore */ }
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }

  function shareWhatsApp() {
    openInTg(`https://wa.me/?text=${encodeURIComponent(fullMsg)}`);
    onClose();
  }
  function shareTelegram() {
    openInTg(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
    onClose();
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(fullMsg); }
    catch { /* fallback: select all */ }
    setCopied(true);
    setTimeout(() => { setCopied(false); onClose(); }, 1400);
  }

  const options = [
    {
      id: "whatsapp",
      label: "مشاركة على واتساب",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      color: "#25D366",
      bg: "rgba(37,211,102,0.1)",
      border: "rgba(37,211,102,0.25)",
      action: shareWhatsApp,
    },
    {
      id: "telegram",
      label: "مشاركة على تلغرام",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#2AABEE">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      color: "#2AABEE",
      bg: "rgba(42,171,238,0.1)",
      border: "rgba(42,171,238,0.25)",
      action: shareTelegram,
    },
    {
      id: "copy",
      label: copied ? "تم النسخ!" : "نسخ الرابط",
      icon: copied
        ? <Check size={20} color="#4ade80" />
        : <Link2 size={20} color="rgba(255,255,255,0.7)" />,
      color: copied ? "#4ade80" : "rgba(255,255,255,0.7)",
      bg: copied ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.06)",
      border: copied ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.12)",
      action: copyLink,
    },
  ] as const;

  return (
    <>
      {/* backdrop */}
      <motion.div className="absolute inset-0 z-30" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} />

      {/* panel */}
      <motion.div
        className="absolute inset-x-0 bottom-0 z-40 rounded-t-3xl"
        style={{ background: "linear-gradient(160deg,#031a06,#061409)", border: `1px solid ${GOLD}15`, borderBottom: "none" }}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}>

        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-5 pt-1 pb-3" dir="rtl">
          <div className="flex items-center gap-2">
            <Share2 size={15} color={GOLD} />
            <span className="font-arabic font-bold text-sm text-white/90">مشاركة المحتوى</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)" }}>
            <X size={13} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        {/* article preview strip */}
        <div className="mx-4 mb-4 px-3 py-2.5 rounded-2xl flex items-start gap-2.5" dir="rtl"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}12` }}>
          <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: `${GOLD}50` }} />
          <p className="font-arabic text-white/55 text-xs leading-relaxed line-clamp-2">{article.title}</p>
        </div>

        {/* share options */}
        <div className="px-4 pb-8 space-y-2.5" dir="rtl">
          {options.map(opt => (
            <motion.button key={opt.id} whileTap={{ scale: 0.97 }} onClick={opt.action}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5"
              style={{ background: opt.bg, border: `1px solid ${opt.border}` }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(0,0,0,0.25)" }}>
                {opt.icon}
              </div>
              <span className="font-arabic font-semibold text-sm" style={{ color: opt.color }}>{opt.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </>
  );
}

// ── Compose sheet (admin only) ────────────────────────────────────────────────
function ComposeSheet({
  onClose,
  onPublished,
}: {
  onClose: () => void;
  onPublished: (article: Article) => void;
}) {
  const [title,      setTitle]      = useState("");
  const [body,       setBody]       = useState("");
  const [mediaUrl,   setMediaUrl]   = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const fileRef      = useRef<HTMLInputElement>(null);
  const fileRefVideo = useRef<HTMLInputElement>(null);

  // iOS / some Android browsers return empty file.type for many video & image formats.
  // Infer from the file extension so uploads always have a valid Content-Type.
  function guessMime(file: File): string {
    if (file.type) return file.type;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, string> = {
      mp4: "video/mp4",  mov: "video/quicktime",  avi: "video/x-msvideo",
      webm: "video/webm", "3gp": "video/3gpp",   "3g2": "video/3gpp2",
      mkv: "video/x-matroska", mpeg: "video/mpeg", mpg: "video/mpeg",
      jpg: "image/jpeg",  jpeg: "image/jpeg",      png: "image/png",
      gif: "image/gif",   webp: "image/webp",      heic: "image/heic",
      heif: "image/heif", bmp: "image/bmp",        tiff: "image/tiff",
    };
    return map[ext] ?? "application/octet-stream";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 75_000_000) { setError("الملف أكبر من 75 ميجابايت"); return; }

    const mime = guessMime(file);

    setUploading(true);
    setError(null);
    try {
      // Upload through our server — avoids CORS / Telegram WebView restrictions
      // that block direct cross-origin PUT calls to Supabase from mobile WebViews.
      const uploadRes = await apiFetch("/api/articles/upload-media", {
        method:    "PUT",
        headers:   { "content-type": mime, "x-file-name": file.name },
        body:      file,
        timeoutMs: 5 * 60 * 1_000,   // 5 min for large videos
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `فشل الرفع (${uploadRes.status})`);
      }
      const { publicUrl } = await uploadRes.json() as { publicUrl: string };

      setMediaUrl(publicUrl);
      setPreviewing(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل رفع الملف");
    } finally {
      setUploading(false);
      if (fileRef.current)      fileRef.current.value = "";
      if (fileRefVideo.current) fileRefVideo.current.value = "";
    }
  }

  async function handleSubmit() {
    setError(null);
    const bodyRequired = !mediaUrl.trim();
    if (!title.trim() || (bodyRequired && !body.trim())) {
      setError(bodyRequired ? "العنوان والمحتوى مطلوبان" : "العنوان مطلوب");
      return;
    }
    setSubmitting(true);
    try {
      const r = await apiFetch("/api/articles", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), body: body.trim(), mediaUrl: mediaUrl.trim() || undefined }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({})) as { error?: string };
        throw new Error(e.error ?? "حدث خطأ");
      }
      onPublished(await r.json() as Article);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally { setSubmitting(false); }
  }

  return (
    <>
      <motion.div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl"
        style={{ background: "linear-gradient(160deg,#031006,#061409)", border: `1px solid ${GOLD}18`, borderBottom: "none", maxHeight: "88dvh" }}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 36 }}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: `${GOLD}30` }} />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0" dir="rtl">
          <span className="font-arabic font-bold text-base" style={{ color: GOLD }}>نشر محتوى جديد</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
            <X size={16} color="rgba(255,255,255,0.6)" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4 min-h-0" dir="rtl">
          <div className="space-y-1.5">
            <label className="font-arabic text-xs text-white/50">العنوان *</label>
            <input className="w-full rounded-2xl px-4 py-3 text-sm font-arabic text-white/90 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${GOLD}20` }}
              placeholder="عنوان المحتوى..." value={title} maxLength={200} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="font-arabic text-xs text-white/50">{mediaUrl.trim() ? "المحتوى (اختياري)" : "المحتوى *"}</label>
            <textarea className="w-full rounded-2xl px-4 py-3 text-sm font-arabic text-white/90 outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${GOLD}20`, minHeight: 120 }}
              placeholder={mediaUrl.trim() ? "وصف اختياري..." : "اكتب المحتوى هنا..."}
              value={body} maxLength={20_000} onChange={e => setBody(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="font-arabic text-xs text-white/50">صورة أو فيديو (اختياري)</label>
            <input ref={fileRef}      type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <input ref={fileRefVideo} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
            <div className="flex gap-2">
              <button type="button" onClick={() => !uploading && fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-arabic flex-1 justify-center"
                style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}30`, color: GOLD, opacity: uploading ? 0.6 : 1 }}>
                {uploading
                  ? <><Loader2 size={13} className="animate-spin" />جاري الرفع...</>
                  : <><Image size={13} />صورة</>}
              </button>
              <button type="button" onClick={() => !uploading && fileRefVideo.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-arabic flex-1 justify-center"
                style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.3)", color: "#60a5fa", opacity: uploading ? 0.6 : 1 }}>
                {uploading
                  ? <><Loader2 size={13} className="animate-spin" />جاري الرفع...</>
                  : <><Play size={13} />فيديو</>}
              </button>
            </div>
            <input className="w-full rounded-2xl px-4 py-2.5 text-xs font-arabic text-white/70 outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${GOLD}15` }}
              placeholder="أو الصق رابط الصورة/الفيديو هنا..."
              value={previewing ? "" : mediaUrl}
              onChange={e => { setMediaUrl(e.target.value); setPreviewing(false); }} />
            {mediaUrl && (
              <div className="relative rounded-2xl overflow-hidden" style={{ height: 160 }}>
                {isVideoUrl(mediaUrl)
                  ? <video src={mediaUrl} className="w-full h-full object-cover" muted playsInline />
                  : <img src={mediaUrl} alt="معاينة" className="w-full h-full object-cover"
                      onError={() => { setMediaUrl(""); setPreviewing(false); setError("تعذّر تحميل الملف"); }} />}
                <button onClick={() => { setMediaUrl(""); setPreviewing(false); }}
                  className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.7)" }}>
                  <X size={13} color="white" />
                </button>
              </div>
            )}
          </div>
          {error && <p className="font-arabic text-red-400 text-xs bg-red-400/10 rounded-xl px-4 py-2.5 border border-red-400/20">{error}</p>}
        </div>
        <div className="flex-shrink-0 px-5 pb-8 pt-2">
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit}
            disabled={submitting || uploading || !title.trim() || (!mediaUrl.trim() && !body.trim())}
            className="w-full rounded-2xl py-3.5 font-arabic font-bold text-sm flex items-center justify-center gap-2"
            style={{
              background: (submitting || uploading || !title.trim() || (!mediaUrl.trim() && !body.trim())) ? "rgba(255,255,255,0.06)" : `linear-gradient(135deg,${GOLD},#e8c840)`,
              color:      (submitting || uploading || !title.trim() || (!mediaUrl.trim() && !body.trim())) ? "rgba(255,255,255,0.25)" : "#061409",
            }}>
            {submitting ? <><Loader2 size={16} className="animate-spin" />جاري النشر...</>
             : uploading ? <><Loader2 size={16} className="animate-spin" />جاري رفع الملف...</>
             : "نشر المحتوى"}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

// ── CommentRow ────────────────────────────────────────────────────────────────
function CommentRow({ comment, isOwn, isAdmin, articleId, onEdit, onDelete, onLike }: {
  comment:   CommentData;
  isOwn:     boolean;
  isAdmin:   boolean;
  articleId: number;
  onEdit:   (commentId: number, newText: string) => void;
  onDelete: (commentId: number) => void;
  onLike:   (commentId: number) => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [draft,    setDraft]    = useState(comment.text);
  return (
    <div className="flex gap-2" dir="rtl">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
        style={{ background: `${GOLD}20`, color: GOLD }}>✦</div>
      <div className="flex-1 min-w-0">
        {/* header row */}
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="font-arabic text-[10px] font-bold" style={{ color: GOLD }}>
            {comment.pseudonym || "عضو"}
          </span>
          {isOwn && !editMode && (
            <span className="font-arabic text-[9px] text-white/30">(أنت)</span>
          )}
        </div>
        {/* body */}
        {editMode ? (
          <div className="flex items-center gap-1.5">
            <input
              className="flex-1 rounded-xl px-3 py-1.5 text-sm font-arabic text-white/80 outline-none"
              style={{ background: "rgba(255,255,255,0.09)", border: `1px solid ${GOLD}30` }}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter" && draft.trim()) {
                  onEdit(comment.id, draft.trim());
                  setEditMode(false);
                }
                if (e.key === "Escape") { setDraft(comment.text); setEditMode(false); }
              }}
            />
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={() => { if (draft.trim()) { onEdit(comment.id, draft.trim()); setEditMode(false); } }}
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `${GOLD}25`, border: `1px solid ${GOLD}50` }}>
              <Check size={12} color={GOLD} />
            </motion.button>
            <button onClick={() => { setDraft(comment.text); setEditMode(false); }}
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.07)" }}>
              <X size={12} color="rgba(255,255,255,0.5)" />
            </button>
          </div>
        ) : (
          <div className="rounded-2xl rounded-tr-sm px-3 py-2 text-xs"
            style={{ background: isOwn ? `${GOLD}09` : "rgba(255,255,255,0.06)", border: isOwn ? `1px solid ${GOLD}18` : "none" }}>
            <p className="font-arabic text-white/80 leading-relaxed">{comment.text}</p>
          </div>
        )}
        {/* action row */}
        {!editMode && (
          <div className="flex items-center gap-3 mt-1.5 px-1">
            {/* Like comment */}
            <motion.button whileTap={{ scale: 1.3 }} onClick={() => onLike(comment.id)}
              className="flex items-center gap-1">
              <Heart size={11} color={GOLD} fill={comment.likedByMe ? GOLD : "none"}
                style={{ filter: `drop-shadow(0 0 2px ${GOLD}70)` }} />
              {(comment.likeCount ?? 0) > 0 && (
                <span className="font-mono text-[9px]" style={{ color: GOLD }}>{comment.likeCount}</span>
              )}
            </motion.button>
            {/* Edit (own only) */}
            {isOwn && (
              <motion.button whileTap={{ scale: 1.2 }} onClick={() => setEditMode(true)}>
                <Pencil size={11} color="rgba(255,255,255,0.35)" />
              </motion.button>
            )}
            {/* Delete (own or admin) */}
            {(isOwn || isAdmin) && (
              <motion.button whileTap={{ scale: 1.2 }} onClick={() => onDelete(comment.id)}>
                <Trash2 size={11} color="rgba(239,68,68,0.55)" />
              </motion.button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MediaCard ─────────────────────────────────────────────────────────────────
function MediaCard({
  article, idx, isActive, distanceFromActive,
  liked, likeCount, articleComments, isCommentOpen,
  isDeleting, isAdmin, myTelegramId, saved, downloadCount, shareCount, commentText,
  onLike, onToggleComment, onDelete, onSave, onShare, onAddComment, onCommentTextChange,
  onEditComment, onDeleteComment, onLikeComment,
  cardRef, networkState,
}: {
  article:             Article;
  idx:                 number;
  isActive:            boolean;
  /** Absolute distance from the active card. 0 = active, 1 = next/prev, 2+ = further away. */
  distanceFromActive:  number;
  liked:           boolean;
  likeCount:       number;
  articleComments: CommentData[];
  isCommentOpen:   boolean;
  isDeleting:      boolean;
  isAdmin:         boolean;
  myTelegramId:    string;
  saved:           boolean;
  downloadCount:   number;
  shareCount:      number;
  commentText:     string;
  onLike:              () => void;
  onToggleComment:     () => void;
  onDelete:            () => void;
  onSave:              () => void;
  onShare:             () => void;
  onAddComment:        () => void;
  onCommentTextChange: (v: string) => void;
  onEditComment:   (commentId: number, newText: string) => void;
  onDeleteComment: (commentId: number) => void;
  onLikeComment:   (commentId: number) => void;
  cardRef:         (el: HTMLDivElement | null) => void;
  networkState:    NetworkState;
}) {
  const [mediaLoaded,  setMediaLoaded]  = useState(false);
  const [mediaError,   setMediaError]   = useState(false);
  const [isBuffering,  setIsBuffering]  = useState(false);
  const [qualityOpen,  setQualityOpen]  = useState(false);
  const [shareOpen,    setShareOpen]    = useState(false);
  const [userPaused,   setUserPaused]   = useState(false);
  const [playHint,     setPlayHint]     = useState<"play" | "pause" | null>(null);
  const [localViews,      setLocalViews]      = useState(article.viewCount ?? 0);
  // selectedQuality: null = use auto (from network), or user override
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality | null>(null);
  // isMuted: start unmuted (prefer sound); tryPlay falls back to muted if browser blocks autoplay
  const [isMuted,         setIsMuted]         = useState(false);
  const isMutedRef = useRef(false); // ref for reading inside async/event callbacks (avoids stale closure)
  const bufferTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playHintTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef      = useRef(true);
  const hasTrackedView  = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Cleanup on unmount: clear timers to prevent setState after unmount ───
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (playHintTimer.current)  clearTimeout(playHintTimer.current);
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    };
  }, []);

  // ── Track view once when card first becomes active ───────────────────────
  useEffect(() => {
    if (isActive && !hasTrackedView.current && article.id > 0) {
      hasTrackedView.current = true;
      apiFetch(`/api/articles/${article.id}/view`, { method: "POST" })
        .then(() => setLocalViews(v => v + 1))
        .catch(() => {});
    }
  }, [isActive, article.id]);

  const isVideo = !!article.mediaUrl && isVideoUrl(article.mediaUrl);

  // effective quality = user override OR auto from network
  const effectiveQuality: VideoQuality = selectedQuality ?? networkState.quality;
  const meta = QUALITY_META[effectiveQuality];

  // ── 1. IMMEDIATE PAUSE via useLayoutEffect — stops audio before next paint ─
  // Only handles pause so we don't call play() before data is ready.
  useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;
    if (!isActive || effectiveQuality === "low" || userPaused) {
      video.pause();
    }
  }, [isActive, effectiveQuality, isVideo, userPaused]);

  // ── 2. Start LOADING — immediate for dist 0-1, staggered for dist 2-3 ───────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo || effectiveQuality === "low") return;
    if (distanceFromActive > 3) return; // too far — browser handles via preload attr

    function triggerLoad() {
      if (video && (video.networkState === HTMLMediaElement.NETWORK_EMPTY || video.readyState === 0)) {
        video.load();
      }
    }

    if (distanceFromActive <= 1) {
      triggerLoad(); // immediate
    } else {
      // Stagger: give the active card a head start before loading farther cards
      const delay = distanceFromActive === 2 ? 1500 : 3000;
      const t = setTimeout(triggerLoad, delay);
      return () => clearTimeout(t);
    }
  }, [distanceFromActive, isVideo, effectiveQuality]);

  // ── 3a. Keep video.muted in sync with isMuted state ─────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = isMuted;
  }, [isMuted]);

  // ── 3. PLAY — prefer sound; fall back to muted if autoplay policy blocks it ─
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo || effectiveQuality === "low" || !isActive || userPaused) return;

    async function tryPlay() {
      const vid = video!;
      vid.muted = isMutedRef.current;
      try {
        await vid.play();
      } catch {
        // Browser/WebView blocked autoplay with sound → mute and retry
        if (!isMutedRef.current) {
          vid.muted = true;
          isMutedRef.current = true;
          setIsMuted(true);
          vid.play().catch(() => {});
        }
      }
    }

    if (video.readyState >= 3) {
      tryPlay();
    } else {
      video.addEventListener("canplay", tryPlay, { once: true });
      return () => video.removeEventListener("canplay", tryPlay);
    }
  }, [isActive, isVideo, effectiveQuality, userPaused]);


  // Reset user-pause when card changes
  useEffect(() => {
    if (isActive) setUserPaused(false);
  }, [isActive]);

  // ── Buffering detection: show quality panel after 2.5 s of stalling ────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function onWaiting() {
      setIsBuffering(true);
      bufferTimerRef.current = setTimeout(() => {
        // Only open quality panel automatically on first buffer stall
        setQualityOpen(prev => prev || true);
      }, 2500);
    }
    function onPlaying() {
      setIsBuffering(false);
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
        bufferTimerRef.current = null;
      }
    }

    video.addEventListener("waiting",  onWaiting);
    video.addEventListener("playing",  onPlaying);
    video.addEventListener("canplay",  onPlaying);
    return () => {
      video.removeEventListener("waiting",  onWaiting);
      video.removeEventListener("playing",  onPlaying);
      video.removeEventListener("canplay",  onPlaying);
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    };
  }, [isVideo]);

  // ── Tap to play / pause (TikTok style) ────────────────────────────────────
  function handleVideoTap() {
    if (!isVideo || effectiveQuality === "low" || !mediaLoaded) return;
    const video = videoRef.current;
    if (!video) return;

    if (userPaused) {
      setUserPaused(false);
      video.play().catch(() => {});
      setPlayHint("play");
    } else {
      setUserPaused(true);
      video.pause();
      setPlayHint("pause");
    }
    if (playHintTimer.current) clearTimeout(playHintTimer.current);
    playHintTimer.current = setTimeout(() => setPlayHint(null), 900);
  }

  // ── Apply quality change to video element ──────────────────────────────────
  function applyQuality(q: VideoQuality) {
    setSelectedQuality(q);
    setQualityOpen(false);
    const video = videoRef.current;
    if (!video) return;

    if (q === "low") {
      video.pause();
      return;
    }
    // Force reload with new preload hint; reset mediaLoaded so effect #3 re-triggers play
    const t = video.currentTime;
    setMediaLoaded(false);
    video.load();
    video.currentTime = t;
    // play() is handled by effect #3 once onCanPlay fires again
  }

  // Tiered preload attribute based on distance from the active card:
  //   dist 0-1 → "auto"     : full buffering (current + next card)
  //   dist 2-3 → "metadata" : only headers/duration, keeps memory low
  //   dist 4+  → "none"     : no network use until the card comes closer
  // Low-data mode always uses "none".
  const preloadAttr: "auto" | "metadata" | "none" =
    effectiveQuality === "low"    ? "none"
    : distanceFromActive <= 1     ? "auto"
    : distanceFromActive <= 3     ? "metadata"
    : "none";

  return (
    <div
      ref={cardRef}
      data-card-idx={idx}
      className="relative flex flex-col overflow-hidden"
      style={{ height: "100%", scrollSnapAlign: "start", scrollSnapStop: "always", flexShrink: 0, background: CARD_BG[idx % CARD_BG.length] }}>

      {/* ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: CARD_GLOW[idx % CARD_GLOW.length] }} />

      {/* ── Media layer — full height ── */}
      {article.mediaUrl && !mediaError && (
        <div className="absolute inset-0">

          {/* spinner placeholder */}
          {!mediaLoaded && effectiveQuality !== "low" && (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: CARD_BG[idx % CARD_BG.length] }}>
              <div className="w-7 h-7 rounded-full border-2 animate-spin"
                style={{ borderColor: `${GOLD}30`, borderTopColor: `${GOLD}90` }} />
            </div>
          )}

          {/* LD mode: no video, show play-in-browser CTA */}
          {isVideo && effectiveQuality === "low" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{ background: CARD_BG[idx % CARD_BG.length] }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${GOLD}25` }}>
                <WifiOff size={22} color={`${GOLD}90`} />
              </div>
              <p className="font-arabic text-white/45 text-xs text-center px-6">
                تم إيقاف الفيديو لتوفير البيانات
              </p>
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => article.mediaUrl && saveMedia(article.mediaUrl)}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-arabic"
                style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30`, color: GOLD }}>
                <Play size={12} />مشاهدة في المتصفح
              </motion.button>
            </div>
          )}

          {isVideo ? (
            <video
              ref={videoRef}
              src={article.mediaUrl}
              className="w-full h-full object-contain"
              style={{
                display:    effectiveQuality === "low" ? "none" : "block",
                opacity:    mediaLoaded ? 1 : 0,
                transition: "opacity 0.35s ease",
              }}
              loop
              playsInline
              preload={preloadAttr}
              onCanPlay={() => setMediaLoaded(true)}
              onError={() => setMediaError(true)}
            />
          ) : (
            <img
              src={article.mediaUrl}
              alt=""
              className="w-full h-full object-contain"
              style={{
                opacity:    mediaLoaded ? 1 : 0,
                transition: "opacity 0.6s ease, filter 0.6s ease",
                filter:     mediaLoaded ? "none" : "blur(20px)",
              }}
              loading={idx <= 1 ? "eager" : "lazy"}
              onLoad={()  => setMediaLoaded(true)}
              onError={() => setMediaError(true)}
            />
          )}

          {/* ── Tap-to-play/pause transparent overlay ── */}
          {isVideo && effectiveQuality !== "low" && mediaLoaded && (
            <div className="absolute inset-0 z-[5] cursor-pointer" onClick={handleVideoTap} />
          )}

          {/* ── Mute / Unmute button — top-right corner (TikTok style) ── */}
          {isVideo && mediaLoaded && effectiveQuality !== "low" && (
            <motion.button
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.18)" }}
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                const next = !isMutedRef.current;
                isMutedRef.current = next;
                setIsMuted(next);
              }}>
              {isMuted
                ? <VolumeX size={16} color="white" />
                : <Volume2 size={16} color="white" />}
            </motion.button>
          )}

          {/* ── Center play/pause hint (TikTok style) ── */}
          <AnimatePresence>
            {playHint && (
              <motion.div
                className="absolute inset-0 z-[6] flex items-center justify-center pointer-events-none"
                initial={{ opacity: 0, scale: 0.65 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.25 }}
                transition={{ duration: 0.18 }}>
                <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.52)", backdropFilter: "blur(6px)", border: "1.5px solid rgba(255,255,255,0.18)" }}>
                  {playHint === "pause"
                    ? <Pause size={30} color="white" fill="white" />
                    : <Play  size={30} color="white" fill="white" style={{ marginLeft: 3 }} />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}


      {/* ── Buffering / slow-network spinner overlay ── */}
      <AnimatePresence>
        {isVideo && (isBuffering || (!mediaLoaded && isActive)) && effectiveQuality !== "low" && (
          <motion.div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="rounded-full p-4" style={{ background: "rgba(0,0,0,0.52)", backdropFilter: "blur(4px)" }}>
              <Loader2 size={32} color={GOLD} className="animate-spin" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── Quality panel ── */}
      <AnimatePresence>
        {qualityOpen && (
          <QualityPanel
            current={effectiveQuality}
            autoQuality={networkState.quality}
            onSelect={applyQuality}
            onClose={() => setQualityOpen(false)}
            isBuffering={isBuffering}
          />
        )}
      </AnimatePresence>

      {/* ── Share panel ── */}
      <AnimatePresence>
        {shareOpen && (
          <SharePanel article={article} onClose={() => setShareOpen(false)} />
        )}
      </AnimatePresence>

      {/* ── Admin: delete ── */}
      {isAdmin && article.id > 0 && (
        <motion.button whileTap={{ scale: 0.9 }} onClick={onDelete} disabled={isDeleting}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)" }}>
          {isDeleting
            ? <Loader2 size={13} color="rgba(220,38,38,0.7)" className="animate-spin" />
            : <Trash2   size={13} color="rgba(220,38,38,0.8)" />}
        </motion.button>
      )}

      {/* ── Right action sidebar ── */}
      <div className="absolute left-3 z-10 flex flex-col items-center"
        style={{ bottom: isCommentOpen ? "62%" : "90px", gap: 0 }}>

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-4">

        {/* Like */}
        <motion.button whileTap={{ scale: 1.35 }} onClick={onLike} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{
              background: liked ? `${GOLD}25` : "rgba(255,255,255,0.08)",
              border: `1px solid ${GOLD}${liked ? "70" : "35"}`,
              boxShadow: liked ? `0 0 10px ${GOLD}40` : "none",
              transition: "all 0.25s",
            }}>
            <Heart size={20} color={GOLD} fill={liked ? GOLD : "none"} style={{ filter: `drop-shadow(0 0 3px ${GOLD}80)` }} />
          </div>
          <span className="font-mono text-[10px]" style={{ color: GOLD }}>{likeCount}</span>
        </motion.button>

        {/* Comment */}
        <motion.button whileTap={{ scale: 1.2 }} onClick={onToggleComment} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{
              background: isCommentOpen ? `${GOLD}20` : "rgba(255,255,255,0.08)",
              border: `1px solid ${GOLD}${isCommentOpen ? "65" : "35"}`,
              boxShadow: isCommentOpen ? `0 0 10px ${GOLD}35` : "none",
              transition: "all 0.25s",
            }}>
            <MessageCircle size={20} color={GOLD} fill={isCommentOpen ? `${GOLD}30` : "none"} style={{ filter: `drop-shadow(0 0 3px ${GOLD}70)` }} />
          </div>
          <span className="font-mono text-[10px]" style={{ color: GOLD }}>{articleComments.length}</span>
        </motion.button>

        {/* Download */}
        {article.mediaUrl && (
          <motion.button whileTap={{ scale: 1.2 }} onClick={onSave} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                background: saved ? `${GOLD}25` : "rgba(255,255,255,0.08)",
                border: `1px solid ${GOLD}${saved ? "70" : "35"}`,
                boxShadow: saved ? `0 0 10px ${GOLD}40` : "none",
                transition: "all 0.25s",
              }}>
              <ArrowDownToLine size={20} color={GOLD} style={{ filter: `drop-shadow(0 0 3px ${GOLD}70)` }} />
            </div>
            <span className="font-mono text-[10px]" style={{ color: GOLD }}>{downloadCount}</span>
          </motion.button>
        )}

        {/* Share */}
        <motion.button whileTap={{ scale: 1.2 }} onClick={() => { setShareOpen(o => !o); onShare(); }} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{
              background: shareOpen ? `${GOLD}20` : "rgba(255,255,255,0.08)",
              border: `1px solid ${GOLD}${shareOpen ? "65" : "35"}`,
              boxShadow: shareOpen ? `0 0 10px ${GOLD}35` : "none",
              transition: "all 0.25s",
            }}>
            <Share2 size={20} color={GOLD} fill={shareOpen ? `${GOLD}25` : "none"} style={{ filter: `drop-shadow(0 0 3px ${GOLD}70)` }} />
          </div>
          <span className="font-mono text-[10px]" style={{ color: GOLD }}>{shareCount}</span>
        </motion.button>

        </div>{/* end action buttons */}
      </div>{/* end sidebar */}

      {/* ── Loading spinner for active video before canPlay ── */}
      <AnimatePresence>
        {isVideo && isActive && effectiveQuality !== "low" && !mediaLoaded && !isBuffering && (
          <motion.div className="absolute inset-0 z-[15] flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.3 }}>
            <div className="rounded-full p-3" style={{ background: "rgba(0,0,0,0.45)" }}>
              <Loader2 size={28} color="rgba(255,255,255,0.7)" className="animate-spin" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Info overlay — bottom-right, leaves left clear for action buttons ── */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)",
          paddingBottom: 14,
          paddingTop: 64,
          paddingRight: 16,
          paddingLeft: 72,   /* leave room for action-button sidebar on the left */
        }}
        dir="rtl">
        <h2 className="font-arabic font-bold text-white text-[15px] leading-tight line-clamp-2 drop-shadow mb-1.5">
          {article.title}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
            style={{ background: `${GOLD}35`, border: `1px solid ${GOLD}60`, color: GOLD }}>
            {article.authorPseudonym.charAt(0)}
          </div>
          <span className="font-arabic text-white/70 text-xs">{article.authorPseudonym}</span>
          <span className="text-white/30 text-[10px]">·</span>
          <span className="font-arabic text-white/50 text-[10px]">{formatDateTime(article.createdAt)}</span>
          <span className="text-white/30 text-[10px]">·</span>
          <div className="flex items-center gap-0.5" dir="ltr">
            <Eye size={10} color="rgba(255,255,255,0.40)" />
            <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.40)" }}>
              {formatViews(localViews)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Comment panel ── */}
      <AnimatePresence>
        {isCommentOpen && (
          <motion.div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl flex flex-col"
            style={{ background: "rgba(4,16,6,0.98)", backdropFilter: "blur(20px)", border: `1px solid ${GOLD}12`, maxHeight: "60%" }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 36 }}>
            <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
              style={{ borderColor: `${GOLD}12` }} dir="rtl">
              <span className="font-arabic text-white/80 text-sm font-bold">التعليقات ({articleComments.length})</span>
              <button onClick={onToggleComment} className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)" }}>
                <X size={14} color="rgba(255,255,255,0.6)" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0" dir="rtl">
              {/* ── Pinned body as top comment ── */}
              {article.body && (
                <div className="flex gap-2 pb-3 border-b" style={{ borderColor: `${GOLD}15` }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                    style={{ background: `${GOLD}28`, color: GOLD }}>✦</div>
                  <div className="rounded-2xl rounded-tr-sm px-3 py-2 flex-1"
                    style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}18` }}>
                    <div className="flex items-center gap-1 mb-1.5">
                      <span className="text-[9px]">📌</span>
                      <span className="font-arabic text-[10px] font-bold" style={{ color: GOLD }}>تعليق مثبّت</span>
                    </div>
                    <p className="font-arabic text-white/80 leading-relaxed text-[13px]">{article.body}</p>
                  </div>
                </div>
              )}
              {articleComments.length === 0
                ? <p className="font-arabic text-white/30 text-sm text-center py-6">لا توجد تعليقات بعد</p>
                : articleComments.map(c => (
                    <CommentRow
                      key={c.id}
                      comment={c}
                      isOwn={c.isOwn ?? false}
                      isAdmin={isAdmin}
                      articleId={article.id}
                      onEdit={onEditComment}
                      onDelete={onDeleteComment}
                      onLike={onLikeComment}
                    />
                  ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-3 border-t flex-shrink-0"
              style={{ borderColor: `${GOLD}10` }} dir="rtl">
              <input
                className="flex-1 rounded-2xl px-4 py-2 text-sm font-arabic text-white/80 outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${GOLD}18` }}
                placeholder="اكتب تعليقاً..."
                value={commentText}
                onChange={e => onCommentTextChange(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onAddComment()}
              />
              <motion.button whileTap={{ scale: 0.9 }} onClick={onAddComment}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: commentText.trim() ? `linear-gradient(135deg,${GOLD},#f0d060)` : "rgba(255,255,255,0.08)" }}>
                <Send size={15} color={commentText.trim() ? "#001a10" : "rgba(255,255,255,0.35)"} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── MediaSection ──────────────────────────────────────────────────────────────
export function MediaSection({
  telegramId,
  isAdmin = false,
}: {
  telegramId: string;
  isAdmin?: boolean;
}) {
  const networkState = useNetworkQuality();

  const [articles,    setArticles]    = useState<Article[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [likes,          setLikes]          = useState<Record<number, boolean>>({});
  const [likeCounts,     setLikeCounts]     = useState<Record<number, number>>({});
  const [downloadCounts, setDownloadCounts] = useState<Record<number, number>>({});
  const [shareCounts,    setShareCounts]    = useState<Record<number, number>>({});
  const [comments,    setComments]    = useState<Record<number, CommentData[]>>({});
  const [openCard,    setOpenCard]    = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [deletingId,  setDeletingId]  = useState<number | null>(null);
  const [savedIds,    setSavedIds]    = useState<Set<number>>(new Set());
  const [activeIdx,   setActiveIdx]   = useState(0);
  const cardRefs          = useRef<(HTMLDivElement | null)[]>([]);
  const scrollRef         = useRef<HTMLDivElement>(null);
  const didRestoreRef     = useRef(false);   // prevent double restore
  const progressSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load articles then hydrate likes & comments from API ──────────────────
  const loadArticles = useCallback(() => {
    return apiFetch("/api/articles")
      .then(r => (r.ok ? r.json() as Promise<Article[]> : Promise.reject()))
      .then(async (data) => {
        const list = data.length > 0 ? data : FALLBACK;
        setArticles(list);
        // Hydrate likes + comments for all real articles in parallel
        const realIds = list.filter(a => a.id > 0).map(a => a.id);
        await Promise.all(realIds.map(async (id) => {
          try {
            const [lr, cr] = await Promise.all([
              apiFetch(`/api/articles/${id}/likes`).then(r => r.ok ? r.json() : { count: 0, liked: false }),
              apiFetch(`/api/articles/${id}/comments`).then(r => r.ok ? r.json() : []),
            ]);
            setLikes(p => ({ ...p, [id]: lr.liked }));
            setLikeCounts(p => ({ ...p, [id]: lr.count }));
            const article = list.find(a => a.id === id);
            setDownloadCounts(p => ({ ...p, [id]: article?.downloadCount ?? 0 }));
            setShareCounts(p => ({ ...p, [id]: article?.shareCount ?? 0 }));
            const mapped = (cr as Array<{ id: number; text: string; createdAt: string; pseudonym: string; telegramId: string; likeCount: number; likedByMe: boolean }>).map(c => ({
              id: c.id, text: c.text,
              ts: new Date(c.createdAt).getTime(),
              pseudonym: c.pseudonym,
              likeCount: c.likeCount ?? 0,
              likedByMe: c.likedByMe ?? false,
              isOwn: c.telegramId === telegramId,
            }));
            setComments(p => ({ ...p, [id]: mapped }));
          } catch { /* ignore — fallback to 0 */ }
        }));
      })
      .catch(() => setArticles(FALLBACK))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadArticles(); }, [loadArticles]);

  // ── Restore scroll to last-seen article ──────────────────────────────────
  // Priority: DB (per-user) → localStorage (fast cache) → idx 0
  // Gate on loading=false: scroll container only exists after spinner is gone.
  useEffect(() => {
    if (loading || articles.length === 0 || didRestoreRef.current) return;
    didRestoreRef.current = true;

    async function doRestore() {
      // Try DB first (authenticated users), fallback to localStorage
      let savedId = 0;
      try {
        const r = await apiFetch("/api/users/me/progress");
        if (r.ok) {
          const d = await r.json() as { lastSeenArticleId: number | null };
          savedId = d.lastSeenArticleId ?? 0;
        }
      } catch { /* ignore — use localStorage */ }

      if (!savedId) {
        savedId = parseInt(localStorage.getItem(LAST_SEEN_KEY) ?? "0", 10);
      }

      if (!savedId) return;
      const targetIdx = articles.findIndex(a => a.id === savedId);
      if (targetIdx <= 0) return; // idx 0 already shown; < 0 = not found

      // Double-RAF: browser must commit card layout before we read clientHeight
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (!el) return;
        const cardH = el.clientHeight;
        if (cardH > 0) el.scrollTop = targetIdx * cardH;
        setActiveIdx(targetIdx);
      }));
    }

    doRestore();
  }, [loading, articles]);

  // ── Persist last-seen article — localStorage immediately, DB debounced 2s ──
  useEffect(() => {
    const article = articles[activeIdx];
    if (!article || article.id <= 0) return;

    // Immediate local cache so restore works even without network
    localStorage.setItem(LAST_SEEN_KEY, String(article.id));

    // Debounced DB write — avoid hammering API on every scroll tick
    if (progressSaveTimer.current) clearTimeout(progressSaveTimer.current);
    progressSaveTimer.current = setTimeout(() => {
      apiFetch("/api/users/me/progress", {
        method: "PUT",
        body: JSON.stringify({ lastSeenArticleId: article.id }),
      }).catch(() => {/* non-critical — localStorage is the fallback */});
    }, 2000);

    return () => {
      if (progressSaveTimer.current) clearTimeout(progressSaveTimer.current);
    };
  }, [activeIdx, articles]);

  // ── Active-card detection: scrollend (accurate) + long-debounce fallback ──
  //
  // WHY no IntersectionObserver:
  //   IO fires DURING the snap animation when the old card still has >50%
  //   intersection — it keeps setting activeIdx to the OLD card, so the
  //   new card never becomes active and its video never plays.
  //
  // WHY 400 ms debounce (not 80 ms):
  //   CSS snap animations take 300–500 ms.  An 80 ms debounce fires mid-flight,
  //   Math.round(scrollTop/h) gives the wrong index, the old card stays
  //   "active", audio keeps bleeding and the new video never starts.
  useEffect(() => {
    if (articles.length === 0) return;

    function snapActiveIdx() {
      const el = scrollRef.current;
      if (!el) return;
      const h = el.clientHeight;
      if (h === 0) return;
      const idx = Math.round(el.scrollTop / h);
      setActiveIdx(Math.max(0, Math.min(idx, articles.length - 1)));
    }

    const el = scrollRef.current;

    // Primary: scrollend fires exactly once after the snap animation finishes.
    el?.addEventListener("scrollend", snapActiveIdx, { passive: true });

    // Fallback for browsers / WebViews that don't support scrollend.
    // 400 ms gives snap animations enough time to complete before we sample
    // scrollTop, so Math.round() always picks the correct card.
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    function onScroll() {
      // Kill audio the instant the user starts scrolling — no waiting for
      // IntersectionObserver or state updates.
      scrollRef.current?.querySelectorAll("video").forEach(v => {
        if (!v.paused) v.pause();
      });
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(snapActiveIdx, 400);
    }
    el?.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      el?.removeEventListener("scrollend", snapActiveIdx);
      el?.removeEventListener("scroll", onScroll);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, [articles]);

  // ── Staggered background preload for images ───────────────────────────────
  // Priority order: dist-1 first (immediate), then 2→3→4 with increasing delays.
  // Videos are handled by the <video preload> attribute + Effect 2 in MediaCard.
  useEffect(() => {
    if (networkState.quality === "low") return;
    // [distance, delay-ms]: give the active card a clear head start
    const schedule: [number, number][] = [[1, 0], [2, 800], [3, 1800], [4, 3200]];
    const timers: ReturnType<typeof setTimeout>[] = [];
    schedule.forEach(([dist, delay]) => {
      const a = articles[activeIdx + dist];
      if (!a?.mediaUrl || isVideoUrl(a.mediaUrl)) return;
      const url = a.mediaUrl;
      const t = setTimeout(() => {
        const img = new window.Image();
        img.src = url;
      }, delay);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [activeIdx, articles, networkState.quality]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleLike    = useCallback((id: number) => {
    // Optimistic update
    setLikes(p => {
      const nowLiked = !p[id];
      setLikeCounts(c => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + (nowLiked ? 1 : -1)) }));
      return { ...p, [id]: nowLiked };
    });
    // Persist to API (fire & forget — optimistic already applied)
    apiFetch(`/api/articles/${id}/like`, { method: "POST" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setLikes(p => ({ ...p, [id]: data.liked }));
          setLikeCounts(c => ({ ...c, [id]: data.count }));
        }
      })
      .catch(() => {});
  }, []);
  const handleShare     = useCallback((id: number) => {
    setShareCounts(c => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    if (id > 0) apiFetch(`/api/articles/${id}/share`, { method: "POST" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.shareCount !== undefined) setShareCounts(c => ({ ...c, [id]: d.shareCount })); })
      .catch(() => {});
  }, []);
  const toggleComment = useCallback((id: number) => setOpenCard(p => p === id ? null : id), []);
  const addComment    = useCallback((id: number) => {
    const text = commentText.trim();
    if (!text) return;
    // Optimistic local add
    const tmpId = -Date.now();
    setComments(p => ({ ...p, [id]: [...(p[id] ?? []), { id: tmpId, text, ts: Date.now(), pseudonym: "", isOwn: true, likeCount: 0, likedByMe: false }] }));
    setCommentText("");
    // Persist to API
    apiFetch(`/api/articles/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(saved => {
        if (saved) {
          // Replace the temp comment with the real server ID
          setComments(p => ({
            ...p,
            [id]: (p[id] ?? []).map(c => c.id === tmpId
              ? { id: saved.id, text: saved.text, ts: new Date(saved.createdAt).getTime(), pseudonym: saved.pseudonym, isOwn: true, likeCount: 0, likedByMe: false }
              : c
            ),
          }));
        }
      })
      .catch(() => {
        // Remove optimistic entry on failure
        setComments(p => ({ ...p, [id]: (p[id] ?? []).filter(c => c.id !== tmpId) }));
      });
  }, [commentText]);
  const handleDelete  = useCallback(async (id: number) => {
    if (id < 0) return;
    setDeletingId(id);
    try {
      const r = await apiFetch(`/api/articles/${id}`, { method: "DELETE" });
      if (r.ok) setArticles(p => p.filter(a => a.id !== id));
    } finally { setDeletingId(null); }
  }, []);
  const handleSave    = useCallback((article: Article) => {
    if (!article.mediaUrl) return;
    saveMedia(article.mediaUrl);
    setSavedIds(p => new Set([...p, article.id]));
    setDownloadCounts(c => ({ ...c, [article.id]: (c[article.id] ?? 0) + 1 }));
    if (article.id > 0) apiFetch(`/api/articles/${article.id}/download`, { method: "POST" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.downloadCount !== undefined) setDownloadCounts(c => ({ ...c, [article.id]: d.downloadCount })); })
      .catch(() => {});
  }, []);

  const handleEditComment = useCallback((articleId: number, commentId: number, newText: string) => {
    setComments(p => ({ ...p, [articleId]: (p[articleId] ?? []).map(c => c.id === commentId ? { ...c, text: newText } : c) }));
    apiFetch(`/api/articles/${articleId}/comments/${commentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText }),
    }).catch(() => {});
  }, []);

  const handleDeleteComment = useCallback((articleId: number, commentId: number) => {
    setComments(p => ({ ...p, [articleId]: (p[articleId] ?? []).filter(c => c.id !== commentId) }));
    apiFetch(`/api/articles/${articleId}/comments/${commentId}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const handleLikeComment = useCallback((articleId: number, commentId: number) => {
    setComments(p => ({
      ...p,
      [articleId]: (p[articleId] ?? []).map(c => c.id === commentId
        ? { ...c, likedByMe: !c.likedByMe, likeCount: (c.likeCount ?? 0) + (c.likedByMe ? -1 : 1) }
        : c),
    }));
    apiFetch(`/api/articles/${articleId}/comments/${commentId}/like`, { method: "POST" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setComments(p => ({
          ...p,
          [articleId]: (p[articleId] ?? []).map(c => c.id === commentId ? { ...c, likedByMe: d.liked, likeCount: d.likeCount } : c),
        }));
      }).catch(() => {});
  }, []);
  const handlePublished = useCallback((article: Article) => {
    // Newest articles go at the bottom (ascending order)
    setArticles(p => [...p.filter(a => a.id > 0), article]);
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: `${GOLD}40`, borderTopColor: GOLD }} />
      </div>
    );
  }

  return (
    <div className="h-full relative">

      <div
        ref={scrollRef}
        className="h-full overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>

        {articles.map((article, idx) => (
          <MediaCard
            key={article.id}
            article={article}
            idx={idx}
            isActive={idx === activeIdx}
            distanceFromActive={Math.abs(idx - activeIdx)}
            liked={!!likes[article.id]}
            likeCount={likeCounts[article.id] ?? 0}
            articleComments={comments[article.id] ?? []}
            isCommentOpen={openCard === article.id}
            isDeleting={deletingId === article.id}
            isAdmin={isAdmin}
            myTelegramId={telegramId ?? ""}
            saved={savedIds.has(article.id)}
            downloadCount={downloadCounts[article.id] ?? 0}
            shareCount={shareCounts[article.id] ?? 0}
            commentText={openCard === article.id ? commentText : ""}
            onLike={() => toggleLike(article.id)}
            onToggleComment={() => toggleComment(article.id)}
            onDelete={() => handleDelete(article.id)}
            onSave={() => handleSave(article)}
            onShare={() => handleShare(article.id)}
            onAddComment={() => addComment(article.id)}
            onCommentTextChange={setCommentText}
            onEditComment={(commentId, newText) => handleEditComment(article.id, commentId, newText)}
            onDeleteComment={(commentId) => handleDeleteComment(article.id, commentId)}
            onLikeComment={(commentId) => handleLikeComment(article.id, commentId)}
            cardRef={el => { cardRefs.current[idx] = el; }}
            networkState={networkState}
          />
        ))}
      </div>

      {/* ── Admin FAB "+" ── */}
      {isAdmin && (
        <motion.button
          whileTap={{ scale: 0.92 }} whileHover={{ scale: 1.06 }}
          onClick={() => setComposeOpen(true)}
          className="absolute z-30 flex items-center justify-center rounded-full"
          style={{
            bottom: 24, right: 16, width: 52, height: 52,
            background: `linear-gradient(135deg,${GOLD},#e8c840)`,
            boxShadow:  `0 6px 28px ${GOLD}55,0 2px 8px rgba(0,0,0,0.4)`,
          }}>
          <Plus size={24} color="#061409" strokeWidth={2.5} />
        </motion.button>
      )}

      <AnimatePresence>
        {composeOpen && (
          <ComposeSheet onClose={() => setComposeOpen(false)} onPublished={handlePublished} />
        )}
      </AnimatePresence>
    </div>
  );
}
