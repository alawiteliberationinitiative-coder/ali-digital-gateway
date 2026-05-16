import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Send, X, ChevronDown,
  Plus, Trash2, Image, Loader2, ArrowDownToLine, Volume2, VolumeX,
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const FALLBACK: Article[] = [
  { id: -1, title: "مبادرة التحرير العلوي — البوابة الرقمية",        body: "منصة متكاملة تجمع التوثيق والرصد والمناصرة في فضاء رقمي آمن، مكرّسة لخدمة أبناء الطائفة العلوية وتوثيق قضيتهم أمام العالم.",                                                                  authorPseudonym: "فريق ALI",       authorAliId: "ALI-0001", createdAt: new Date().toISOString() },
  { id: -2, title: "مركز ADAR للرصد الإعلامي",                       body: "الباحث الرقمي — أرشيف علوي موزّع للبحث والتوثيق والرصد. نتتبّع المشهد الإعلامي ونوثّق الرواية الحقيقية للأحداث بعيداً عن التزوير.",                                                              authorPseudonym: "مركز ADAR",      authorAliId: "ALI-0002", createdAt: new Date().toISOString() },
  { id: -3, title: "رمز $MDD — ركيزة الدعم المالي",                  body: "عملة رقمية مدعومة بمنظومة العقد الذكي، تُمكّن المجتمع من المشاركة الفاعلة في بناء المستقبل وتمويل العمل الإنساني والتوثيقي.",                                                                   authorPseudonym: "الركن المالي",   authorAliId: "ALI-0003", createdAt: new Date().toISOString() },
  { id: -4, title: "المجلس الاجتماعي — فضاء النقاش الحر",            body: "مساحات صوتية مشفّرة تتيح حوارات هادئة وعميقة بين أبناء المجتمع، بعيداً عن ضجيج وسائل التواصل التقليدية.",                                                                                        authorPseudonym: "فريق المجتمع",   authorAliId: "ALI-0004", createdAt: new Date().toISOString() },
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

/** Returns true for video URLs (mp4, webm, mov, ogg, m4v) */
function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(url);
}

/**
 * Save media to device.
 * In Telegram Mini App → openLink (user can long-press to save in browser).
 * Fallback → open in new tab.
 */
function saveMedia(url: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const twa = (window as any).Telegram?.WebApp;
    if (twa?.openLink) { twa.openLink(url); return; }
  } catch { /* ignore */ }
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
  const [error,      setError]      = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_242_880) { setError("الصورة أكبر من 5 ميجابايت"); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      setMediaUrl(ev.target?.result as string);
      setPreviewing(true);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    setError(null);
    if (!title.trim() || !body.trim()) { setError("العنوان والمحتوى مطلوبان"); return; }
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
            <label className="font-arabic text-xs text-white/50">المحتوى *</label>
            <textarea className="w-full rounded-2xl px-4 py-3 text-sm font-arabic text-white/90 outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${GOLD}20`, minHeight: 120 }}
              placeholder="اكتب المحتوى هنا..." value={body} maxLength={20_000} onChange={e => setBody(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="font-arabic text-xs text-white/50">صورة أو فيديو (اختياري)</label>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-arabic"
              style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}30`, color: GOLD }}>
              <Image size={14} />اختيار من الهاتف
            </button>
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
          {error && (
            <p className="font-arabic text-red-400 text-xs bg-red-400/10 rounded-xl px-4 py-2.5 border border-red-400/20">{error}</p>
          )}
        </div>

        <div className="flex-shrink-0 px-5 pb-8 pt-2">
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit}
            disabled={submitting || !title.trim() || !body.trim()}
            className="w-full rounded-2xl py-3.5 font-arabic font-bold text-sm flex items-center justify-center gap-2"
            style={{
              background: (submitting || !title.trim() || !body.trim()) ? "rgba(255,255,255,0.06)" : `linear-gradient(135deg,${GOLD},#e8c840)`,
              color:      (submitting || !title.trim() || !body.trim()) ? "rgba(255,255,255,0.25)" : "#061409",
            }}>
            {submitting ? <><Loader2 size={16} className="animate-spin" />جاري النشر...</> : "نشر المحتوى"}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

// ── MediaCard: isolated card with its own video + image loading state ─────────
function MediaCard({
  article,
  idx,
  isActive,
  liked,
  articleComments,
  isCommentOpen,
  isDeleting,
  isAdmin,
  saved,
  commentText,
  onLike,
  onToggleComment,
  onDelete,
  onSave,
  onAddComment,
  onCommentTextChange,
  cardRef,
}: {
  article: Article;
  idx: number;
  isActive: boolean;
  liked: boolean;
  articleComments: CommentData[];
  isCommentOpen: boolean;
  isDeleting: boolean;
  isAdmin: boolean;
  saved: boolean;
  commentText: string;
  onLike: () => void;
  onToggleComment: () => void;
  onDelete: () => void;
  onSave: () => void;
  onAddComment: () => void;
  onCommentTextChange: (v: string) => void;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  const [mediaLoaded,  setMediaLoaded]  = useState(false);
  const [mediaError,   setMediaError]   = useState(false);
  const [muted,        setMuted]        = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo  = !!article.mediaUrl && isVideoUrl(article.mediaUrl);

  // Auto-play video when card is active, pause otherwise
  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.play().catch(() => {/* autoplay blocked */});
    } else {
      videoRef.current.pause();
    }
  }, [isActive]);

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
        <div className="absolute inset-0">

          {/* blur placeholder shown until media loads */}
          {!mediaLoaded && (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: CARD_BG[idx % CARD_BG.length] }}>
              <div className="w-7 h-7 rounded-full border-2 animate-spin"
                style={{ borderColor: `${GOLD}30`, borderTopColor: `${GOLD}90` }} />
            </div>
          )}

          {isVideo ? (
            <video
              ref={videoRef}
              src={article.mediaUrl}
              className="w-full h-full object-cover"
              style={{
                opacity:    mediaLoaded ? 0.7 : 0,
                transition: "opacity 0.5s ease",
                filter:     mediaLoaded ? "none" : "blur(16px)",
              }}
              muted={muted}
              loop
              playsInline
              preload={isActive ? "auto" : "metadata"}
              onLoadedData={() => setMediaLoaded(true)}
              onError={() => setMediaError(true)}
            />
          ) : (
            <img
              src={article.mediaUrl}
              alt=""
              className="w-full h-full object-cover"
              style={{
                opacity:    mediaLoaded ? 0.55 : 0,
                transition: "opacity 0.6s ease, filter 0.6s ease",
                filter:     mediaLoaded ? "none" : "blur(20px)",
              }}
              loading={idx <= 1 ? "eager" : "lazy"}
              onLoad={()  => setMediaLoaded(true)}
              onError={() => setMediaError(true)}
            />
          )}

          {/* dark gradient for readability */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(0deg,rgba(2,14,4,0.94) 0%,rgba(2,14,4,0.3) 55%,rgba(2,14,4,0.5) 100%)" }} />
        </div>
      )}

      {/* ── Category badge ── */}
      <div className="absolute top-4 right-4 z-10">
        <span className="font-arabic text-[10px] px-3 py-1 rounded-full font-bold"
          style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}35`, color: GOLD }}>
          {isVideo ? "فيديو" : "إخباري"}
        </span>
      </div>

      {/* ── Video: mute/unmute toggle ── */}
      {isVideo && mediaLoaded && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setMuted(m => !m)}
          className="absolute top-4 z-10 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ left: isAdmin ? 52 : 16, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.15)" }}>
          {muted
            ? <VolumeX size={15} color="rgba(255,255,255,0.7)" />
            : <Volume2 size={15} color="white" />}
        </motion.button>
      )}

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
      <div className="absolute left-3 z-10 flex flex-col items-center gap-4"
        style={{ bottom: isCommentOpen ? "62%" : "116px" }}>

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

        {/* Save — only when media exists */}
        {article.mediaUrl && (
          <motion.button whileTap={{ scale: 1.2 }} onClick={onSave} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                background: saved ? `${GOLD}20` : "rgba(255,255,255,0.08)",
                border: `1px solid ${saved ? GOLD + "55" : "rgba(255,255,255,0.15)"}`,
                transition: "all 0.25s",
              }}>
              <ArrowDownToLine size={20} color={saved ? GOLD : "white"} />
            </div>
            <span className="text-[10px] font-arabic" style={{ color: saved ? GOLD : "rgba(255,255,255,0.45)" }}>
              {saved ? "تم" : "حفظ"}
            </span>
          </motion.button>
        )}
      </div>

      {/* ── Bottom content overlay ── */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 pt-20 pointer-events-none"
        style={{ background: "linear-gradient(0deg,rgba(2,14,4,0.97) 0%,rgba(2,14,4,0.7) 55%,transparent 100%)" }}
        dir="rtl">
        <h2 className="font-arabic font-bold text-white text-[19px] leading-tight line-clamp-2 mb-2">{article.title}</h2>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
            style={{ background: `${GOLD}25`, border: `1px solid ${GOLD}45`, color: GOLD }}>
            {article.authorPseudonym.charAt(0)}
          </div>
          <span className="font-arabic text-white/50 text-xs">{article.authorPseudonym}</span>
          <span className="text-white/25 text-[10px]">·</span>
          <span className="text-white/40 text-[10px]">{formatDate(article.createdAt)}</span>
        </div>
        <p className="font-arabic text-white/65 text-sm leading-relaxed line-clamp-3">{article.body}</p>
      </div>

      {/* scroll hint */}
      {idx > 0 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none">
          <ChevronDown size={16} color="white" />
        </div>
      )}

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
              {articleComments.length === 0 ? (
                <p className="font-arabic text-white/30 text-sm text-center py-6">لا توجد تعليقات بعد</p>
              ) : articleComments.map(c => (
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

// ── Main MediaSection ─────────────────────────────────────────────────────────
export function MediaSection({
  telegramId,
  isAdmin = false,
}: {
  telegramId: string;
  isAdmin?: boolean;
}) {
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

  // Refs for IntersectionObserver
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ── Load articles ──────────────────────────────────────────────────────────
  const loadArticles = useCallback(() => {
    return apiFetch("/api/articles")
      .then(r => (r.ok ? r.json() as Promise<Article[]> : Promise.reject()))
      .then(data => setArticles(data.length > 0 ? data : FALLBACK))
      .catch(() => setArticles(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  // ── IntersectionObserver: detect active card ───────────────────────────────
  // Also drives video play/pause inside MediaCard via isActive prop
  useEffect(() => {
    if (articles.length === 0) return;
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = cardRefs.current.indexOf(entry.target as HTMLDivElement);
            if (idx !== -1) setActiveIdx(idx);
          }
        }
      },
      { threshold: 0.55 },   // card must be >55% visible to count as active
    );
    cardRefs.current.forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [articles]);

  // ── Preload images for active + next 2 cards (Instagram-style) ────────────
  useEffect(() => {
    const toLoad = articles.slice(activeIdx, activeIdx + 3);
    toLoad.forEach(a => {
      if (a.mediaUrl && !isVideoUrl(a.mediaUrl)) {
        const img = new window.Image();
        img.src = a.mediaUrl;
      }
    });
  }, [activeIdx, articles]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleLike    = useCallback((id: number) => setLikes(p => ({ ...p, [id]: !p[id] })), []);
  const toggleComment = useCallback((id: number) => setOpenCard(p => p === id ? null : id), []);

  const addComment = useCallback((id: number) => {
    const text = commentText.trim();
    if (!text) return;
    setComments(p => ({ ...p, [id]: [...(p[id] ?? []), { id: Date.now(), text, ts: Date.now() }] }));
    setCommentText("");
  }, [commentText]);

  const handleDelete = useCallback(async (id: number) => {
    if (id < 0) return;
    setDeletingId(id);
    try {
      const r = await apiFetch(`/api/articles/${id}`, { method: "DELETE" });
      if (r.ok) setArticles(p => p.filter(a => a.id !== id));
    } finally { setDeletingId(null); }
  }, []);

  const handleSave = useCallback((article: Article) => {
    if (!article.mediaUrl) return;
    saveMedia(article.mediaUrl);
    setSavedIds(p => new Set([...p, article.id]));
  }, []);

  const handlePublished = useCallback((article: Article) => {
    setArticles(p => [article, ...p.filter(a => a.id > 0)]);
  }, []);

  // ── Loading state ──────────────────────────────────────────────────────────
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

      {/* ── Snap-scroll reel container ── */}
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
            background:  `linear-gradient(135deg,${GOLD},#e8c840)`,
            boxShadow:   `0 6px 28px ${GOLD}55,0 2px 8px rgba(0,0,0,0.4)`,
          }}>
          <Plus size={24} color="#061409" strokeWidth={2.5} />
        </motion.button>
      )}

      {/* ── Compose sheet ── */}
      <AnimatePresence>
        {composeOpen && (
          <ComposeSheet onClose={() => setComposeOpen(false)} onPublished={handlePublished} />
        )}
      </AnimatePresence>
    </div>
  );
}
