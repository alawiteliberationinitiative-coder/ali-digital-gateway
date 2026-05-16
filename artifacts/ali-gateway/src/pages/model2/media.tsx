import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Send, X, ChevronDown,
  Plus, Trash2, Image, Loader2, ArrowDownToLine,
  Volume2, VolumeX, Wifi, WifiOff, Play, Pause, Gauge,
  Share2, Link2, Check,
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
  createdAt: string;
}
interface CommentData { id: number; text: string; ts: number }

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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 75_000_000) { setError("الملف أكبر من 75 ميجابايت"); return; }

    setUploading(true);
    setError(null);
    try {
      // Step 1 — Get a Supabase signed upload URL from our server (tiny request)
      const tokenRes = await apiFetch("/api/articles/upload-token", {
        method: "POST",
        body: JSON.stringify({ mimeType: file.type }),
      });
      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "فشل الحصول على رابط الرفع");
      }
      const { uploadUrl, publicUrl } = await tokenRes.json() as { uploadUrl: string; publicUrl: string };

      // Step 2 — Upload binary DIRECTLY to Supabase, bypassing the Replit proxy
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5 * 60 * 1_000);
      try {
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
          signal: controller.signal,
        });
        if (!uploadRes.ok) {
          const txt = await uploadRes.text().catch(() => "");
          throw new Error(`فشل رفع الملف (${uploadRes.status})${txt ? `: ${txt}` : ""}`);
        }
      } finally {
        clearTimeout(timer);
      }

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

// ── MediaCard ─────────────────────────────────────────────────────────────────
function MediaCard({
  article, idx, isActive, liked, articleComments, isCommentOpen,
  isDeleting, isAdmin, saved, commentText,
  onLike, onToggleComment, onDelete, onSave, onAddComment, onCommentTextChange,
  cardRef, networkState,
}: {
  article:         Article;
  idx:             number;
  isActive:        boolean;
  liked:           boolean;
  articleComments: CommentData[];
  isCommentOpen:   boolean;
  isDeleting:      boolean;
  isAdmin:         boolean;
  saved:           boolean;
  commentText:     string;
  onLike:              () => void;
  onToggleComment:     () => void;
  onDelete:            () => void;
  onSave:              () => void;
  onAddComment:        () => void;
  onCommentTextChange: (v: string) => void;
  cardRef:         (el: HTMLDivElement | null) => void;
  networkState:    NetworkState;
}) {
  const [mediaLoaded,    setMediaLoaded]    = useState(false);
  const [mediaError,     setMediaError]     = useState(false);
  const [muted,          setMuted]          = useState(true);
  const [isBuffering,    setIsBuffering]    = useState(false);
  const [qualityOpen,    setQualityOpen]    = useState(false);
  const [shareOpen,      setShareOpen]      = useState(false);
  const [userPaused,     setUserPaused]     = useState(false);
  const [playHint,       setPlayHint]       = useState<"play" | "pause" | null>(null);
  // selectedQuality: null = use auto (from network), or user override
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality | null>(null);
  const bufferTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playHintTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = !!article.mediaUrl && isVideoUrl(article.mediaUrl);

  // effective quality = user override OR auto from network
  const effectiveQuality: VideoQuality = selectedQuality ?? networkState.quality;
  const meta = QUALITY_META[effectiveQuality];

  // ── Video play/pause by active state + user override ──────────────────────
  useEffect(() => {
    if (!videoRef.current || !isVideo) return;
    if (isActive && effectiveQuality !== "low" && !userPaused) {
      videoRef.current.play().catch(() => {/* autoplay policy */});
    } else {
      videoRef.current.pause();
    }
  }, [isActive, effectiveQuality, isVideo, userPaused]);

  // Reset user-pause when a new card becomes active (scroll to next/prev)
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
    // Force reload with new preload hint
    const t = video.currentTime;
    video.load();
    video.currentTime = t;
    if (isActive) video.play().catch(() => {});
  }

  // Preload attribute based on quality + active state
  const preloadAttr = effectiveQuality === "high" ? "auto"
    : effectiveQuality === "medium" ? (isActive ? "auto" : "metadata")
    : "none";

  return (
    <div
      ref={cardRef}
      className="relative flex flex-col overflow-hidden"
      style={{ height: "100%", scrollSnapAlign: "start", flexShrink: 0, background: CARD_BG[idx % CARD_BG.length] }}>

      {/* ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: CARD_GLOW[idx % CARD_GLOW.length] }} />

      {/* ── Media layer ── */}
      {article.mediaUrl && !mediaError && (
        <div className="absolute inset-x-0 top-0" style={{ bottom: "80px" }}>

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
                transition: "opacity 0.5s ease",
              }}
              muted={muted}
              loop
              playsInline
              preload={preloadAttr}
              onLoadedData={() => setMediaLoaded(true)}
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

          {/* ── ADAR watermark ── */}
          <img
            src="/adar-logo.png"
            alt="ADAR"
            draggable={false}
            className="absolute top-3 left-3 z-10 pointer-events-none select-none"
            style={{
              width: 58,
              height: 58,
              objectFit: "contain",
              opacity: 0.82,
              filter: [
                "drop-shadow(0 0 10px rgba(212,175,55,0.55))",
                "drop-shadow(0 0 4px rgba(212,175,55,0.3))",
                "drop-shadow(0 2px 6px rgba(0,0,0,0.85))",
                "brightness(1.12)",
                "saturate(1.15)",
              ].join(" "),
            }}
          />
        </div>
      )}

      {/* ── Category + quality badge (top-right) ── */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
        <span className="font-arabic text-[10px] px-3 py-1 rounded-full font-bold"
          style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}35`, color: GOLD }}>
          {isVideo ? "فيديو" : "إخباري"}
        </span>

        {/* Quality badge — tappable to open quality panel */}
        {isVideo && (
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => setQualityOpen(o => !o)}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-mono font-bold"
            style={{
              background:  effectiveQuality === "high"   ? "rgba(74,222,128,0.15)"
                         : effectiveQuality === "medium" ? `${GOLD}15`
                         :                                 "rgba(248,113,113,0.15)",
              border:      effectiveQuality === "high"   ? "1px solid rgba(74,222,128,0.35)"
                         : effectiveQuality === "medium" ? `1px solid ${GOLD}35`
                         :                                 "1px solid rgba(248,113,113,0.35)",
              color:       QUALITY_META[effectiveQuality].dotColor,
            }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: QUALITY_META[effectiveQuality].dotColor }} />
            {meta.badge}
          </motion.button>
        )}
      </div>

      {/* ── Buffering spinner overlay (center) ── */}
      <AnimatePresence>
        {isVideo && isBuffering && effectiveQuality !== "low" && (
          <motion.div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="rounded-full p-3" style={{ background: "rgba(0,0,0,0.45)" }}>
              <Loader2 size={28} color="rgba(255,255,255,0.7)" className="animate-spin" />
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
        style={{ bottom: isCommentOpen ? "62%" : "100px", gap: 0 }}>

        {/* Mute/unmute — separated above action buttons */}
        {isVideo && mediaLoaded && effectiveQuality !== "low" && (
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => setMuted(m => !m)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.15)", marginBottom: 28 }}>
            {muted ? <VolumeX size={15} color="rgba(255,255,255,0.7)" /> : <Volume2 size={15} color="white" />}
          </motion.button>
        )}

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-4">

        {/* Like */}
        <motion.button whileTap={{ scale: 1.35 }} onClick={onLike} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: liked ? `${GOLD}20` : "rgba(255,255,255,0.08)", border: `1px solid ${liked ? GOLD + "55" : "rgba(255,255,255,0.15)"}` }}>
            <Heart size={20} color={liked ? GOLD : "white"} fill={liked ? GOLD : "none"} />
          </div>
          <span className="text-white/60 text-[10px] font-mono">{liked ? 1 : 0}</span>
        </motion.button>

        {/* Comment */}
        <motion.button whileTap={{ scale: 1.2 }} onClick={onToggleComment} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: isCommentOpen ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.08)", border: `1px solid ${isCommentOpen ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.15)"}` }}>
            <MessageCircle size={20} color={isCommentOpen ? "#60a5fa" : "white"} />
          </div>
          <span className="text-white/60 text-[10px] font-mono">{articleComments.length}</span>
        </motion.button>

        {/* Download */}
        {article.mediaUrl && (
          <motion.button whileTap={{ scale: 1.2 }} onClick={onSave} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: saved ? `${GOLD}20` : "rgba(255,255,255,0.08)", border: `1px solid ${saved ? GOLD + "55" : "rgba(255,255,255,0.15)"}`, transition: "all 0.25s" }}>
              <ArrowDownToLine size={20} color={saved ? GOLD : "white"} />
            </div>
            <span className="text-[10px] font-arabic" style={{ color: saved ? GOLD : "rgba(255,255,255,0.45)" }}>
              {saved ? "تم ✓" : "تنزيل"}
            </span>
          </motion.button>
        )}

        {/* Share */}
        <motion.button whileTap={{ scale: 1.2 }} onClick={() => setShareOpen(o => !o)} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: shareOpen ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.08)", border: `1px solid ${shareOpen ? "rgba(168,85,247,0.4)" : "rgba(255,255,255,0.15)"}`, transition: "all 0.25s" }}>
            <Share2 size={20} color={shareOpen ? "#a855f7" : "white"} />
          </div>
          <span className="text-[10px] font-arabic" style={{ color: shareOpen ? "#a855f7" : "rgba(255,255,255,0.45)" }}>
            مشاركة
          </span>
        </motion.button>

        </div>{/* end action buttons */}
      </div>{/* end sidebar */}

      {/* ── MD-quality: tap-to-play overlay ── */}
      <AnimatePresence>
        {isVideo && isActive && effectiveQuality === "medium" && !mediaLoaded && (
          <motion.div className="absolute inset-0 z-15 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: "rgba(0,0,0,0.35)" }}>
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={() => videoRef.current?.play().catch(() => {})}
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)" }}>
              <Play size={26} color="white" fill="white" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Title bar (outside / below media) ── */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-4 flex flex-col justify-center gap-1.5"
        style={{ height: "80px", background: CARD_BG[idx % CARD_BG.length], borderTop: `1px solid ${GOLD}18` }}
        dir="rtl">
        <h2 className="font-arabic font-bold text-white text-[15px] leading-tight line-clamp-1">
          {article.title}
        </h2>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
            style={{ background: `${GOLD}25`, border: `1px solid ${GOLD}45`, color: GOLD }}>
            {article.authorPseudonym.charAt(0)}
          </div>
          <span className="font-arabic text-white/55 text-xs">{article.authorPseudonym}</span>
          <span className="text-white/25 text-[10px]">·</span>
          <span className="font-arabic text-white/40 text-[10px]">{formatDateTime(article.createdAt)}</span>
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
                    <div key={c.id} className="flex gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                        style={{ background: `${GOLD}20`, color: GOLD }}>✦</div>
                      <div className="rounded-2xl rounded-tr-sm px-3 py-2 text-xs flex-1"
                        style={{ background: "rgba(255,255,255,0.06)" }}>
                        <p className="font-arabic text-white/80 leading-relaxed">{c.text}</p>
                      </div>
                    </div>
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
  const [likes,       setLikes]       = useState<Record<number, boolean>>({});
  const [comments,    setComments]    = useState<Record<number, CommentData[]>>({});
  const [openCard,    setOpenCard]    = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [deletingId,  setDeletingId]  = useState<number | null>(null);
  const [savedIds,    setSavedIds]    = useState<Set<number>>(new Set());
  const [activeIdx,   setActiveIdx]   = useState(0);
  const cardRefs      = useRef<(HTMLDivElement | null)[]>([]);
  // Prevents re-running the restore scroll after the initial mount
  const didRestoreRef = useRef(false);

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadArticles = useCallback(() => {
    return apiFetch("/api/articles")
      .then(r => (r.ok ? r.json() as Promise<Article[]> : Promise.reject()))
      .then(data => setArticles(data.length > 0 ? data : FALLBACK))
      .catch(() => setArticles(FALLBACK))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadArticles(); }, [loadArticles]);

  // ── Restore scroll to last-seen article (Telegram-channel style) ──────────
  useEffect(() => {
    if (articles.length === 0 || didRestoreRef.current) return;
    const savedId = parseInt(localStorage.getItem(LAST_SEEN_KEY) ?? "0", 10);
    if (!savedId) return;
    const targetIdx = articles.findIndex(a => a.id === savedId);
    if (targetIdx <= 0) return;
    didRestoreRef.current = true;
    requestAnimationFrame(() => {
      cardRefs.current[targetIdx]?.scrollIntoView({ behavior: "instant" });
      setActiveIdx(targetIdx);
    });
  }, [articles]);

  // ── Persist last-seen article id whenever visible card changes ─────────────
  useEffect(() => {
    const article = articles[activeIdx];
    if (article && article.id > 0) {
      localStorage.setItem(LAST_SEEN_KEY, String(article.id));
    }
  }, [activeIdx, articles]);

  // ── IntersectionObserver ───────────────────────────────────────────────────
  useEffect(() => {
    if (articles.length === 0) return;
    const observer = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const i = cardRefs.current.indexOf(e.target as HTMLDivElement);
          if (i !== -1) setActiveIdx(i);
        }
      }
    }, { threshold: 0.55 });
    cardRefs.current.forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [articles]);

  // ── Preload images for next 2 cards ───────────────────────────────────────
  useEffect(() => {
    if (networkState.quality === "low") return; // don't preload on weak networks
    articles.slice(activeIdx, activeIdx + 3).forEach(a => {
      if (a.mediaUrl && !isVideoUrl(a.mediaUrl)) {
        const img = new window.Image();
        img.src = a.mediaUrl;
      }
    });
  }, [activeIdx, articles, networkState.quality]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleLike    = useCallback((id: number) => setLikes(p => ({ ...p, [id]: !p[id] })), []);
  const toggleComment = useCallback((id: number) => setOpenCard(p => p === id ? null : id), []);
  const addComment    = useCallback((id: number) => {
    const text = commentText.trim();
    if (!text) return;
    setComments(p => ({ ...p, [id]: [...(p[id] ?? []), { id: Date.now(), text, ts: Date.now() }] }));
    setCommentText("");
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

      <div className="h-full overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>

        {articles.map((article, idx) => (
          <MediaCard
            key={article.id}
            article={article}
            idx={idx}
            isActive={idx === activeIdx}
            liked={!!likes[article.id]}
            articleComments={comments[article.id] ?? []}
            isCommentOpen={openCard === article.id}
            isDeleting={deletingId === article.id}
            isAdmin={isAdmin}
            saved={savedIds.has(article.id)}
            commentText={openCard === article.id ? commentText : ""}
            onLike={() => toggleLike(article.id)}
            onToggleComment={() => toggleComment(article.id)}
            onDelete={() => handleDelete(article.id)}
            onSave={() => handleSave(article)}
            onAddComment={() => addComment(article.id)}
            onCommentTextChange={setCommentText}
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
