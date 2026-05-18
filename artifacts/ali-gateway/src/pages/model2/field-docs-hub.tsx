import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ShieldAlert, Camera, Upload, X, CheckCircle,
  ChevronDown, Loader2, AlertTriangle, Plus, Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTelegram } from "@/lib/telegram";
import { ScrollingTicker } from "../sections/adar-docs";
import { DocsTab } from "../sections/adar-docs";
import { captureGeo } from "@/lib/geo";

const GOLD      = "#d4af37";
const GOLD_DIM  = "rgba(212,175,55,0.35)";
const RED       = "#ef4444";
const RED_DIM   = "rgba(239,68,68,0.35)";

// ─── Shared style helpers ─────────────────────────────────────────────────────
const fieldStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(212,175,55,0.18)",
  borderRadius: 8,
  padding: "9px 12px",
  color: "rgba(255,255,255,0.8)",
  fontFamily: "'Amiri', serif",
  fontSize: 14,
  outline: "none",
  direction: "rtl",
};
const labelStyle: React.CSSProperties = {
  fontFamily: "'Cairo', sans-serif",
  fontSize: 11,
  color: "rgba(212,175,55,0.7)",
  marginBottom: 4,
  display: "block",
};
const secTitle: React.CSSProperties = {
  fontFamily: "'Cairo', sans-serif",
  fontWeight: 700,
  fontSize: 12,
  color: GOLD,
  borderBottom: `1px solid ${GOLD}25`,
  paddingBottom: 6,
  marginBottom: 10,
  marginTop: 14,
};
const submitBtnStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "11px 0",
  borderRadius: 12,
  fontFamily: "'Cairo', sans-serif",
  fontWeight: 700,
  fontSize: 14,
  background: "linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.1))",
  border: `1.5px solid ${RED_DIM}`,
  color: RED,
  cursor: "pointer",
};

// ─── Field helpers ────────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = "text", placeholder = "", required = false }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="mb-3">
      <label style={labelStyle}>{label}{required && <span style={{ color: "rgba(239,68,68,0.8)", marginRight: 2 }}> *</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ ...fieldStyle, resize: undefined }} />
    </div>
  );
}

function TextareaField({ label, value, onChange, rows = 3, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <div className="mb-3">
      <label style={labelStyle}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        style={{ ...fieldStyle, resize: "none" as const }} />
    </div>
  );
}

function SelectField({ label, value, onChange, options, required = false }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; required?: boolean;
}) {
  return (
    <div className="mb-3">
      <label style={labelStyle}>{label}{required && <span style={{ color: "rgba(239,68,68,0.8)", marginRight: 2 }}> *</span>}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...fieldStyle, resize: undefined }}>
        <option value="">— اختر —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Photo capture (self-contained) ──────────────────────────────────────────
function PhotoSection({ photos, onAdd, onRemove }: {
  photos: string[]; onAdd: (u: string[]) => void; onRemove: (i: number) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);

  async function readFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setCompressing(true);
    try {
      const results = await Promise.all(
        Array.from(files).map(file =>
          new Promise<string>(res => {
            const r = new FileReader();
            r.onload = e => res(e.target?.result as string);
            r.readAsDataURL(file);
          })
        )
      );
      onAdd(results);
    } finally { setCompressing(false); }
  }

  return (
    <div className="mb-3">
      <p style={{ ...labelStyle, marginBottom: 8 }}>📎 الوثائق والمستندات المرفقة</p>
      <div className="flex gap-2 mb-3">
        <button type="button" onClick={() => cameraRef.current?.click()} disabled={compressing}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl active:scale-95 transition-all"
          style={{ background: "rgba(239,68,68,0.1)", border: `1px solid ${RED_DIM}`, color: RED, fontFamily: "'Cairo', sans-serif", fontSize: 12, fontWeight: 700 }}>
          <Camera className="w-3.5 h-3.5" /> تصوير الوثيقة
        </button>
        <button type="button" onClick={() => galleryRef.current?.click()} disabled={compressing}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl active:scale-95 transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontFamily: "'Cairo', sans-serif", fontSize: 12, fontWeight: 700 }}>
          {compressing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />ضغط...</> : <><Upload className="w-3.5 h-3.5" />رفع من الهاتف</>}
        </button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*"
        {...({ capture: "environment" } as React.InputHTMLAttributes<HTMLInputElement>)}
        multiple style={{ display: "none" }} onChange={e => readFiles(e.target.files)} />
      <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => readFiles(e.target.files)} />
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((src, i) => (
            <div key={i} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "1", background: "rgba(0,0,0,0.3)" }}>
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button onClick={() => onRemove(i)} type="button"
                className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.85)" }}>
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Upload helpers ───────────────────────────────────────────────────────────
function UploadOverlay({ progress, onDone }: { progress: number; onDone: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="rounded-2xl p-4"
      style={{ background: onDone ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)", border: `1px solid ${onDone ? "rgba(34,197,94,0.35)" : RED_DIM}` }}>
      {onDone ? (
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 13, color: "#4ade80" }}>تم إرسال البلاغ إلى مركز ADAR ✓</p>
            <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 11, color: "rgba(74,222,128,0.6)", marginTop: 2 }}>تشفير AES-256 · +500 نقطة أُضيفت لرصيدك</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <motion.div className="w-4 h-4 border-2 rounded-full flex-shrink-0" style={{ borderColor: RED, borderTopColor: "transparent" }}
              animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }} />
            <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 12, color: RED }}>جاري إرسال البلاغ العاجل...</p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${RED}aa, ${RED})` }}
              animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function makeUrgentUpload(
  setState: (s: "idle" | "uploading" | "done") => void,
  setProgress: (fn: (p: number) => number) => void,
  clearForm: () => void,
  onSubmit: (fileId: string) => void,
  telegramId?: string,
  getPhotos?: () => string[],
) {
  return function startUpload() {
    captureGeo();
    clearForm();
    setState("uploading");
    setProgress(() => 0);
    const photos = getPhotos?.() ?? [];
    let uploadPromise: Promise<string | null>;
    if (telegramId && photos.length > 0) {
      const reqs = photos.map((photo, idx) =>
        apiFetch("/api/docs/upload-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64: photo, filename: `urgent-${Date.now()}-${idx}.jpg` }),
        }).then(r => r.ok ? (r.json() as Promise<{ fileId?: string }>) : Promise.reject())
          .then(d => { if (d.fileId) return d.fileId; throw new Error(); })
      );
      uploadPromise = Promise.any(reqs).catch(() => null);
    } else {
      uploadPromise = Promise.resolve(null);
    }
    const iv = setInterval(() => setProgress(p => {
      if (p >= 100) {
        clearInterval(iv);
        setState("done");
        uploadPromise.then(fileId => { if (fileId) onSubmit(fileId); });
        setTimeout(() => setState("idle"), 4200);
        return 100;
      }
      return p + 4;
    }), 80);
  };
}

// ─── Accordion shell for urgent reports ──────────────────────────────────────
function UrgentAccordion({ emoji, title, subtitle, children, isOpen, onToggle, submitState }: {
  emoji: string; title: string; subtitle: string; children: React.ReactNode;
  isOpen: boolean; onToggle: () => void; submitState: "idle" | "uploading" | "done";
}) {
  const isDone = submitState === "done";
  return (
    <div className="rounded-2xl overflow-hidden mb-3"
      style={{
        background: "rgba(0,0,0,0.3)",
        border: `1.5px solid ${isDone ? "rgba(34,197,94,0.4)" : isOpen ? RED + "40" : RED + "18"}`,
        boxShadow: isOpen ? `0 4px 24px rgba(239,68,68,0.08)` : "none",
      }}>
      <button type="button" onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-right active:opacity-80 transition-opacity"
        style={{ background: isDone ? "rgba(34,197,94,0.07)" : isOpen ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.03)" }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: "rgba(239,68,68,0.1)", border: `1px solid ${RED_DIM}` }}>
          {isDone ? "✅" : emoji}
        </div>
        <div className="flex-1 text-right">
          <div className="flex items-center gap-1.5">
            <span style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 13, color: isDone ? "#4ade80" : "#fca5a5" }}>
              {title}
            </span>
            {isDone && <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: 10, color: "#4ade80", background: "rgba(34,197,94,0.12)", borderRadius: 10, padding: "1px 6px", border: "1px solid rgba(34,197,94,0.25)" }}>مُرسَل ✓</span>}
          </div>
          <p style={{ fontFamily: "'Amiri', serif", fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{subtitle}</p>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4" style={{ color: RED_DIM }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: "hidden" }}>
            <div className="px-4 pt-2 pb-4 border-t" style={{ borderColor: `${RED}15` }} dir="rtl">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Urgent form wrapper ──────────────────────────────────────────────────────
function UrgentFormWrapper({ state, progress, canSubmit, onSubmit, children }: {
  state: "idle" | "uploading" | "done"; progress: number; canSubmit: boolean;
  onSubmit: () => void; children: React.ReactNode;
}) {
  if (state !== "idle") return <UploadOverlay progress={progress} onDone={state === "done"} />;
  return (
    <>
      {children}
      <button onClick={onSubmit} disabled={!canSubmit}
        style={{ ...submitBtnStyle, opacity: canSubmit ? 1 : 0.4, cursor: canSubmit ? "pointer" : "not-allowed" }}>
        <ShieldAlert className="w-4 h-4" /> إرسال البلاغ العاجل
      </button>
    </>
  );
}

// ─── Urgent forms ─────────────────────────────────────────────────────────────
function KidnapForm({ onSubmit, telegramId }: { onSubmit: (f: string) => void; telegramId: string }) {
  const [d, setD] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const set = (k: string, v: string) => setD(p => ({ ...p, [k]: v }));
  const canSubmit = !!(d.victimName && d.location);
  const go = makeUrgentUpload(setState, setProgress as (fn: (p: number) => number) => void, () => { setD({}); setPhotos([]); }, onSubmit, telegramId, () => photos);
  return (
    <UrgentFormWrapper state={state} progress={progress} canSubmit={canSubmit} onSubmit={go}>
      <p style={secTitle}>● بيانات الحادثة</p>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="اسم المخطوف / المخطوفة" value={d.victimName || ""} onChange={v => set("victimName", v)} required placeholder="الاسم الثلاثي" />
        <Field label="تاريخ الحادثة" type="date" value={d.incidentDate || ""} onChange={v => set("incidentDate", v)} />
        <Field label="مكان الحادثة" value={d.location || ""} onChange={v => set("location", v)} required placeholder="القرية / المنطقة / الطريق" />
        <Field label="الوقت التقريبي" value={d.incidentTime || ""} onChange={v => set("incidentTime", v)} placeholder="مثال: صباحاً / 14:00" />
      </div>
      <SelectField label="الجهة المنفذة" value={d.perpetrator || ""} onChange={v => set("perpetrator", v)}
        options={[
          { value: "armed_faction", label: "فصيل مسلح" },
          { value: "unknown_armed", label: "مجهولون مسلحون" },
          { value: "criminal", label: "جنائي / إجرامي" },
          { value: "other", label: "أخرى" },
        ]} />
      <TextareaField label="تفاصيل إضافية وملابسات الخطف" value={d.details || ""} onChange={v => set("details", v)} rows={3} placeholder="وصف ما حدث، عدد المنفذين، آليات إن وُجدت..." />
      <PhotoSection photos={photos} onAdd={u => setPhotos(p => [...p, ...u])} onRemove={i => setPhotos(p => p.filter((_, j) => j !== i))} />
    </UrgentFormWrapper>
  );
}

function FactionMovementForm({ onSubmit, telegramId }: { onSubmit: (f: string) => void; telegramId: string }) {
  const [d, setD] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const set = (k: string, v: string) => setD(p => ({ ...p, [k]: v }));
  const canSubmit = !!(d.factionName && d.location);
  const go = makeUrgentUpload(setState, setProgress as (fn: (p: number) => number) => void, () => { setD({}); setPhotos([]); }, onSubmit, telegramId, () => photos);
  return (
    <UrgentFormWrapper state={state} progress={progress} canSubmit={canSubmit} onSubmit={go}>
      <p style={secTitle}>● تفاصيل التحرك</p>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="اسم الفصيل / الجهة" value={d.factionName || ""} onChange={v => set("factionName", v)} required placeholder="اسم الفصيل أو وصفه" />
        <Field label="تاريخ الرصد" type="date" value={d.observedDate || ""} onChange={v => set("observedDate", v)} />
        <Field label="موقع الرصد" value={d.location || ""} onChange={v => set("location", v)} required placeholder="المنطقة / الطريق / النقطة" />
        <Field label="الوقت التقريبي" value={d.observedTime || ""} onChange={v => set("observedTime", v)} placeholder="مثال: 10:30" />
      </div>
      <SelectField label="نوع التحرك" value={d.movementType || ""} onChange={v => set("movementType", v)}
        options={[
          { value: "infantry", label: "حركة مشاة مسلحة" },
          { value: "vehicles", label: "تحرك آليات / مركبات" },
          { value: "checkpoint", label: "نصب حاجز / نقطة تفتيش" },
          { value: "patrol", label: "دورية عسكرية" },
          { value: "other", label: "أخرى" },
        ]} />
      <TextareaField label="وصف تفصيلي للحركة والتعداد التقريبي" value={d.details || ""} onChange={v => set("details", v)} rows={4} placeholder="عدد الأفراد، الأسلحة الظاهرة، الاتجاه، أي معلومات أخرى..." />
      <PhotoSection photos={photos} onAdd={u => setPhotos(p => [...p, ...u])} onRemove={i => setPhotos(p => p.filter((_, j) => j !== i))} />
    </UrgentFormWrapper>
  );
}

function KillingForm({ onSubmit, telegramId }: { onSubmit: (f: string) => void; telegramId: string }) {
  const [d, setD] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const set = (k: string, v: string) => setD(p => ({ ...p, [k]: v }));
  const canSubmit = !!(d.location && d.incidentDate);
  const go = makeUrgentUpload(setState, setProgress as (fn: (p: number) => number) => void, () => { setD({}); setPhotos([]); }, onSubmit, telegramId, () => photos);
  return (
    <UrgentFormWrapper state={state} progress={progress} canSubmit={canSubmit} onSubmit={go}>
      <p style={secTitle}>● بيانات الحادثة</p>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="اسم الضحية (إن عُرف)" value={d.victimName || ""} onChange={v => set("victimName", v)} placeholder="الاسم أو مجهول" />
        <Field label="تاريخ الحادثة" type="date" value={d.incidentDate || ""} onChange={v => set("incidentDate", v)} required />
        <Field label="مكان الحادثة" value={d.location || ""} onChange={v => set("location", v)} required placeholder="القرية / المنطقة" />
        <Field label="الجهة المنفذة" value={d.perpetrator || ""} onChange={v => set("perpetrator", v)} placeholder="إن عُرفت" />
      </div>
      <SelectField label="طبيعة الحادثة" value={d.causeType || ""} onChange={v => set("causeType", v)}
        options={[
          { value: "shooting", label: "إطلاق نار مباشر" },
          { value: "shelling", label: "قصف أو انفجار" },
          { value: "torture", label: "تعذيب / اعتقال أفضى للوفاة" },
          { value: "mine", label: "لغم / عبوة ناسفة" },
          { value: "other", label: "أخرى" },
        ]} />
      <TextareaField label="وصف تفصيلي للحادثة وملابساتها" value={d.description || ""} onChange={v => set("description", v)} rows={4} placeholder="ما جرى بالتفصيل..." />
      <PhotoSection photos={photos} onAdd={u => setPhotos(p => [...p, ...u])} onRemove={i => setPhotos(p => p.filter((_, j) => j !== i))} />
    </UrgentFormWrapper>
  );
}

function TheftForm({ onSubmit, telegramId }: { onSubmit: (f: string) => void; telegramId: string }) {
  const [d, setD] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const set = (k: string, v: string) => setD(p => ({ ...p, [k]: v }));
  const canSubmit = !!(d.location && d.theftType);
  const go = makeUrgentUpload(setState, setProgress as (fn: (p: number) => number) => void, () => { setD({}); setPhotos([]); }, onSubmit, telegramId, () => photos);
  return (
    <UrgentFormWrapper state={state} progress={progress} canSubmit={canSubmit} onSubmit={go}>
      <p style={secTitle}>● بيانات الحادثة</p>
      <SelectField label="نوع السرقة / النهب" value={d.theftType || ""} onChange={v => set("theftType", v)} required
        options={[
          { value: "house", label: "منزل / مسكن" },
          { value: "shop", label: "محل تجاري / مستودع" },
          { value: "vehicle", label: "مركبة / آلية" },
          { value: "farmland", label: "محصول زراعي / أرض" },
          { value: "looting", label: "نهب جماعي" },
          { value: "other", label: "أخرى" },
        ]} />
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="مكان الحادثة" value={d.location || ""} onChange={v => set("location", v)} required placeholder="القرية / الحي" />
        <Field label="تاريخ الحادثة" type="date" value={d.incidentDate || ""} onChange={v => set("incidentDate", v)} />
      </div>
      <Field label="الجهة المنفذة (إن عُرفت)" value={d.perpetrator || ""} onChange={v => set("perpetrator", v)} placeholder="فصيل / أشخاص / مجهول" />
      <TextareaField label="تفاصيل ما جرى نهبه وتقدير الخسائر" value={d.details || ""} onChange={v => set("details", v)} rows={3} placeholder="ما سُرق، التقدير التقريبي للخسارة..." />
      <PhotoSection photos={photos} onAdd={u => setPhotos(p => [...p, ...u])} onRemove={i => setPhotos(p => p.filter((_, j) => j !== i))} />
    </UrgentFormWrapper>
  );
}

function AssaultForm({ onSubmit, telegramId }: { onSubmit: (f: string) => void; telegramId: string }) {
  const [d, setD] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const set = (k: string, v: string) => setD(p => ({ ...p, [k]: v }));
  const canSubmit = !!(d.location && d.assaultType);
  const go = makeUrgentUpload(setState, setProgress as (fn: (p: number) => number) => void, () => { setD({}); setPhotos([]); }, onSubmit, telegramId, () => photos);
  return (
    <UrgentFormWrapper state={state} progress={progress} canSubmit={canSubmit} onSubmit={go}>
      <p style={secTitle}>● بيانات الاعتداء</p>
      <SelectField label="نوع الاعتداء" value={d.assaultType || ""} onChange={v => set("assaultType", v)} required
        options={[
          { value: "physical", label: "اعتداء جسدي" },
          { value: "armed", label: "اعتداء بالأسلحة" },
          { value: "property", label: "اعتداء على ممتلكات" },
          { value: "sexual", label: "اعتداء جنسي (يُعامل بسرية تامة)" },
          { value: "other", label: "أخرى" },
        ]} />
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="مكان الحادثة" value={d.location || ""} onChange={v => set("location", v)} required placeholder="القرية / المنطقة" />
        <Field label="تاريخ الحادثة" type="date" value={d.incidentDate || ""} onChange={v => set("incidentDate", v)} />
        <Field label="اسم الضحية (اختياري)" value={d.victimName || ""} onChange={v => set("victimName", v)} placeholder="يمكن ترك هذا الحقل فارغاً" />
        <Field label="الجهة المنفذة" value={d.perpetrator || ""} onChange={v => set("perpetrator", v)} placeholder="إن عُرفت" />
      </div>
      <TextareaField label="وصف تفصيلي للاعتداء وملابساته" value={d.details || ""} onChange={v => set("details", v)} rows={4} placeholder="ما جرى بالتفصيل، درجة الأذى، أي شهود..." />
      <PhotoSection photos={photos} onAdd={u => setPhotos(p => [...p, ...u])} onRemove={i => setPhotos(p => p.filter((_, j) => j !== i))} />
    </UrgentFormWrapper>
  );
}

function ArrestForm({ onSubmit, telegramId }: { onSubmit: (f: string) => void; telegramId: string }) {
  const [d, setD] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const set = (k: string, v: string) => setD(p => ({ ...p, [k]: v }));
  const canSubmit = !!(d.detaineeName && d.arrestDate);
  const go = makeUrgentUpload(setState, setProgress as (fn: (p: number) => number) => void, () => { setD({}); setPhotos([]); }, onSubmit, telegramId, () => photos);
  return (
    <UrgentFormWrapper state={state} progress={progress} canSubmit={canSubmit} onSubmit={go}>
      <p style={secTitle}>● بيانات المعتقل</p>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="اسم المعتقل" value={d.detaineeName || ""} onChange={v => set("detaineeName", v)} required placeholder="الاسم الثلاثي" />
        <Field label="الرقم الوطني" value={d.nationalId || ""} onChange={v => set("nationalId", v)} placeholder="إن توفر" />
        <Field label="تاريخ الاعتقال" type="date" value={d.arrestDate || ""} onChange={v => set("arrestDate", v)} required />
        <Field label="مكان الاعتقال" value={d.arrestLocation || ""} onChange={v => set("arrestLocation", v)} placeholder="المنطقة / نقطة التفتيش" />
      </div>
      <Field label="الجهة المعتقِلة" value={d.detainingAuthority || ""} onChange={v => set("detainingAuthority", v)} placeholder="الفصيل / الجهة" />
      <SelectField label="الوضع الراهن" value={d.currentStatus || ""} onChange={v => set("currentStatus", v)}
        options={[
          { value: "detained", label: "لا يزال معتقلاً" },
          { value: "released", label: "أُفرج عنه" },
          { value: "unknown", label: "مجهول المصير" },
          { value: "transferred", label: "نُقل لجهة أخرى" },
        ]} />
      <TextareaField label="تفاصيل ظروف الاعتقال وأي معلومات إضافية" value={d.details || ""} onChange={v => set("details", v)} rows={3} placeholder="ملابسات الاعتقال، التهم إن وُجدت، آخر معلومة..." />
      <PhotoSection photos={photos} onAdd={u => setPhotos(p => [...p, ...u])} onRemove={i => setPhotos(p => p.filter((_, j) => j !== i))} />
    </UrgentFormWrapper>
  );
}

// ─── Urgent Monitor Tab ───────────────────────────────────────────────────────
const URGENT_FORMS = [
  { id: "kidnap",   emoji: "⚠️",  title: "خطف",                   subtitle: "اسم المخطوف · المكان · الجهة المنفذة" },
  { id: "faction",  emoji: "🔭",  title: "تحركات فصائل",           subtitle: "اسم الفصيل · نوع التحرك · الموقع" },
  { id: "killing",  emoji: "🚨",  title: "قتل / استشهاد عاجل",     subtitle: "المكان · الطبيعة · ملابسات الحادثة" },
  { id: "theft",    emoji: "🏚️",  title: "سرقة / نهب",             subtitle: "نوع السرقة · الموقع · الجهة المنفذة" },
  { id: "assault",  emoji: "⛔",  title: "اعتداء",                  subtitle: "نوع الاعتداء · الضحية · التفاصيل" },
  { id: "arrest",   emoji: "🔒",  title: "اعتقال / احتجاز",        subtitle: "اسم المعتقل · الجهة · الوضع الراهن" },
] as const;

function UrgentMonitorTab({ telegramId }: { telegramId: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [totalPoints, setTotalPoints] = useState(0);

  const toggle = useCallback((id: string) => setOpenId(p => p === id ? null : id), []);

  const handleSubmit = useCallback(async (formId: string, fileId: string) => {
    if (!telegramId || !fileId) return;
    try {
      const res = await apiFetch("/api/docs/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, type: "urgent" }),
      });
      if (res.ok) {
        setSubmittedIds(p => new Set(p).add(formId));
        setTotalPoints(p => p + 500);
      }
    } catch { /* silent */ }
  }, [telegramId]);

  return (
    <div>
      <AnimatePresence>
        {totalPoints > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl px-4 py-3 flex items-center gap-3 mb-4"
            style={{ background: "rgba(34,197,94,0.1)", border: "1.5px solid rgba(34,197,94,0.35)" }}>
            <span className="text-2xl">🏆</span>
            <div>
              <p style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 13, color: "#4ade80" }}>
                +{totalPoints} نقطة من {submittedIds.size} بلاغ موثّق
              </p>
              <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 10, color: "rgba(74,222,128,0.55)", marginTop: 1 }}>
                أُضيفت تلقائياً لرصيدك السيادي ✓
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-2xl px-4 py-3 mb-4" style={{ background: "rgba(239,68,68,0.04)", border: `1px solid ${RED}18` }}>
        <div className="flex items-center gap-2 mb-1.5">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" style={{ color: RED }} />
          <p style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 12, color: "#fca5a5" }}>بلاغات الرصد العاجل — 6 فئات</p>
        </div>
        <p style={{ fontFamily: "'Amiri', serif", fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.8 }}>
          أبلغ عن حوادث عاجلة في الميدان — كل بلاغ مشفّر ومرسل فوراً إلى مركز ADAR ويُضيف <span style={{ color: RED }}>500 نقطة</span> لرصيدك.
        </p>
      </div>

      {URGENT_FORMS.map(form => {
        const isDone = submittedIds.has(form.id);
        return (
          <UrgentAccordion key={form.id} emoji={form.emoji} title={form.title} subtitle={form.subtitle}
            isOpen={openId === form.id} onToggle={() => !isDone && toggle(form.id)}
            submitState={isDone ? "done" : "idle"}>
            {form.id === "kidnap"  && <KidnapForm          telegramId={telegramId} onSubmit={fid => handleSubmit(form.id, fid)} />}
            {form.id === "faction" && <FactionMovementForm  telegramId={telegramId} onSubmit={fid => handleSubmit(form.id, fid)} />}
            {form.id === "killing" && <KillingForm          telegramId={telegramId} onSubmit={fid => handleSubmit(form.id, fid)} />}
            {form.id === "theft"   && <TheftForm            telegramId={telegramId} onSubmit={fid => handleSubmit(form.id, fid)} />}
            {form.id === "assault" && <AssaultForm          telegramId={telegramId} onSubmit={fid => handleSubmit(form.id, fid)} />}
            {form.id === "arrest"  && <ArrestForm           telegramId={telegramId} onSubmit={fid => handleSubmit(form.id, fid)} />}
          </UrgentAccordion>
        );
      })}

      <div className="mt-4 rounded-2xl px-4 py-3 flex items-start gap-2.5"
        style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: RED, opacity: 0.5 }} />
        <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.25)", lineHeight: 1.8 }}>
          🔒 جميع البلاغات مُشفّرة · تُرسَل فوراً لمركز ADAR · بياناتك الشخصية محمية بالكامل · حقك في الحذف محفوظ دائماً
        </p>
      </div>
    </div>
  );
}

// ─── Main hub ─────────────────────────────────────────────────────────────────
type DocTab = "violations" | "urgent";

function TabLoading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-7 h-7 border-2 rounded-full animate-spin"
        style={{ borderColor: `${GOLD}35`, borderTopColor: GOLD }} />
    </div>
  );
}

export function FieldDocsHub({ telegramId }: { telegramId: string }) {
  const { user } = useTelegram();
  const tid = telegramId || user?.id?.toString() || "";
  const [tab, setTab] = useState<DocTab>("urgent");

  return (
    <div className="h-full flex flex-col overflow-hidden" dir="rtl">

      {/* ── Tab switcher ── */}
      <div className="flex-shrink-0 flex items-center gap-2.5 px-3 py-3"
        style={{ background: "rgba(2,10,2,0.97)", borderBottom: "1px solid rgba(212,175,55,0.22)" }}>

        {([
          { id: "urgent",     icon: <ShieldAlert size={18} color={GOLD} style={{ filter: `drop-shadow(0 0 5px ${GOLD}cc)` }} />, label: "رصد عاجل",          sub: "خطف · فصائل · قتل · اعتقال" },
          { id: "violations", icon: <Shield     size={18} color={GOLD} style={{ filter: `drop-shadow(0 0 5px ${GOLD}cc)` }} />, label: "توثيق الانتهاكات", sub: "مختطفات · تهجير · مفقودون" },
        ] as const).map(({ id, icon, label, sub }) => {
          const active = tab === id;
          return (
            <motion.button
              key={id}
              onClick={() => setTab(id)}
              whileTap={{ scale: 0.96, y: 1 }}
              className="relative flex-1 flex items-center justify-center gap-2 overflow-hidden"
              style={{
                borderRadius: 10,
                padding: "10px 12px",
                minHeight: 62,
                /* ── 3D glass gold body ── */
                background: active
                  ? "linear-gradient(180deg, rgba(255,235,120,0.28) 0%, rgba(212,175,55,0.38) 35%, rgba(160,120,10,0.32) 65%, rgba(100,70,0,0.45) 100%)"
                  : "linear-gradient(180deg, rgba(255,235,120,0.14) 0%, rgba(212,175,55,0.20) 35%, rgba(160,120,10,0.16) 65%, rgba(80,55,0,0.28) 100%)",
                /* ── border: bright top + dark bottom for 3D bevel ── */
                border: active
                  ? "1.5px solid rgba(255,225,80,0.75)"
                  : "1.5px solid rgba(212,175,55,0.45)",
                /* ── shadow stack: top highlight + depth shadow + glow ── */
                boxShadow: active
                  ? [
                      "inset 0 1.5px 0 rgba(255,245,160,0.55)",
                      "inset 0 -2px 0 rgba(0,0,0,0.55)",
                      "inset 1px 0 0 rgba(255,235,100,0.18)",
                      "inset -1px 0 0 rgba(0,0,0,0.25)",
                      "0 4px 14px rgba(0,0,0,0.55)",
                      "0 0 16px rgba(212,175,55,0.35)",
                    ].join(", ")
                  : [
                      "inset 0 1.5px 0 rgba(255,245,160,0.30)",
                      "inset 0 -2px 0 rgba(0,0,0,0.45)",
                      "inset 1px 0 0 rgba(255,235,100,0.10)",
                      "inset -1px 0 0 rgba(0,0,0,0.20)",
                      "0 3px 10px rgba(0,0,0,0.45)",
                    ].join(", "),
                backdropFilter: "blur(14px)",
                transition: "all 0.18s ease",
              }}>

              {/* ── glass sheen strip across top ── */}
              <div className="absolute inset-x-0 top-0 h-[38%] pointer-events-none"
                style={{
                  borderRadius: "9px 9px 50% 50% / 9px 9px 14px 14px",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 100%)",
                }} />

              {/* ── خط ذهبي سفلي يشير للزر المفتوح ── */}
              {active && (
                <motion.div
                  layoutId="activeTabLine"
                  className="absolute bottom-0 inset-x-3 pointer-events-none"
                  style={{
                    height: 3,
                    borderRadius: "3px 3px 0 0",
                    background: "linear-gradient(90deg, rgba(212,175,55,0.3) 0%, #ffd700 40%, #ffec80 60%, rgba(212,175,55,0.3) 100%)",
                    boxShadow: "0 0 8px rgba(255,215,0,0.8), 0 0 16px rgba(212,175,55,0.5)",
                  }}
                />
              )}

              {/* ── icon ── */}
              <div className="relative z-10 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg"
                style={{
                  background: "linear-gradient(145deg, rgba(212,175,55,0.38) 0%, rgba(160,120,10,0.18) 100%)",
                  border: "1px solid rgba(212,175,55,0.55)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), 0 2px 5px rgba(212,175,55,0.25)",
                }}>
                {icon}
              </div>

              {/* ── text ── */}
              <div className="relative z-10 text-right flex-1 min-w-0">
                <p style={{
                  fontFamily: "'Cairo', sans-serif",
                  fontWeight: 900,
                  fontSize: 14,
                  lineHeight: 1.2,
                  color: active ? "#ffd700" : "#d4af37",
                  textShadow: active
                    ? "0 0 10px rgba(255,215,0,0.9), 0 0 20px rgba(212,175,55,0.6), 0 1px 0 rgba(0,0,0,0.5)"
                    : "0 0 6px rgba(212,175,55,0.35), 0 1px 0 rgba(0,0,0,0.4)",
                  letterSpacing: "0.01em",
                }}>{label}</p>
                <p style={{
                  fontFamily: "'Cairo', sans-serif",
                  fontWeight: 700,
                  fontSize: 9,
                  lineHeight: 1.3,
                  color: active ? "rgba(255,215,0,0.65)" : "rgba(212,175,55,0.45)",
                  marginTop: 1,
                }}>{sub}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ── Scrolling ticker ── */}
      <div className="flex-shrink-0">
        <ScrollingTicker />
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab}
            initial={{ opacity: 0, x: tab === "violations" ? -14 : 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tab === "violations" ? 14 : -14 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="px-4 pt-4 pb-24 space-y-1">
            {tab === "violations" && <DocsTab telegramId={tid} />}
            {tab === "urgent"     && <UrgentMonitorTab telegramId={tid} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
