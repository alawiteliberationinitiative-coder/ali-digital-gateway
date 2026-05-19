import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, BookOpen, Globe, ExternalLink, Search,
  Plus, X, Heart, Share2, Eye, Upload, Type,
  CheckCircle, AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

const GOLD  = "#d4af37";
const GREEN = "#22c55e";
const BLUE  = "#60a5fa";
const ADMIN_IDS = ["6213952907"];

/* ── Types ────────────────────────────────────────────────────────────────── */
interface Article {
  id: number;
  title: string;
  body: string;
  mediaUrl: string | null;
  authorPseudonym: string;
  authorAliId: string | null;
  viewCount: number;
  shareCount: number;
  likeCount: number;
  createdAt: string;
}

/* ── Static official documents ───────────────────────────────────────────── */
const STATIC_DOCS = [
  { id: "s1", icon: BookOpen, accent: GOLD,  category: "ميثاق", title: "الميثاق التأسيسي للمبادرة",       desc: "وثيقة تأسيس مبادرة التحرير العلوي — المبادئ والغايات والآليات.", date: "2024", badge: "رسمي"  },
  { id: "s2", icon: FileText, accent: GREEN, category: "تقرير", title: "تقرير حقوق الإنسان — 2024",       desc: "توثيق منهجي لانتهاكات حقوق الإنسان بحق أبناء الطائفة في الفترة 2020–2024.", date: "2024", badge: "حصري"  },
  { id: "s3", icon: Globe,    accent: BLUE,  category: "دراسة", title: "دراسة الجغرافيا السياسية",        desc: "تحليل معمّق للمشهد الجيوسياسي ومركز الطائفة العلوية في الديناميكيات الإقليمية.", date: "2024", badge: "بحثي"  },
  { id: "s4", icon: FileText, accent: GOLD,  category: "دليل",  title: "دليل استخدام منصة ALI",            desc: "شرح تفصيلي لجميع ميزات المنصة وكيفية المشاركة في أنشطة المبادرة.", date: "2024", badge: "تقني"  },
];

/* ── Report viewer (full-screen) ─────────────────────────────────────────── */
function ReportViewer({ article, onClose, onView }: {
  article: Article;
  onClose: () => void;
  onView: (id: number) => void;
}) {
  const isPdf = !!article.mediaUrl;
  const [iframeReady, setIframeReady] = useState(false);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (!viewedRef.current) {
      viewedRef.current = true;
      onView(article.id);
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [article.id, onView]);

  const openInBrowser = () => {
    if (!article.mediaUrl) return;
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openLink) tg.openLink(article.mediaUrl);
    else window.open(article.mediaUrl, "_blank");
  };

  const viewerSrc = article.mediaUrl
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(article.mediaUrl)}&embedded=true`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#0b0b14" }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)" }}
        dir="rtl">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <X size={17} color="rgba(255,255,255,0.7)" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-arabic font-bold text-sm text-white/90 leading-snug truncate">{article.title}</p>
          <p className="font-arabic text-[10px] mt-0.5" style={{ color: GOLD + "80" }}>
            {article.authorPseudonym} · {new Date(article.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        {isPdf && (
          <button
            onClick={openInBrowser}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-arabic text-[11px] font-bold flex-shrink-0"
            style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}35`, color: GOLD }}>
            <ExternalLink size={11} />
            فتح
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {isPdf ? (
        <div className="flex-1 relative overflow-hidden">
          {!iframeReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
              <div className="w-9 h-9 border-2 rounded-full animate-spin"
                style={{ borderColor: `${GOLD}25`, borderTopColor: GOLD }} />
              <p className="font-arabic text-white/35 text-xs">جاري تحميل الوثيقة...</p>
              <button
                onClick={openInBrowser}
                className="mt-2 px-4 py-2 rounded-full font-arabic text-xs font-bold"
                style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}30`, color: GOLD }}>
                فتح في المتصفح بدلاً من ذلك
              </button>
            </div>
          )}
          <iframe
            key={viewerSrc}
            src={viewerSrc!}
            className="w-full h-full border-0"
            style={{ opacity: iframeReady ? 1 : 0, transition: "opacity 0.3s", background: "#0b0b14" }}
            onLoad={() => setIframeReady(true)}
            title={article.title}
            allow="fullscreen"
          />
        </div>
      ) : (
        /* ── Text article viewer ── */
        <div className="flex-1 overflow-y-auto px-5 py-6" style={{ scrollbarWidth: "none" }} dir="rtl">
          <div className="max-w-prose mx-auto">
            <div className="mb-6">
              <div className="w-12 h-1 rounded-full mb-4" style={{ background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
              <h1 className="font-arabic font-black text-xl text-white/95 leading-relaxed mb-2"
                style={{ textShadow: `0 0 30px ${GOLD}25` }}>
                {article.title}
              </h1>
              <div className="flex items-center gap-2">
                <span className="font-arabic text-[11px]" style={{ color: GOLD + "70" }}>بقلم: {article.authorPseudonym}</span>
                <span className="text-white/15">·</span>
                <span className="font-arabic text-[11px] text-white/35">
                  {new Date(article.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>
            </div>

            <div className="h-px mb-6" style={{ background: `linear-gradient(90deg, ${GOLD}30, transparent)` }} />

            <p className="font-arabic text-white/80 text-[15px] leading-[2.1] whitespace-pre-wrap">
              {article.body}
            </p>

            <div className="mt-10 pt-6 border-t border-white/5 text-center">
              <p className="font-arabic text-white/20 text-[11px]">— نهاية التقرير —</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ── Add report modal (admin only) ───────────────────────────────────────── */
type UploadPhase = "idle" | "uploading" | "done" | "error";
type SubmitPhase = "idle" | "sending" | "done" | "error";

function AddReportModal({ telegramId, onClose, onPublished }: {
  telegramId: string;
  onClose: () => void;
  onPublished: (a: Article) => void;
}) {
  const [mode,        setMode]        = useState<"pdf" | "text">("pdf");
  const [title,       setTitle]       = useState("");
  const [body,        setBody]        = useState("");
  const [file,        setFile]        = useState<File | null>(null);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [progress,    setProgress]    = useState(0);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const [errorMsg,    setErrorMsg]    = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit =
    title.trim().length > 0 &&
    (mode === "pdf" ? uploadPhase === "done" : body.trim().length > 0) &&
    submitPhase !== "sending";

  const uploadFile = useCallback(async (f: File) => {
    setUploadPhase("uploading");
    setProgress(15);
    try {
      const buf = await f.arrayBuffer();
      setProgress(45);
      const res = await apiFetch("/api/articles/upload-media", {
        method: "PUT",
        headers: { "Content-Type": "application/pdf", "x-file-name": f.name },
        body: buf,
        timeoutMs: 120_000,
      });
      setProgress(90);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "فشل الرفع" }));
        throw new Error((err as any).error ?? "فشل الرفع");
      }
      const { publicUrl } = await res.json() as { publicUrl: string };
      setUploadedUrl(publicUrl);
      setUploadPhase("done");
      setProgress(100);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "فشل رفع الملف");
      setUploadPhase("error");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) { setErrorMsg("يرجى اختيار ملف PDF فقط"); setUploadPhase("error"); return; }
    if (f.size > 80_000_000) { setErrorMsg("حجم الملف أكبر من 80 ميجابايت"); setUploadPhase("error"); return; }
    setFile(f);
    setErrorMsg("");
    setUploadPhase("idle");
    uploadFile(f);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitPhase("sending");
    setErrorMsg("");
    try {
      const payload: Record<string, string> = { title: title.trim() };
      if (mode === "pdf" && uploadedUrl) payload.mediaUrl = uploadedUrl;
      if (body.trim()) payload.body = body.trim();
      else payload.body = " ";

      const res = await apiFetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "فشل النشر" }));
        setErrorMsg((err as any).error ?? "فشل النشر");
        setSubmitPhase("error");
        return;
      }
      const article = await res.json() as Article;
      setSubmitPhase("done");
      setTimeout(() => onPublished({ ...article, likeCount: 0, viewCount: 0, shareCount: 0 }), 700);
    } catch {
      setErrorMsg("فشل الاتصال بالخادم");
      setSubmitPhase("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="rounded-t-3xl px-5 pt-4 pb-10 overflow-y-auto"
        style={{ background: "#13121f", border: `1px solid ${GOLD}15`, maxHeight: "92dvh", scrollbarWidth: "none" }}
        dir="rtl"
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "rgba(255,255,255,0.12)" }} />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <p className="font-arabic font-black text-base" style={{ color: GOLD }}>إضافة تقرير / دراسة</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <X size={17} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-2xl p-1 gap-1 mb-5"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}10` }}>
          {(["pdf", "text"] as const).map(m => (
            <button key={m}
              onClick={() => { setMode(m); setErrorMsg(""); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-arabic text-xs font-bold transition-all"
              style={{
                background: mode === m ? `${GOLD}18` : "transparent",
                color: mode === m ? GOLD : "rgba(255,255,255,0.4)",
                border: mode === m ? `1px solid ${GOLD}30` : "1px solid transparent",
              }}>
              {m === "pdf" ? <><Upload size={12} /> ملف PDF</> : <><Type size={12} /> نص مكتوب</>}
            </button>
          ))}
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="font-arabic text-xs text-white/40 block mb-1.5">عنوان التقرير *</label>
          <input
            className="w-full rounded-2xl py-3 px-4 font-arabic text-sm text-white/85 outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${title.trim() ? GOLD + "40" : "rgba(255,255,255,0.08)"}` }}
            placeholder="أدخل عنوان التقرير أو الدراسة..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={200}
          />
        </div>

        {/* PDF upload zone */}
        {mode === "pdf" && (
          <div className="mb-4">
            <label className="font-arabic text-xs text-white/40 block mb-1.5">ملف PDF *</label>
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => { if (uploadPhase !== "uploading") { fileRef.current?.click(); } }}
              disabled={uploadPhase === "uploading"}
              className="w-full py-8 rounded-2xl flex flex-col items-center gap-2.5 transition-all"
              style={{
                background: uploadPhase === "done" ? `${GREEN}07` : "rgba(255,255,255,0.025)",
                border: `2px dashed ${
                  uploadPhase === "done" ? GREEN + "45" :
                  uploadPhase === "error" ? "#ef444445" :
                  uploadPhase === "uploading" ? GOLD + "60" :
                  GOLD + "20"
                }`,
              }}>
              {uploadPhase === "idle" && (
                <> <Upload size={26} color={GOLD + "70"} />
                  <span className="font-arabic text-xs text-white/40">اضغط لاختيار ملف PDF</span>
                  <span className="font-arabic text-[10px] text-white/20">الحد الأقصى 80 ميجابايت</span>
                </>
              )}
              {uploadPhase === "uploading" && (
                <>
                  <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }} />
                  <span className="font-arabic text-xs text-white/50">جاري الرفع... {progress}%</span>
                  <div className="w-36 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: GOLD }} />
                  </div>
                </>
              )}
              {uploadPhase === "done" && (
                <> <CheckCircle size={26} color={GREEN} />
                  <span className="font-arabic text-xs font-bold" style={{ color: GREEN }}>تم رفع الملف بنجاح</span>
                  <span className="font-arabic text-[10px] text-white/30 truncate max-w-[200px]">{file?.name}</span>
                </>
              )}
              {uploadPhase === "error" && (
                <> <AlertCircle size={26} color="#ef4444" />
                  <span className="font-arabic text-xs text-red-400">{errorMsg || "فشل الرفع — اضغط للمحاولة مجدداً"}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Description (optional for PDF, required for text) */}
        <div className="mb-4">
          <label className="font-arabic text-xs text-white/40 block mb-1.5">
            {mode === "text" ? "محتوى التقرير *" : "وصف مختصر (اختياري)"}
          </label>
          <textarea
            className="w-full rounded-2xl py-3 px-4 font-arabic text-sm text-white/85 outline-none resize-none leading-relaxed"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${body.trim() ? GOLD + "40" : "rgba(255,255,255,0.08)"}`,
              minHeight: mode === "text" ? 200 : 90,
            }}
            placeholder={mode === "text" ? "اكتب محتوى التقرير هنا..." : "وصف مختصر للتقرير أو الدراسة..."}
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={mode === "text" ? 20000 : 2000}
            dir="rtl"
          />
          {mode === "text" && (
            <p className="text-left text-[10px] text-white/20 mt-1">{body.length.toLocaleString()} / 20,000</p>
          )}
        </div>

        {/* Submit error */}
        {submitPhase === "error" && errorMsg && (
          <div className="mb-4 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="font-arabic text-sm text-red-400">{errorMsg}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-2xl font-arabic text-sm font-black transition-all active:scale-[0.98]"
          style={{
            background: canSubmit ? `${GOLD}18` : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${canSubmit ? GOLD + "50" : "rgba(255,255,255,0.07)"}`,
            color: canSubmit ? GOLD : "rgba(255,255,255,0.2)",
          }}>
          {submitPhase === "sending" ? "جاري النشر..." :
           submitPhase === "done" ? "✓ تم النشر بنجاح" :
           "نشر التقرير"}
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ── DocCard (static official docs) ──────────────────────────────────────── */
function DocCard({ item }: { item: typeof STATIC_DOCS[number] }) {
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 flex items-start gap-3"
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${item.accent}18` }}
      dir="rtl">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${item.accent}12`, border: `1px solid ${item.accent}30` }}>
        <Icon size={20} color={item.accent} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-arabic font-bold text-white/90 text-sm leading-snug">{item.title}</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
            style={{ background: `${item.accent}18`, border: `1px solid ${item.accent}35`, color: item.accent }}>
            {item.badge}
          </span>
        </div>
        <p className="font-arabic text-white/45 text-xs leading-relaxed line-clamp-2 mb-2">{item.desc}</p>
        <div className="flex items-center justify-between">
          <span className="text-white/25 text-[10px] font-mono">{item.date}</span>
          <button className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-arabic"
            style={{ background: `${item.accent}12`, border: `1px solid ${item.accent}28`, color: item.accent }}>
            <ExternalLink size={10} />
            عرض
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── ArticleCard ──────────────────────────────────────────────────────────── */
function ArticleCard({ article, idx, telegramId, likedByMe, onLikeToggle, onOpen }: {
  article: Article;
  idx: number;
  telegramId: string;
  likedByMe: boolean;
  onLikeToggle: (id: number, liked: boolean, count: number) => void;
  onOpen: (a: Article) => void;
}) {
  const [liked,      setLiked]      = useState(likedByMe);
  const [likeCount,  setLikeCount]  = useState(article.likeCount ?? 0);
  const [shareCount, setShareCount] = useState(article.shareCount ?? 0);
  const [viewCount,  setViewCount]  = useState(article.viewCount ?? 0);
  const [liking,     setLiking]     = useState(false);
  const [sharing,    setSharing]    = useState(false);
  const isPdf = !!article.mediaUrl;

  useEffect(() => { setLiked(likedByMe); }, [likedByMe]);
  useEffect(() => { setLikeCount(article.likeCount ?? 0); }, [article.likeCount]);
  useEffect(() => { setViewCount(article.viewCount ?? 0); }, [article.viewCount]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liking) return;
    setLiking(true);
    const newLiked = !liked;
    const newCount = likeCount + (newLiked ? 1 : -1);
    setLiked(newLiked);
    setLikeCount(newCount);
    try {
      const res = await apiFetch(`/api/articles/${article.id}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json() as { liked: boolean; count: number };
        setLiked(data.liked);
        setLikeCount(data.count);
        onLikeToggle(article.id, data.liked, data.count);
      }
    } catch {
      setLiked(!newLiked);
      setLikeCount(likeCount);
    } finally {
      setLiking(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sharing) return;
    setSharing(true);
    try {
      await apiFetch(`/api/articles/${article.id}/share`, { method: "POST" });
      setShareCount(c => c + 1);
      const shareText = article.body?.trim() ? article.body.slice(0, 150) + "..." : article.title;
      if (navigator.share) {
        await navigator.share({ title: article.title, text: shareText }).catch(() => {});
      } else {
        const tg = (window as any).Telegram?.WebApp;
        tg?.showAlert?.(`📄 ${article.title}`);
      }
    } catch {}
    finally { setTimeout(() => setSharing(false), 1200); }
  };

  const handleOpen = () => {
    setViewCount(c => c + 1);
    onOpen(article);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${isPdf ? BLUE : GOLD}14` }}
      dir="rtl">

      {/* Clickable top area */}
      <button className="w-full text-right" onClick={handleOpen}>
        <div className="flex items-start gap-3 p-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: isPdf ? `${BLUE}12` : `${GOLD}10`, border: `1px solid ${isPdf ? BLUE : GOLD}28` }}>
            <FileText size={18} color={isPdf ? BLUE : GOLD} />
          </div>
          <div className="flex-1 min-w-0">
            {isPdf && (
              <span className="inline-block text-[9px] px-2 py-0.5 rounded-full font-bold mb-1.5"
                style={{ background: `${BLUE}18`, border: `1px solid ${BLUE}30`, color: BLUE }}>
                PDF
              </span>
            )}
            <p className="font-arabic font-bold text-white/90 text-sm leading-snug">{article.title}</p>
            {article.body?.trim() && (
              <p className="font-arabic text-white/45 text-xs leading-relaxed mt-1 line-clamp-2">{article.body}</p>
            )}
            <p className="font-arabic text-white/25 text-[10px] mt-2">
              {article.authorPseudonym}
              {" · "}
              {new Date(article.createdAt).toLocaleDateString("ar-SA", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full"
              style={{ background: isPdf ? `${BLUE}12` : `${GOLD}10`, border: `1px solid ${isPdf ? BLUE : GOLD}28` }}>
              <ExternalLink size={10} color={isPdf ? BLUE : GOLD} />
              <span className="font-arabic text-[10px] font-bold" style={{ color: isPdf ? BLUE : GOLD }}>
                {isPdf ? "عرض" : "قراءة"}
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Stats + action bar */}
      <div className="flex items-center gap-2 px-4 pb-3">
        {/* View count */}
        <div className="flex items-center gap-1 text-white/25">
          <Eye size={11} />
          <span className="font-arabic text-[10px]">{viewCount > 0 ? viewCount.toLocaleString() : "0"}</span>
        </div>

        <div className="flex-1" />

        {/* Like */}
        <button
          onClick={handleLike}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-90"
          style={{
            background: liked ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${liked ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.07)"}`,
          }}>
          <Heart size={12} fill={liked ? "#ef4444" : "none"} color={liked ? "#ef4444" : "rgba(255,255,255,0.3)"} />
          <span className="font-arabic text-[11px]" style={{ color: liked ? "#ef4444" : "rgba(255,255,255,0.35)" }}>
            {likeCount > 0 ? likeCount.toLocaleString() : "إعجاب"}
          </span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-90"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Share2 size={12} color={sharing ? GOLD : "rgba(255,255,255,0.3)"} />
          <span className="font-arabic text-[11px]" style={{ color: sharing ? GOLD : "rgba(255,255,255,0.35)" }}>
            {shareCount > 0 ? shareCount.toLocaleString() : "مشاركة"}
          </span>
        </button>
      </div>
    </motion.div>
  );
}

/* ── Main section ─────────────────────────────────────────────────────────── */
export function ReportsSection({ telegramId, isAdmin: isAdminProp = false }: {
  telegramId: string;
  isAdmin?: boolean;
}) {
  const [articles,  setArticles]  = useState<Article[]>([]);
  const [likedIds,  setLikedIds]  = useState<Set<number>>(new Set());
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState("");
  const [tab,       setTab]       = useState<"official" | "community">("official");
  const [showAdd,   setShowAdd]   = useState(false);
  const [viewer,    setViewer]    = useState<Article | null>(null);
  const [userRole,  setUserRole]  = useState("member");

  const isAdmin = isAdminProp || ADMIN_IDS.includes(telegramId) || userRole === "admin" || userRole === "staff";

  useEffect(() => {
    const init = async () => {
      try {
        const [artRes, likesRes, userRes] = await Promise.all([
          fetch("/api/articles"),
          apiFetch("/api/articles/me/likes"),
          telegramId ? apiFetch("/api/users/me") : Promise.resolve(null),
        ]);
        if (artRes.ok) {
          const data: Article[] = await artRes.json();
          setArticles(data);
        }
        if (likesRes.ok) {
          const { likedIds: ids } = await likesRes.json() as { likedIds: number[] };
          setLikedIds(new Set(ids));
        }
        if (userRes?.ok) {
          const u = await userRes.json();
          setUserRole(u.role ?? "member");
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [telegramId]);

  const handleView = useCallback((id: number) => {
    apiFetch(`/api/articles/${id}/view`, { method: "POST" }).catch(() => {});
    setArticles(prev => prev.map(a => a.id === id ? { ...a, viewCount: a.viewCount + 1 } : a));
  }, []);

  const handleLikeToggle = useCallback((id: number, liked: boolean, count: number) => {
    setLikedIds(prev => {
      const next = new Set(prev);
      if (liked) next.add(id); else next.delete(id);
      return next;
    });
    setArticles(prev => prev.map(a => a.id === id ? { ...a, likeCount: count } : a));
  }, []);

  const handlePublished = useCallback((article: Article) => {
    setArticles(prev => [article, ...prev]);
    setShowAdd(false);
    setTab("community");
  }, []);

  const q = query.toLowerCase();
  const filteredArticles = articles.filter(a =>
    a.title.toLowerCase().includes(q) || (a.body ?? "").toLowerCase().includes(q)
  );

  return (
    <>
      <div className="h-full overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <div className="px-4 pt-4 pb-24 space-y-4" dir="rtl">

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: GOLD + "70" }} />
            <input
              className="w-full rounded-2xl py-2.5 pr-9 pl-4 text-sm font-arabic text-white/70 outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${GOLD}13` }}
              placeholder="ابحث في الوثائق والتقارير..."
              value={query}
              onChange={e => setQuery(e.target.value.toLowerCase())}
            />
          </div>

          {/* Tabs + add button */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex rounded-2xl p-1 gap-1"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}10` }}>
              {(["official", "community"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className="flex-1 py-2 rounded-xl font-arabic text-xs font-bold transition-colors"
                  style={{
                    background: tab === t ? `${GOLD}18` : "transparent",
                    color: tab === t ? GOLD : "rgba(255,255,255,0.4)",
                    border: tab === t ? `1px solid ${GOLD}30` : "1px solid transparent",
                  }}>
                  {t === "official" ? "الوثائق الرسمية" : `تقارير المجتمع (${articles.length})`}
                </button>
              ))}
            </div>

            {/* Admin add button */}
            {isAdmin && (
              <button
                onClick={() => setShowAdd(true)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}35` }}>
                <Plus size={18} color={GOLD} />
              </button>
            )}
          </div>

          {/* Official tab */}
          {tab === "official" && (
            <div className="space-y-3">
              <p className="font-arabic text-white/30 text-xs font-bold tracking-wider">الوثائق والإصدارات الرسمية</p>
              {STATIC_DOCS.map(doc => <DocCard key={doc.id} item={doc} />)}
            </div>
          )}

          {/* Community tab */}
          {tab === "community" && (
            <div className="space-y-3">
              {loading && (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-2 rounded-full animate-spin"
                    style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }} />
                </div>
              )}
              {!loading && filteredArticles.length === 0 && (
                <div className="text-center py-12">
                  <FileText size={32} color="rgba(255,255,255,0.1)" className="mx-auto mb-3" />
                  <p className="font-arabic text-white/30 text-sm">
                    {query ? "لا توجد نتائج مطابقة" : "لا توجد تقارير منشورة بعد"}
                  </p>
                </div>
              )}
              {!loading && filteredArticles.map((a, i) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  idx={i}
                  telegramId={telegramId}
                  likedByMe={likedIds.has(a.id)}
                  onLikeToggle={handleLikeToggle}
                  onOpen={setViewer}
                />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Viewer */}
      <AnimatePresence>
        {viewer && (
          <ReportViewer
            key={viewer.id}
            article={viewer}
            onClose={() => setViewer(null)}
            onView={handleView}
          />
        )}
      </AnimatePresence>

      {/* Add report modal */}
      <AnimatePresence>
        {showAdd && (
          <AddReportModal
            telegramId={telegramId}
            onClose={() => setShowAdd(false)}
            onPublished={handlePublished}
          />
        )}
      </AnimatePresence>
    </>
  );
}
