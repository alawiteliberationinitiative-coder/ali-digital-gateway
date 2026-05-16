import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Send, X, ChevronDown, Plus, Trash2, Image, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

const GOLD = "#d4af37";

interface Article {
  id: number;
  title: string;
  body: string;
  mediaUrl?: string | null;
  authorPseudonym: string;
  authorAliId: string;
  createdAt: string;
}

const FALLBACK: Article[] = [
  {
    id: -1,
    title: "مبادرة التحرير العلوي — البوابة الرقمية",
    body: "منصة متكاملة تجمع التوثيق والرصد والمناصرة في فضاء رقمي آمن، مكرّسة لخدمة أبناء الطائفة العلوية وتوثيق قضيتهم أمام العالم.",
    authorPseudonym: "فريق ALI",
    authorAliId: "ALI-0001",
    createdAt: new Date().toISOString(),
  },
  {
    id: -2,
    title: "مركز ADAR للرصد الإعلامي",
    body: "الباحث الرقمي — أرشيف علوي موزّع للبحث والتوثيق والرصد. نتتبّع المشهد الإعلامي ونوثّق الرواية الحقيقية للأحداث بعيداً عن التزوير.",
    authorPseudonym: "مركز ADAR",
    authorAliId: "ALI-0002",
    createdAt: new Date().toISOString(),
  },
  {
    id: -3,
    title: "رمز $MDD — ركيزة الدعم المالي",
    body: "عملة رقمية مدعومة بمنظومة العقد الذكي، تُمكّن المجتمع من المشاركة الفاعلة في بناء المستقبل وتمويل العمل الإنساني والتوثيقي.",
    authorPseudonym: "الركن المالي",
    authorAliId: "ALI-0003",
    createdAt: new Date().toISOString(),
  },
  {
    id: -4,
    title: "المجلس الاجتماعي — فضاء النقاش الحر",
    body: "مساحات صوتية مشفّرة تتيح حوارات هادئة وعميقة بين أبناء المجتمع، بعيداً عن ضجيج وسائل التواصل التقليدية.",
    authorPseudonym: "فريق المجتمع",
    authorAliId: "ALI-0004",
    createdAt: new Date().toISOString(),
  },
];

const CARD_BG = [
  "linear-gradient(160deg, #071a08 0%, #0c2510 100%)",
  "linear-gradient(160deg, #07090f 0%, #0b0f1e 100%)",
  "linear-gradient(160deg, #1a1200 0%, #221800 100%)",
  "linear-gradient(160deg, #0a1a0d 0%, #07150a 100%)",
];

const CARD_GLOW = [
  `radial-gradient(ellipse 70% 50% at 50% 30%, ${GOLD}05 0%, transparent 70%)`,
  "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(96,165,250,0.04) 0%, transparent 70%)",
  `radial-gradient(ellipse 70% 50% at 50% 30%, ${GOLD}07 0%, transparent 70%)`,
  "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(34,197,94,0.04) 0%, transparent 70%)",
];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ar-SA", { day: "numeric", month: "short" });
  } catch { return ""; }
}

interface CommentData { id: number; text: string; ts: number }

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

  // قراءة الصورة من الهاتف وتحويلها لـ data URL للمعاينة
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_242_880) { setError("الصورة أكبر من 5 ميجابايت"); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setMediaUrl(url);
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
        body: JSON.stringify({
          title:    title.trim(),
          body:     body.trim(),
          mediaUrl: mediaUrl.trim() || undefined,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({})) as { error?: string };
        throw new Error(e.error ?? "حدث خطأ");
      }
      const article = await r.json() as Article;
      onPublished(article);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* backdrop */}
      <motion.div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* sheet */}
      <motion.div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl"
        style={{
          background:    "linear-gradient(160deg,#031006,#061409)",
          border:        `1px solid ${GOLD}18`,
          borderBottom:  "none",
          maxHeight:     "88dvh",
        }}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 36 }}>

        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: `${GOLD}30` }} />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0" dir="rtl">
          <span className="font-arabic font-bold text-base" style={{ color: GOLD }}>
            نشر محتوى جديد
          </span>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)" }}>
            <X size={16} color="rgba(255,255,255,0.6)" />
          </button>
        </div>

        {/* form */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4 min-h-0" dir="rtl">

          {/* title */}
          <div className="space-y-1.5">
            <label className="font-arabic text-xs text-white/50">العنوان *</label>
            <input
              className="w-full rounded-2xl px-4 py-3 text-sm font-arabic text-white/90 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${GOLD}20` }}
              placeholder="عنوان المحتوى..."
              value={title}
              maxLength={200}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* body */}
          <div className="space-y-1.5">
            <label className="font-arabic text-xs text-white/50">المحتوى *</label>
            <textarea
              className="w-full rounded-2xl px-4 py-3 text-sm font-arabic text-white/90 outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${GOLD}20`, minHeight: 120 }}
              placeholder="اكتب المحتوى هنا..."
              value={body}
              maxLength={20_000}
              onChange={e => setBody(e.target.value)}
            />
          </div>

          {/* media */}
          <div className="space-y-2">
            <label className="font-arabic text-xs text-white/50">صورة أو مقطع (اختياري)</label>

            {/* file picker from phone */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-arabic"
                style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}30`, color: GOLD }}>
                <Image size={14} />
                اختيار من الهاتف
              </button>
            </div>

            {/* or paste URL */}
            <input
              className="w-full rounded-2xl px-4 py-2.5 text-xs font-arabic text-white/70 outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${GOLD}15` }}
              placeholder="أو الصق رابط الصورة هنا..."
              value={previewing ? "" : mediaUrl}
              onChange={e => { setMediaUrl(e.target.value); setPreviewing(false); }}
            />

            {/* preview */}
            {mediaUrl && (
              <div className="relative rounded-2xl overflow-hidden" style={{ height: 160 }}>
                <img src={mediaUrl} alt="معاينة"
                  className="w-full h-full object-cover"
                  onError={() => { setMediaUrl(""); setPreviewing(false); setError("تعذّر تحميل الصورة"); }}
                />
                <button
                  onClick={() => { setMediaUrl(""); setPreviewing(false); }}
                  className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.7)" }}>
                  <X size={13} color="white" />
                </button>
              </div>
            )}
          </div>

          {/* error */}
          {error && (
            <p className="font-arabic text-red-400 text-xs bg-red-400/10 rounded-xl px-4 py-2.5 border border-red-400/20">
              {error}
            </p>
          )}
        </div>

        {/* submit */}
        <div className="flex-shrink-0 px-5 pb-8 pt-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !body.trim()}
            className="w-full rounded-2xl py-3.5 font-arabic font-bold text-sm flex items-center justify-center gap-2"
            style={{
              background: (submitting || !title.trim() || !body.trim())
                ? "rgba(255,255,255,0.06)"
                : `linear-gradient(135deg, ${GOLD}, #e8c840)`,
              color: (submitting || !title.trim() || !body.trim())
                ? "rgba(255,255,255,0.25)"
                : "#061409",
            }}>
            {submitting
              ? <><Loader2 size={16} className="animate-spin" /> جاري النشر...</>
              : "نشر المحتوى"}
          </motion.button>
        </div>
      </motion.div>
    </>
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
  const [articles,     setArticles]     = useState<Article[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [likes,        setLikes]        = useState<Record<number, boolean>>({});
  const [comments,     setComments]     = useState<Record<number, CommentData[]>>({});
  const [openCard,     setOpenCard]     = useState<number | null>(null);
  const [commentText,  setCommentText]  = useState("");
  const [composeOpen,  setComposeOpen]  = useState(false);
  const [deletingId,   setDeletingId]   = useState<number | null>(null);

  const loadArticles = useCallback(() => {
    return apiFetch("/api/articles")
      .then(r => (r.ok ? r.json() as Promise<Article[]> : Promise.reject()))
      .then(data => setArticles(data.length > 0 ? data : FALLBACK))
      .catch(() => setArticles(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  const toggleLike = useCallback((id: number) => {
    setLikes(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const addComment = useCallback((id: number) => {
    const text = commentText.trim();
    if (!text) return;
    setComments(prev => ({
      ...prev,
      [id]: [...(prev[id] ?? []), { id: Date.now(), text, ts: Date.now() }],
    }));
    setCommentText("");
  }, [commentText]);

  const handleDelete = useCallback(async (id: number) => {
    if (id < 0) return; // fallback items
    setDeletingId(id);
    try {
      const r = await apiFetch(`/api/articles/${id}`, { method: "DELETE" });
      if (r.ok) setArticles(prev => prev.filter(a => a.id !== id));
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handlePublished = useCallback((article: Article) => {
    setArticles(prev => [article, ...prev.filter(a => a.id > 0)]);
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

      {/* ── Scrollable reels ── */}
      <div
        className="h-full overflow-y-scroll"
        style={{
          scrollSnapType:          "y mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth:          "none",
          msOverflowStyle:         "none",
        }}>

        {articles.map((article, idx) => {
          const liked           = !!likes[article.id];
          const articleComments = comments[article.id] ?? [];
          const isCommentOpen   = openCard === article.id;
          const isDeleting      = deletingId === article.id;

          return (
            <div
              key={article.id}
              className="relative flex flex-col overflow-hidden"
              style={{
                height: "100%", scrollSnapAlign: "start", flexShrink: 0,
                background: CARD_BG[idx % CARD_BG.length],
              }}>

              {/* glow overlay */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: CARD_GLOW[idx % CARD_GLOW.length] }} />

              {/* cover image */}
              {article.mediaUrl && (
                <div className="absolute inset-0">
                  <img
                    src={article.mediaUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ opacity: 0.45 }}
                  />
                  <div className="absolute inset-0"
                    style={{ background: "linear-gradient(0deg,rgba(2,14,4,0.92) 0%,rgba(2,14,4,0.35) 60%,rgba(2,14,4,0.55) 100%)" }} />
                </div>
              )}

              {/* category badge */}
              <div className="absolute top-4 right-4 z-10">
                <span className="font-arabic text-[10px] px-3 py-1 rounded-full font-bold"
                  style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}35`, color: GOLD }}>
                  إخباري
                </span>
              </div>

              {/* admin: delete button */}
              {isAdmin && article.id > 0 && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDelete(article.id)}
                  disabled={isDeleting}
                  className="absolute top-4 left-4 z-10 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)" }}>
                  {isDeleting
                    ? <Loader2 size={13} color="rgba(220,38,38,0.7)" className="animate-spin" />
                    : <Trash2   size={13} color="rgba(220,38,38,0.8)" />}
                </motion.button>
              )}

              {/* right action sidebar */}
              <div className="absolute left-3 z-10 flex flex-col items-center gap-5"
                style={{ bottom: isCommentOpen ? "62%" : "120px" }}>

                <motion.button whileTap={{ scale: 1.35 }} onClick={() => toggleLike(article.id)}
                  className="flex flex-col items-center gap-1">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{ background: liked ? `${GOLD}20` : "rgba(255,255,255,0.08)", border: `1px solid ${liked ? GOLD + "55" : "rgba(255,255,255,0.15)"}` }}>
                    <Heart size={20} color={liked ? GOLD : "white"} fill={liked ? GOLD : "none"} />
                  </div>
                  <span className="text-white/60 text-[10px] font-mono">{liked ? 1 : 0}</span>
                </motion.button>

                <motion.button whileTap={{ scale: 1.2 }}
                  onClick={() => setOpenCard(isCommentOpen ? null : article.id)}
                  className="flex flex-col items-center gap-1">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{ background: isCommentOpen ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.08)", border: `1px solid ${isCommentOpen ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.15)"}` }}>
                    <MessageCircle size={20} color={isCommentOpen ? "#60a5fa" : "white"} />
                  </div>
                  <span className="text-white/60 text-[10px] font-mono">{articleComments.length}</span>
                </motion.button>
              </div>

              {/* bottom content overlay */}
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 pt-20 pointer-events-none"
                style={{ background: "linear-gradient(0deg, rgba(2,14,4,0.97) 0%, rgba(2,14,4,0.7) 55%, transparent 100%)" }}
                dir="rtl">
                <h2 className="font-arabic font-bold text-white text-[19px] leading-tight line-clamp-2 mb-2">
                  {article.title}
                </h2>
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
              {idx < articles.length - 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-25 pointer-events-none">
                  <ChevronDown size={16} color="white" />
                </div>
              )}

              {/* comment panel */}
              <AnimatePresence>
                {isCommentOpen && (
                  <motion.div
                    className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl flex flex-col"
                    style={{ background: "rgba(4,16,6,0.98)", backdropFilter: "blur(20px)", border: `1px solid ${GOLD}12`, maxHeight: "60%" }}
                    initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 360, damping: 36 }}>

                    <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
                      style={{ borderColor: `${GOLD}12` }} dir="rtl">
                      <span className="font-arabic text-white/80 text-sm font-bold">
                        التعليقات ({articleComments.length})
                      </span>
                      <button onClick={() => setOpenCard(null)}
                        className="w-7 h-7 rounded-full flex items-center justify-center"
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
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addComment(article.id)}
                      />
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => addComment(article.id)}
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: commentText.trim() ? `linear-gradient(135deg, ${GOLD}, #f0d060)` : "rgba(255,255,255,0.08)" }}>
                        <Send size={15} color={commentText.trim() ? "#001a10" : "rgba(255,255,255,0.35)"} />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ── Admin FAB "+" ── */}
      {isAdmin && (
        <motion.button
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.06 }}
          onClick={() => setComposeOpen(true)}
          className="absolute z-30 flex items-center justify-center rounded-full shadow-2xl"
          style={{
            bottom:  24,
            right:   16,
            width:   52,
            height:  52,
            background: `linear-gradient(135deg, ${GOLD}, #e8c840)`,
            boxShadow: `0 6px 28px ${GOLD}55, 0 2px 8px rgba(0,0,0,0.4)`,
          }}>
          <Plus size={24} color="#061409" strokeWidth={2.5} />
        </motion.button>
      )}

      {/* ── Compose sheet ── */}
      <AnimatePresence>
        {composeOpen && (
          <ComposeSheet
            onClose={() => setComposeOpen(false)}
            onPublished={handlePublished}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
