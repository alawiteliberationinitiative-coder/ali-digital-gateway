import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, ExternalLink, Search, Plus, X, Heart, Share2,
  Eye, Upload, Type, CheckCircle, AlertCircle, FileUp, Shield,
  Trash2, Pencil,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

const GOLD   = "#d4af37";
const GREEN  = "#22c55e";
const BLUE   = "#60a5fa";
const PURPLE = "#a78bfa";
const ADMIN_IDS = ["6213952907"];

// ── فلتر الوسائط: يستثني روابط الفيديو/الصورة من التقارير ──────────────────
// التقارير تُعرض نصوص + PDF فقط — محتوى الريلزات والوسائط لا ينتمي لهذه الواجهة
const MEDIA_URL_RE = /\.(mp4|webm|mov|avi|mkv|m4v|ogv|jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/i;
function isMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return MEDIA_URL_RE.test(url);
}

/* ── Types ── */
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
  isAdar: boolean;
  createdAt: string;
}

/* ══════════════════════════════════════════════════════
   Report Viewer  (ADAR + Community)
══════════════════════════════════════════════════════ */
function ReportViewer({ article, onClose, onView }: {
  article: Article;
  onClose: () => void;
  onView: (id: number) => void;
}) {
  const isPdf       = !!article.mediaUrl;
  const [ready, setReady] = useState(false);
  const viewedRef   = useRef(false);
  const accent      = article.isAdar ? GOLD : PURPLE;

  useEffect(() => {
    if (!viewedRef.current) { viewedRef.current = true; onView(article.id); }
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

  const displayAuthor = article.isAdar ? "منصة ADAR" : article.authorPseudonym;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#0b0b14" }}>

      {/* ── Header ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(12px)" }}
        dir="rtl">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <X size={17} color="rgba(255,255,255,0.7)" />
        </button>

        <div className="flex-1 min-w-0">
          {article.isAdar && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <Shield size={10} color={GOLD} />
              <span className="font-arabic text-[10px] font-bold" style={{ color: GOLD }}>تقرير ADAR الرسمي</span>
            </div>
          )}
          <p className="font-arabic font-bold text-sm text-white/90 leading-snug truncate">{article.title}</p>
          <p className="font-arabic text-[10px] mt-0.5" style={{ color: accent + "80" }}>
            {displayAuthor}
            {" · "}
            {new Date(article.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
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
          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
              <div className="w-9 h-9 border-2 rounded-full animate-spin"
                style={{ borderColor: `${GOLD}25`, borderTopColor: GOLD }} />
              <p className="font-arabic text-white/35 text-xs">جاري تحميل الوثيقة...</p>
              <button
                onClick={openInBrowser}
                className="mt-2 px-4 py-2 rounded-full font-arabic text-xs font-bold"
                style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}30`, color: GOLD }}>
                فتح في المتصفح
              </button>
            </div>
          )}
          <iframe
            key={viewerSrc}
            src={viewerSrc!}
            className="w-full h-full border-0"
            style={{ opacity: ready ? 1 : 0, transition: "opacity 0.3s" }}
            onLoad={() => setReady(true)}
            title={article.title}
            allow="fullscreen"
          />
        </div>
      ) : (
        /* ── Text viewer ── */
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }} dir="rtl">
          <div className="px-5 py-7" style={{ maxWidth: 680, margin: "0 auto" }}>

            {/* ADAR copyright banner */}
            {article.isAdar && (
              <div
                className="mb-6 px-4 py-3 rounded-2xl flex items-center gap-3"
                style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}20` }}>
                <Shield size={16} color={GOLD} />
                <div>
                  <p className="font-arabic text-[11px] font-bold" style={{ color: GOLD }}>
                    منصة ADAR — الإصدار الرسمي
                  </p>
                  <p className="font-arabic text-[10px] text-white/35 mt-0.5">
                    جميع حقوق النشر محفوظة © ADAR {new Date().getFullYear()}
                  </p>
                </div>
              </div>
            )}

            {/* Title block */}
            <div className="mb-6">
              <div className="w-14 h-[3px] rounded-full mb-5"
                style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
              <h1
                className="font-arabic font-black leading-relaxed mb-3 text-white/95"
                style={{ fontSize: "21px", textShadow: `0 0 30px ${accent}25` }}>
                {article.title}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-arabic text-[11px]" style={{ color: accent + "90" }}>
                  {article.isAdar ? "🏛️ منصة ADAR" : `✍️ ${article.authorPseudonym}`}
                </span>
                <span className="text-white/15">·</span>
                <span className="font-arabic text-[11px] text-white/35">
                  {new Date(article.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>
            </div>

            <div className="h-px mb-7"
              style={{ background: `linear-gradient(90deg, ${accent}30, transparent)` }} />

            {/* Body text */}
            {article.isAdar ? (
              /* ADAR: clean readable text */
              <div
                className="font-arabic"
                style={{ color: "rgba(255,255,255,0.82)", fontSize: "15px", lineHeight: "2.15", whiteSpace: "pre-wrap" }}>
                {article.body}
              </div>
            ) : (
              /* Community: kashida justified document style */
              <div className="font-arabic" style={{ color: "rgba(255,255,255,0.88)" }}>
                {article.body.split(/\n\n+/).map((para, i) => (
                  <p
                    key={i}
                    style={{
                      fontSize: "17px",
                      lineHeight: "2.4",
                      marginBottom: "1.5em",
                      textAlign: "justify",
                      textJustify: "kashida" as React.CSSProperties["textJustify"],
                      wordSpacing: "0px",
                    }}>
                    {para.split(/\n/).map((line, j, arr) => (
                      <span key={j}>{line}{j < arr.length - 1 ? <br /> : null}</span>
                    ))}
                  </p>
                ))}
              </div>
            )}

            {/* Footer */}
            {article.isAdar ? (
              /* ── ختام تقارير مجتمع ADAR — تذييل مميز ── */
              <div className="mt-12 pt-8 text-center space-y-3"
                style={{ borderTop: "1px solid rgba(212,175,55,0.18)" }}>
                {/* فاصل ذهبي مع نجمة */}
                <div className="flex items-center justify-center gap-3">
                  <div className="h-px flex-1" style={{ background: "linear-gradient(to left, rgba(212,175,55,0.35), transparent)" }} />
                  <span style={{ color: GOLD, fontSize: "11px", opacity: 0.7 }}>✦</span>
                  <div className="h-px flex-1" style={{ background: "linear-gradient(to right, rgba(212,175,55,0.35), transparent)" }} />
                </div>
                <p className="font-arabic text-[11px] tracking-widest" style={{ color: GOLD + "70" }}>
                  — نهاية التقرير —
                </p>
                <p className="font-arabic font-bold text-[13px]" style={{ color: GOLD + "cc" }}>
                  حقوق النشر محفوظة — ADAR —
                </p>
                <p className="font-mono text-[10px] tracking-wide" style={{ color: GOLD + "88" }}>
                  Alawite Digital Archive &amp; Research
                </p>
              </div>
            ) : (
              /* ── ختام التقارير العامة ── */
              <div className="mt-12 pt-6 text-center space-y-1"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="font-arabic text-white/20 text-[11px]">— نهاية التقرير —</p>
                <p className="font-arabic text-white/20 text-[10px]">نُشر عبر منصة A.L.I Digital Gateway</p>
                <p className="font-mono text-[9px]" style={{ color: PURPLE + "55" }}>
                  Alawite Liberation Initiative — Digital Gateway
                </p>
                <p className="font-arabic text-[10px]" style={{ color: PURPLE + "55" }}>
                  الناشر: {article.authorPseudonym}
                </p>
              </div>
            )}

          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════
   Add ADAR Report Modal  (admin only)
══════════════════════════════════════════════════════ */
type UploadPhase = "idle" | "uploading" | "done" | "error";
type SubmitPhase = "idle" | "sending" | "done" | "error";

function AddAdarReportModal({ onClose, onPublished }: {
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
    setFile(f); setErrorMsg(""); setUploadPhase("idle");
    uploadFile(f);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitPhase("sending"); setErrorMsg("");
    try {
      const payload: Record<string, string> = { title: title.trim(), category: "adar" };
      if (mode === "pdf" && uploadedUrl) payload.mediaUrl = uploadedUrl;
      payload.body = body.trim() || " ";
      const res = await apiFetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "فشل النشر" }));
        setErrorMsg((err as any).error ?? "فشل النشر"); setSubmitPhase("error"); return;
      }
      const article = await res.json() as Article;
      setSubmitPhase("done");
      setTimeout(() => onPublished({ ...article, isAdar: true, likeCount: 0, viewCount: 0, shareCount: 0 }), 700);
    } catch {
      setErrorMsg("فشل الاتصال بالخادم"); setSubmitPhase("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="rounded-t-3xl px-5 pt-4 pb-10 overflow-y-auto"
        style={{ background: "#13121f", border: `1px solid ${GOLD}18`, maxHeight: "92dvh", scrollbarWidth: "none" } as React.CSSProperties}
        dir="rtl" onClick={e => e.stopPropagation()}>

        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "rgba(255,255,255,0.12)" }} />

        {/* ADAR badge */}
        <div className="flex items-center justify-center gap-2 mb-1 px-4 py-2 rounded-2xl mx-auto w-fit"
          style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}28` }}>
          <Shield size={13} color={GOLD} />
          <span className="font-arabic text-xs font-bold" style={{ color: GOLD }}>نشر تقرير ADAR الرسمي</span>
        </div>

        <div className="flex items-center justify-between mb-5 mt-3">
          <p className="font-arabic text-white/35 text-xs">سيُنشر باسم: منصة ADAR · حقوق النشر محفوظة</p>
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
            placeholder="عنوان التقرير أو الدراسة..."
            value={title} onChange={e => setTitle(e.target.value)} maxLength={200} />
        </div>

        {/* PDF upload */}
        {mode === "pdf" && (
          <div className="mb-4">
            <label className="font-arabic text-xs text-white/40 block mb-1.5">ملف PDF *</label>
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => { if (uploadPhase !== "uploading") fileRef.current?.click(); }}
              disabled={uploadPhase === "uploading"}
              className="w-full py-8 rounded-2xl flex flex-col items-center gap-2.5 transition-all"
              style={{
                background: uploadPhase === "done" ? `${GREEN}07` : "rgba(255,255,255,0.025)",
                border: `2px dashed ${uploadPhase === "done" ? GREEN + "45" : uploadPhase === "error" ? "#ef444445" : uploadPhase === "uploading" ? GOLD + "60" : GOLD + "20"}`,
              }}>
              {uploadPhase === "idle" && (
                <><Upload size={26} color={GOLD + "70"} />
                  <span className="font-arabic text-xs text-white/40">اضغط لاختيار ملف PDF</span>
                  <span className="font-arabic text-[10px] text-white/20">الحد الأقصى 80 ميجابايت</span></>
              )}
              {uploadPhase === "uploading" && (
                <><div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }} />
                  <span className="font-arabic text-xs text-white/50">جاري الرفع... {progress}%</span>
                  <div className="w-36 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: GOLD }} />
                  </div></>
              )}
              {uploadPhase === "done" && (
                <><CheckCircle size={26} color={GREEN} />
                  <span className="font-arabic text-xs font-bold" style={{ color: GREEN }}>تم رفع الملف بنجاح</span>
                  <span className="font-arabic text-[10px] text-white/30 truncate max-w-[200px]">{file?.name}</span></>
              )}
              {uploadPhase === "error" && (
                <><AlertCircle size={26} color="#ef4444" />
                  <span className="font-arabic text-xs text-red-400">{errorMsg || "فشل الرفع — اضغط للمحاولة"}</span></>
              )}
            </button>
          </div>
        )}

        {/* Body */}
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
            placeholder={mode === "text" ? "اكتب محتوى التقرير هنا..." : "وصف مختصر للتقرير..."}
            value={body} onChange={e => setBody(e.target.value)} maxLength={20000} dir="rtl" />
          {mode === "text" && (
            <p className="text-left text-[10px] text-white/20 mt-1">{body.length.toLocaleString()} / 20,000</p>
          )}
        </div>

        {submitPhase === "error" && errorMsg && (
          <div className="mb-4 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="font-arabic text-sm text-red-400">{errorMsg}</p>
          </div>
        )}

        <button onClick={handleSubmit} disabled={!canSubmit}
          className="w-full py-3.5 rounded-2xl font-arabic text-sm font-black transition-all active:scale-[0.98]"
          style={{
            background: canSubmit ? `${GOLD}18` : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${canSubmit ? GOLD + "50" : "rgba(255,255,255,0.07)"}`,
            color: canSubmit ? GOLD : "rgba(255,255,255,0.2)",
          }}>
          {submitPhase === "sending" ? "جاري النشر..." : submitPhase === "done" ? "✓ تم النشر" : "نشر تقرير ADAR"}
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════
   Add Community Report Modal  (all users)
══════════════════════════════════════════════════════ */
function AddCommunityReportModal({ onClose, onPublished }: {
  onClose: () => void;
  onPublished: (a: Article) => void;
}) {
  const [publisherName, setPublisherName] = useState("");
  const [title,         setTitle]         = useState("");
  const [body,          setBody]          = useState("");
  const [submitPhase,   setSubmitPhase]   = useState<SubmitPhase>("idle");
  const [errorMsg,      setErrorMsg]      = useState("");
  const txtRef = useRef<HTMLInputElement>(null);

  const canSubmit =
    publisherName.trim().length > 0 &&
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    submitPhase !== "sending";

  const handleTxtFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = (ev.target?.result as string) ?? "";
      setBody(prev => (prev ? prev + "\n\n" : "") + text.trim());
    };
    reader.readAsText(f, "utf-8");
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitPhase("sending"); setErrorMsg("");
    try {
      const res = await apiFetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          publisherName: publisherName.trim(),
          category: "community",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "فشل النشر" }));
        setErrorMsg((err as any).error ?? "فشل النشر"); setSubmitPhase("error"); return;
      }
      const article = await res.json() as Article;
      setSubmitPhase("done");
      setTimeout(() => onPublished({ ...article, isAdar: false, likeCount: 0, viewCount: 0, shareCount: 0 }), 700);
    } catch {
      setErrorMsg("فشل الاتصال بالخادم"); setSubmitPhase("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="rounded-t-3xl px-5 pt-4 pb-10 overflow-y-auto"
        style={{ background: "#13121f", border: `1px solid ${PURPLE}18`, maxHeight: "92dvh", scrollbarWidth: "none" } as React.CSSProperties}
        dir="rtl" onClick={e => e.stopPropagation()}>

        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "rgba(255,255,255,0.12)" }} />

        <div className="flex items-center justify-between mb-5">
          <p className="font-arabic font-black text-base" style={{ color: PURPLE }}>نشر في تقارير المجتمع</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <X size={17} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        {/* Publisher name */}
        <div className="mb-4">
          <label className="font-arabic text-xs text-white/40 block mb-1.5">اسم الناشر *</label>
          <input
            className="w-full rounded-2xl py-3 px-4 font-arabic text-sm text-white/85 outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${publisherName.trim() ? PURPLE + "45" : "rgba(255,255,255,0.08)"}` }}
            placeholder="اكتب اسمك أو اسم جهتك الناشرة..."
            value={publisherName} onChange={e => setPublisherName(e.target.value)} maxLength={100} />
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="font-arabic text-xs text-white/40 block mb-1.5">عنوان التقرير *</label>
          <input
            className="w-full rounded-2xl py-3 px-4 font-arabic text-sm text-white/85 outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${title.trim() ? PURPLE + "45" : "rgba(255,255,255,0.08)"}` }}
            placeholder="عنوان التقرير أو الدراسة..."
            value={title} onChange={e => setTitle(e.target.value)} maxLength={200} />
        </div>

        {/* Body */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-arabic text-xs text-white/40">محتوى التقرير *</label>
            <input ref={txtRef} type="file" accept=".txt,text/plain" className="hidden" onChange={handleTxtFile} />
            <button
              onClick={() => txtRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full font-arabic text-[10px] transition-all active:scale-90"
              style={{ background: `${PURPLE}12`, border: `1px solid ${PURPLE}28`, color: PURPLE }}>
              <FileUp size={10} />
              استيراد .txt
            </button>
          </div>
          <textarea
            className="w-full rounded-2xl py-3 px-4 font-arabic text-sm text-white/85 outline-none resize-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${body.trim() ? PURPLE + "45" : "rgba(255,255,255,0.08)"}`,
              minHeight: 240,
              lineHeight: "2.1",
            }}
            placeholder="اكتب محتوى تقريرك هنا، أو استورد نصاً من ملف .txt..."
            value={body} onChange={e => setBody(e.target.value)} maxLength={50000} dir="rtl" />
          <p className="text-left text-[10px] text-white/20 mt-1">{body.length.toLocaleString()} / 50,000</p>
        </div>

        {submitPhase === "error" && errorMsg && (
          <div className="mb-4 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="font-arabic text-sm text-red-400">{errorMsg}</p>
          </div>
        )}

        <button onClick={handleSubmit} disabled={!canSubmit}
          className="w-full py-3.5 rounded-2xl font-arabic text-sm font-black transition-all active:scale-[0.98]"
          style={{
            background: canSubmit ? `${PURPLE}18` : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${canSubmit ? PURPLE + "50" : "rgba(255,255,255,0.07)"}`,
            color: canSubmit ? PURPLE : "rgba(255,255,255,0.2)",
          }}>
          {submitPhase === "sending" ? "جاري النشر..." : submitPhase === "done" ? "✓ تم النشر في المجتمع" : "نشر في المجتمع"}
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════
   Article Card
══════════════════════════════════════════════════════ */
function ArticleCard({ article, idx, likedByMe, onLikeToggle, onOpen, isAdmin, onDelete, onEdit }: {
  article: Article;
  idx: number;
  likedByMe: boolean;
  onLikeToggle: (id: number, liked: boolean, count: number) => void;
  onOpen: (a: Article) => void;
  isAdmin?: boolean;
  onDelete?: (id: number) => void;
  onEdit?: (a: Article) => void;
}) {
  const [liked,      setLiked]      = useState(likedByMe);
  const [likeCount,  setLikeCount]  = useState(article.likeCount ?? 0);
  const [shareCount, setShareCount] = useState(article.shareCount ?? 0);
  const [viewCount,  setViewCount]  = useState(article.viewCount ?? 0);
  const [liking,     setLiking]     = useState(false);
  const [sharing,    setSharing]    = useState(false);

  const isPdf   = !!article.mediaUrl;
  const accent  = article.isAdar ? GOLD : PURPLE;
  const badgeLabel = article.isAdar ? "ADAR" : "مجتمع";

  useEffect(() => { setLiked(likedByMe); }, [likedByMe]);
  useEffect(() => { setLikeCount(article.likeCount ?? 0); }, [article.likeCount]);
  useEffect(() => { setViewCount(article.viewCount ?? 0); }, [article.viewCount]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liking) return;
    setLiking(true);
    const newLiked = !liked;
    setLiked(newLiked); setLikeCount(c => c + (newLiked ? 1 : -1));
    try {
      const res = await apiFetch(`/api/articles/${article.id}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json() as { liked: boolean; count: number };
        setLiked(data.liked); setLikeCount(data.count);
        onLikeToggle(article.id, data.liked, data.count);
      }
    } catch {
      setLiked(!newLiked); setLikeCount(likeCount);
    } finally { setLiking(false); }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sharing) return;
    setSharing(true);
    try {
      await apiFetch(`/api/articles/${article.id}/share`, { method: "POST" });
      setShareCount(c => c + 1);
      const shareText = article.body?.trim() ? article.body.slice(0, 150) + "..." : article.title;
      // رابط عميق يفتح التطبيق مباشرةً داخل تيليغرام
      const tgLink = "https://t.me/ALI_MDD_BOT/app";
      if (navigator.share) {
        await navigator.share({ title: article.title, text: shareText, url: tgLink }).catch(() => {});
      } else {
        // fallback: مشاركة عبر Telegram Mini App API
        const tg = (window as any).Telegram?.WebApp;
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(tgLink)}&text=${encodeURIComponent(`📄 ${article.title}\n\n${shareText}`)}`;
        if (tg?.openTelegramLink) tg.openTelegramLink(shareUrl);
        else if (tg?.openLink) tg.openLink(shareUrl);
      }
    } catch {}
    finally { setTimeout(() => setSharing(false), 1200); }
  };

  const handleOpen = () => { setViewCount(c => c + 1); onOpen(article); };

  const displayAuthor = article.isAdar ? "منصة ADAR" : article.authorPseudonym;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${accent}14` }}
      dir="rtl">

      <button className="w-full text-right" onClick={handleOpen}>
        <div className="flex items-start gap-3 p-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: `${accent}12`, border: `1px solid ${accent}28` }}>
            {article.isAdar ? <Shield size={18} color={accent} /> : <FileText size={18} color={accent} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span
                className="inline-block text-[9px] px-2 py-0.5 rounded-full font-bold"
                style={{ background: `${accent}18`, border: `1px solid ${accent}30`, color: accent }}>
                {badgeLabel}
              </span>
              {isPdf && (
                <span
                  className="inline-block text-[9px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: `${BLUE}18`, border: `1px solid ${BLUE}30`, color: BLUE }}>
                  PDF
                </span>
              )}
            </div>
            <p className="font-arabic font-bold text-white/90 text-sm leading-snug">{article.title}</p>
            {article.body?.trim() && !article.mediaUrl && (
              <p className="font-arabic text-white/45 text-xs leading-relaxed mt-1 line-clamp-2">{article.body}</p>
            )}
            <p className="font-arabic text-white/25 text-[10px] mt-2">
              {displayAuthor}
              {" · "}
              {new Date(article.createdAt).toLocaleDateString("ar-SA", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full"
              style={{ background: `${accent}10`, border: `1px solid ${accent}28` }}>
              <ExternalLink size={10} color={accent} />
              <span className="font-arabic text-[10px] font-bold" style={{ color: accent }}>
                {isPdf ? "عرض" : "قراءة"}
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Stats bar */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <div className="flex items-center gap-1 text-white/25">
          <Eye size={11} />
          <span className="font-arabic text-[10px]">{viewCount > 0 ? viewCount.toLocaleString() : "0"}</span>
        </div>
        <div className="flex-1" />
        <button onClick={handleLike}
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
        <button onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-90"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Share2 size={12} color={sharing ? accent : "rgba(255,255,255,0.3)"} />
          <span className="font-arabic text-[11px]" style={{ color: sharing ? accent : "rgba(255,255,255,0.35)" }}>
            {shareCount > 0 ? shareCount.toLocaleString() : "مشاركة"}
          </span>
        </button>
      </div>

      {/* Admin action bar — تظهر فقط للمشرفين */}
      {isAdmin && (
        <div className="flex items-center gap-2 px-4 pb-3 pt-0 border-t border-white/[0.06]">
          <div className="flex items-center gap-1 flex-shrink-0">
            <Shield size={9} color="rgba(239,68,68,0.55)" />
            <span className="font-arabic text-[9px]" style={{ color: "rgba(239,68,68,0.45)" }}>إدارة</span>
          </div>
          <div className="flex-1" />
          {/* زر التعديل */}
          {!article.mediaUrl && (
            <button
              onClick={e => { e.stopPropagation(); onEdit?.(article); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-90"
              style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.22)" }}>
              <Pencil size={11} color="#60a5fa" />
              <span className="font-arabic text-[11px]" style={{ color: "#60a5fa" }}>تعديل</span>
            </button>
          )}
          {/* زر الحذف */}
          <button
            onClick={e => { e.stopPropagation(); onDelete?.(article.id); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-90"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)" }}>
            <Trash2 size={11} color="#ef4444" />
            <span className="font-arabic text-[11px]" style={{ color: "#ef4444" }}>حذف</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════
   Empty State
══════════════════════════════════════════════════════ */
function EmptyState({ label, isAdar }: { label: string; isAdar: boolean }) {
  const accent = isAdar ? GOLD : PURPLE;
  return (
    <div className="text-center py-14">
      {isAdar
        ? <Shield size={32} color={accent + "30"} className="mx-auto mb-3" />
        : <FileText size={32} color={accent + "30"} className="mx-auto mb-3" />}
      <p className="font-arabic text-white/30 text-sm">{label}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Edit Report Modal  (admin only)
══════════════════════════════════════════════════════ */
function EditReportModal({ article, onClose, onSaved }: {
  article: Article;
  onClose: () => void;
  onSaved: (updated: Article) => void;
}) {
  const [title,   setTitle]   = useState(article.title);
  const [body,    setBody]    = useState(article.body ?? "");
  const [phase,   setPhase]   = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errMsg,  setErrMsg]  = useState("");
  const accent = article.isAdar ? GOLD : PURPLE;

  const canSave =
    phase !== "saving" &&
    title.trim().length > 0 &&
    (title.trim() !== article.title || body.trim() !== (article.body ?? "").trim());

  const handleSave = async () => {
    if (!canSave) return;
    setPhase("saving"); setErrMsg("");
    try {
      const res = await apiFetch(`/api/admin/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(e.error ?? "فشل الحفظ");
      }
      setPhase("done");
      setTimeout(() => onSaved({ ...article, title: title.trim(), body: body.trim() }), 400);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "فشل الاتصال");
      setPhase("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="rounded-t-3xl px-5 pt-4 pb-10 overflow-y-auto"
        style={{ background: "#13121f", border: `1px solid ${accent}18`, maxHeight: "90dvh", scrollbarWidth: "none" } as React.CSSProperties}
        dir="rtl" onClick={e => e.stopPropagation()}>

        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "rgba(255,255,255,0.12)" }} />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)" }}>
              <Pencil size={13} color="#60a5fa" />
            </div>
            <span className="font-arabic font-bold text-sm text-white/80">تعديل التقرير</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <X size={17} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        {/* Badge */}
        <div className="flex items-center gap-1.5 mb-5 px-3 py-1.5 rounded-xl w-fit"
          style={{ background: `${accent}10`, border: `1px solid ${accent}25` }}>
          {article.isAdar ? <Shield size={11} color={accent} /> : <FileText size={11} color={accent} />}
          <span className="font-arabic text-[11px] font-bold" style={{ color: accent }}>
            {article.isAdar ? "تقرير ADAR" : "تقرير مجتمعي"}
          </span>
        </div>

        {/* Title field */}
        <div className="mb-4">
          <label className="font-arabic text-xs text-white/40 block mb-1.5">عنوان التقرير *</label>
          <input
            className="w-full rounded-2xl py-3 px-4 font-arabic text-sm text-white/85 outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${title.trim() ? accent + "40" : "rgba(255,255,255,0.08)"}`,
            }}
            value={title} onChange={e => setTitle(e.target.value)}
            maxLength={300} placeholder="عنوان التقرير..." />
        </div>

        {/* Body field */}
        <div className="mb-5">
          <label className="font-arabic text-xs text-white/40 block mb-1.5">محتوى التقرير</label>
          <textarea
            className="w-full rounded-2xl py-3 px-4 font-arabic text-sm text-white/85 outline-none resize-none leading-relaxed"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${body.trim() ? accent + "40" : "rgba(255,255,255,0.08)"}`,
              minHeight: 160,
            }}
            value={body} onChange={e => setBody(e.target.value)}
            maxLength={50000} placeholder="محتوى التقرير..." dir="rtl" />
          <p className="text-left text-[10px] text-white/20 mt-1">{body.length.toLocaleString()} / 50,000</p>
        </div>

        {phase === "error" && errMsg && (
          <div className="mb-4 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="font-arabic text-sm text-red-400">{errMsg}</p>
          </div>
        )}

        <button onClick={handleSave} disabled={!canSave}
          className="w-full py-3.5 rounded-2xl font-arabic text-sm font-black transition-all active:scale-[0.98]"
          style={{
            background: canSave ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${canSave ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.07)"}`,
            color: canSave ? "#60a5fa" : "rgba(255,255,255,0.2)",
          }}>
          {phase === "saving" ? "جاري الحفظ..." : phase === "done" ? "✓ تم الحفظ" : "حفظ التعديلات"}
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════
   Main Section
══════════════════════════════════════════════════════ */
export function ReportsSection({ telegramId, isAdmin: isAdminProp = false }: {
  telegramId: string;
  isAdmin?: boolean;
}) {
  const [articles,        setArticles]        = useState<Article[]>([]);
  const [likedIds,        setLikedIds]        = useState<Set<number>>(new Set());
  const [loading,         setLoading]         = useState(true);
  const [query,           setQuery]           = useState("");
  const [tab,             setTab]             = useState<"adar" | "community">("adar");
  const [showAddAdar,     setShowAddAdar]     = useState(false);
  const [showAddCommunity,setShowAddCommunity]= useState(false);
  const [viewer,          setViewer]          = useState<Article | null>(null);
  const [userRole,        setUserRole]        = useState("member");
  const [editingArticle,  setEditingArticle]  = useState<Article | null>(null);
  const [deletingId,      setDeletingId]      = useState<number | null>(null);
  const [deleteConfirm,   setDeleteConfirm]   = useState<number | null>(null);

  const isAdmin = isAdminProp || ADMIN_IDS.includes(telegramId) || userRole === "admin" || userRole === "staff";

  useEffect(() => {
    const init = async () => {
      try {
        const [artRes, likesRes, userRes] = await Promise.all([
          fetch("/api/articles"),
          apiFetch("/api/articles/me/likes"),
          telegramId ? apiFetch("/api/users/me") : Promise.resolve(null),
        ]);
        if (artRes.ok) setArticles(await artRes.json());
        if (likesRes.ok) {
          const { likedIds: ids } = await likesRes.json() as { likedIds: number[] };
          setLikedIds(new Set(ids));
        }
        if (userRes?.ok) {
          const u = await userRes.json();
          setUserRole(u.role ?? "member");
        }
      } finally { setLoading(false); }
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

  const handleAdarPublished = useCallback((article: Article) => {
    setArticles(prev => [article, ...prev]);
    setShowAddAdar(false);
    setTab("adar");
  }, []);

  const handleCommunityPublished = useCallback((article: Article) => {
    setArticles(prev => [article, ...prev]);
    setShowAddCommunity(false);
    setTab("community");
  }, []);

  const handleDeleteRequest = useCallback((id: number) => {
    setDeleteConfirm(id);
  }, []);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm;
    setDeleteConfirm(null);
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/admin/articles/${id}`, { method: "DELETE" });
      if (res.ok) setArticles(prev => prev.filter(a => a.id !== id));
    } catch {}
    finally { setDeletingId(null); }
  }, [deleteConfirm]);

  const handleArticleSaved = useCallback((updated: Article) => {
    setArticles(prev => prev.map(a => a.id === updated.id ? updated : a));
    setEditingArticle(null);
  }, []);

  const q = query.toLowerCase();
  // استثناء محتوى الريلزات (فيديو/صور) — التقارير للنصوص والـ PDF فقط
  const adarArticles      = articles.filter(a =>  a.isAdar && !isMediaUrl(a.mediaUrl));
  const communityArticles = articles.filter(a => !a.isAdar && !isMediaUrl(a.mediaUrl));
  const filteredAdar      = adarArticles.filter(a => a.title.toLowerCase().includes(q) || (a.body ?? "").toLowerCase().includes(q));
  const filteredCommunity = communityArticles.filter(a => a.title.toLowerCase().includes(q) || (a.body ?? "").toLowerCase().includes(q));

  const tabs = [
    { key: "adar"      as const, label: "تقارير ADAR",     count: adarArticles.length      },
    { key: "community" as const, label: "تقارير المجتمع",  count: communityArticles.length },
  ];

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
              placeholder="ابحث في التقارير..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          {/* Tabs + action buttons */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex rounded-2xl p-1 gap-1"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}10` }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="flex-1 py-2 rounded-xl font-arabic text-xs font-bold transition-colors"
                  style={{
                    background: tab === t.key ? (t.key === "adar" ? `${GOLD}18` : `${PURPLE}18`) : "transparent",
                    color: tab === t.key ? (t.key === "adar" ? GOLD : PURPLE) : "rgba(255,255,255,0.4)",
                    border: tab === t.key ? `1px solid ${(t.key === "adar" ? GOLD : PURPLE)}30` : "1px solid transparent",
                  }}>
                  {t.label}
                  {t.key !== "adar" && t.count > 0 && (
                    <span className="mr-1 opacity-60 text-[10px]">({t.count})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Add button: ADAR tab → admin only; Community tab → all users */}
            {tab === "adar" && isAdmin && (
              <button
                onClick={() => setShowAddAdar(true)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}35` }}>
                <Plus size={18} color={GOLD} />
              </button>
            )}
            {tab === "community" && (
              <button
                onClick={() => setShowAddCommunity(true)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                style={{ background: `${PURPLE}15`, border: `1px solid ${PURPLE}35` }}>
                <Plus size={18} color={PURPLE} />
              </button>
            )}
          </div>

          {/* ADAR tab */}
          {tab === "adar" && (
            <div className="space-y-3">
              {/* Platform header */}
              <div className="flex items-center gap-2 px-1">
                <Shield size={12} color={GOLD + "80"} />
                <p className="font-arabic text-white/30 text-xs font-bold tracking-wider">
                  الإصدارات والتقارير الرسمية لمنصة ADAR
                </p>
              </div>
              {loading && (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-2 rounded-full animate-spin"
                    style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }} />
                </div>
              )}
              {!loading && filteredAdar.length === 0 && (
                <EmptyState
                  label={query ? "لا توجد نتائج مطابقة" : "لا توجد تقارير ADAR بعد"}
                  isAdar={true}
                />
              )}
              {!loading && filteredAdar.map((a, i) => (
                <ArticleCard
                  key={a.id} article={a} idx={i}
                  likedByMe={likedIds.has(a.id)}
                  onLikeToggle={handleLikeToggle}
                  onOpen={setViewer}
                  isAdmin={isAdmin}
                  onDelete={handleDeleteRequest}
                  onEdit={setEditingArticle}
                />
              ))}
            </div>
          )}

          {/* Community tab */}
          {tab === "community" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <FileText size={12} color={PURPLE + "80"} />
                <p className="font-arabic text-white/30 text-xs leading-relaxed">
                  آراء ومنشورات من أبناء المجتمع العلوي حول كل ما يتعلق بالقضية العلوية من مختلف المجالات والجوانب
                </p>
              </div>
              {loading && (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-2 rounded-full animate-spin"
                    style={{ borderColor: `${PURPLE}30`, borderTopColor: PURPLE }} />
                </div>
              )}
              {!loading && filteredCommunity.length === 0 && (
                <EmptyState
                  label={query ? "لا توجد نتائج مطابقة" : "لا توجد تقارير مجتمعية بعد — كن أول من ينشر"}
                  isAdar={false}
                />
              )}
              {!loading && filteredCommunity.map((a, i) => (
                <ArticleCard
                  key={a.id} article={a} idx={i}
                  likedByMe={likedIds.has(a.id)}
                  onLikeToggle={handleLikeToggle}
                  onOpen={setViewer}
                  isAdmin={isAdmin}
                  onDelete={handleDeleteRequest}
                  onEdit={setEditingArticle}
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

      {/* ADAR modal */}
      <AnimatePresence>
        {showAddAdar && (
          <AddAdarReportModal
            onClose={() => setShowAddAdar(false)}
            onPublished={handleAdarPublished}
          />
        )}
      </AnimatePresence>

      {/* Community modal */}
      <AnimatePresence>
        {showAddCommunity && (
          <AddCommunityReportModal
            onClose={() => setShowAddCommunity(false)}
            onPublished={handleCommunityPublished}
          />
        )}
      </AnimatePresence>

      {/* Edit report modal */}
      <AnimatePresence>
        {editingArticle && (
          <EditReportModal
            key={editingArticle.id}
            article={editingArticle}
            onClose={() => setEditingArticle(null)}
            onSaved={handleArticleSaved}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center pb-10 px-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setDeleteConfirm(null)}>
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="w-full max-w-sm rounded-3xl p-6 text-center"
              style={{ background: "#13121f", border: "1px solid rgba(239,68,68,0.22)" }}
              dir="rtl" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <Trash2 size={22} color="#ef4444" />
              </div>
              <p className="font-arabic font-bold text-white/85 text-base mb-2">حذف التقرير</p>
              <p className="font-arabic text-white/40 text-sm mb-6">هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد؟</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 rounded-2xl font-arabic text-sm font-bold transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                  إلغاء
                </button>
                <button
                  onClick={handleDeleteConfirmed}
                  disabled={deletingId !== null}
                  className="flex-1 py-3 rounded-2xl font-arabic text-sm font-bold transition-all active:scale-95"
                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444" }}>
                  {deletingId !== null ? "جاري الحذف..." : "حذف"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
