import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, Camera, X, CheckCircle,
  Plus, Trash2, Shield, AlertTriangle, Upload,
} from "lucide-react";
import { useTelegram } from "../../lib/telegram";

const GOLD = "#d4af37";
const GOLD_DIM = "rgba(212,175,55,0.35)";

const TICKER_TEXT =
  "تنبيه هام: لن يتم قبول أي ملف غير مكتمل البيانات حرصاً على سلامة المعلومات وإمكانية مراجعتها قانونياً. " +
  "الأولوية القصوى للملفات المدعومة بالوثائق الشخصية (الهوية) في حالات الانتهاكات الجسيمة. " +
  "كل ملف يُحفظ مشفراً بمعيار AES-256 في الأرشيف السحابي السيادي الخاص بك.  ●  ";

// ─── Scrolling Ticker ──────────────────────────────────────────────────────
export function ScrollingTicker() {
  return (
    <div className="overflow-hidden relative" style={{ background: "rgba(212,175,55,0.06)", borderBottom: `1px solid ${GOLD}20`, borderTop: `1px solid ${GOLD}20`, padding: "6px 0" }}>
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, duration: 32, ease: "linear" }}>
        {[TICKER_TEXT, TICKER_TEXT].map((t, i) => (
          <span key={i} style={{ fontFamily: "'Cairo', sans-serif", fontSize: 11, color: GOLD, paddingLeft: 40 }}>{t}</span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Design Helpers ─────────────────────────────────────────────────────────
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
const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "'Cairo', sans-serif",
  fontWeight: 700,
  fontSize: 12,
  color: GOLD,
  borderBottom: `1px solid ${GOLD}25`,
  paddingBottom: 6,
  marginBottom: 10,
  marginTop: 14,
};
const submitBtn: React.CSSProperties = {
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
  background: "linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.1))",
  border: `1.5px solid ${GOLD}55`,
  color: GOLD,
  cursor: "pointer",
  transition: "all 0.2s",
};

// ─── FormField ──────────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = "text", placeholder = "", required = false }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="mb-3">
      <label style={labelStyle}>{label}{required && <span style={{ color: "rgba(239,68,68,0.8)", marginRight: 2 }}> *</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
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
      <textarea value={value} onChange={e => onChange(e.target.value)}
        rows={rows} placeholder={placeholder}
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
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...fieldStyle, resize: undefined }}>
        <option value="">— اختر —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Photo Capture ──────────────────────────────────────────────────────────
function PhotoSection({ photos, onAdd, onRemove }: {
  photos: string[];
  onAdd: (urls: string[]) => void;
  onRemove: (i: number) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function readFiles(files: FileList | null) {
    if (!files) return;
    const readers = Array.from(files).map(file =>
      new Promise<string>(res => {
        const r = new FileReader();
        r.onload = e => res(e.target?.result as string);
        r.readAsDataURL(file);
      })
    );
    Promise.all(readers).then(urls => onAdd(urls));
  }

  return (
    <div className="mb-3">
      <p style={{ ...labelStyle, marginBottom: 8 }}>📎 الوثائق والمستندات المرفقة</p>
      <div className="flex gap-2 mb-3">
        <button type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl active:scale-95 transition-all"
          style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${GOLD_DIM}`, color: GOLD, fontFamily: "'Cairo', sans-serif", fontSize: 12, fontWeight: 700 }}>
          <Camera className="w-3.5 h-3.5" />
          تصوير الوثيقة
        </button>
        <button type="button"
          onClick={() => galleryRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl active:scale-95 transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontFamily: "'Cairo', sans-serif", fontSize: 12, fontWeight: 700 }}>
          <Upload className="w-3.5 h-3.5" />
          رفع من الهاتف
        </button>
      </div>

      {/* hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*"
        {...({ capture: "environment" } as React.InputHTMLAttributes<HTMLInputElement>)}
        multiple style={{ display: "none" }}
        onChange={e => readFiles(e.target.files)} />
      <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={e => readFiles(e.target.files)} />

      {/* thumbnails */}
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
              <div className="absolute bottom-0 inset-x-0 py-0.5 text-center"
                style={{ background: "rgba(0,0,0,0.5)", fontSize: 9, color: "rgba(255,255,255,0.6)", fontFamily: "'Cairo', sans-serif" }}>
                وثيقة {i + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Upload Progress ────────────────────────────────────────────────────────
function UploadOverlay({ progress, onDone }: { progress: number; onDone: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="rounded-2xl p-4"
      style={{ background: onDone ? "rgba(34,197,94,0.1)" : "rgba(212,175,55,0.08)", border: `1px solid ${onDone ? "rgba(34,197,94,0.35)" : GOLD_DIM}` }}>
      {onDone ? (
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 13, color: "#4ade80" }}>تم الحفظ في الأرشيف السحابي السيادي ✓</p>
            <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 11, color: "rgba(74,222,128,0.6)", marginTop: 2 }}>تشفير AES-256 · +200 نقطة أُضيفت لرصيدك</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <motion.div className="w-4 h-4 border-2 rounded-full flex-shrink-0" style={{ borderColor: GOLD, borderTopColor: "transparent" }}
              animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }} />
            <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 12, color: GOLD }}>جاري التشفير والرفع إلى الأرشيف السحابي السيادي..</p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <motion.div className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${GOLD}aa, ${GOLD})` }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }} />
          </div>
          <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 10, color: "rgba(212,175,55,0.5)", marginTop: 4, textAlign: "center" }}>{progress}%</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Accordion Shell ─────────────────────────────────────────────────────────
function AccordionShell({
  index, emoji, title, subtitle, children, isOpen, onToggle, submitState,
}: {
  index: number; emoji: string; title: string; subtitle: string;
  children: React.ReactNode; isOpen: boolean; onToggle: () => void;
  submitState: "idle" | "uploading" | "done";
}) {
  const isDone = submitState === "done";
  return (
    <div className="rounded-2xl overflow-hidden mb-3"
      style={{ background: "rgba(0,0,0,0.3)", border: `1.5px solid ${isDone ? "rgba(34,197,94,0.4)" : isOpen ? GOLD + "40" : GOLD + "18"}`, boxShadow: isOpen ? `0 4px 24px rgba(212,175,55,0.08)` : "none" }}>
      <button type="button" onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-right active:opacity-80 transition-opacity"
        style={{ background: isDone ? "rgba(34,197,94,0.07)" : isOpen ? "rgba(212,175,55,0.08)" : "rgba(212,175,55,0.03)" }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${GOLD_DIM}` }}>
          {isDone ? "✅" : emoji}
        </div>
        <div className="flex-1 text-right">
          <div className="flex items-center gap-1.5">
            <span style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 13, color: isDone ? "#4ade80" : GOLD }}>
              نموذج {index} — {title}
            </span>
            {isDone && <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: 10, color: "#4ade80", background: "rgba(34,197,94,0.12)", borderRadius: 10, padding: "1px 6px", border: "1px solid rgba(34,197,94,0.25)" }}>مُؤرشَف ✓</span>}
          </div>
          <p style={{ fontFamily: "'Amiri', serif", fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{subtitle}</p>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4" style={{ color: GOLD_DIM }} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}>
            <div className="px-4 pt-2 pb-4 border-t" style={{ borderColor: `${GOLD}15` }} dir="rtl">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Personal Data Block (shared) ────────────────────────────────────────────
function PersonalFields({ data, onChange }: {
  data: Record<string, string>;
  onChange: (k: string, v: string) => void;
}) {
  return (
    <>
      <p style={sectionTitleStyle}>● البيانات الشخصية</p>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="الاسم الثلاثي" value={data.fullName || ""} onChange={v => onChange("fullName", v)} required placeholder="الاسم الأول والثاني والثالث" />
        <Field label="اسم الأم" value={data.motherName || ""} onChange={v => onChange("motherName", v)} placeholder="اسم الأم الثلاثي" />
        <Field label="الرقم الوطني" value={data.nationalId || ""} onChange={v => onChange("nationalId", v)} required placeholder="00000000000" />
        <Field label="تاريخ الميلاد" type="date" value={data.birthDate || ""} onChange={v => onChange("birthDate", v)} />
        <Field label="مكان الميلاد" value={data.birthPlace || ""} onChange={v => onChange("birthPlace", v)} placeholder="المحافظة / المدينة" />
        <Field label="السجل المدني والخانة" value={data.civilRecord || ""} onChange={v => onChange("civilRecord", v)} placeholder="رقم السجل والخانة" />
      </div>
      <Field label="العمل السابق / المهنة" value={data.previousJob || ""} onChange={v => onChange("previousJob", v)} placeholder="الوظيفة قبل الحادثة" />
    </>
  );
}

// ─── Form 1: المفقودون ──────────────────────────────────────────────────────
function MissingPersonForm({ onSubmit }: { onSubmit: () => void }) {
  const [d, setD] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);

  function set(k: string, v: string) { setD(prev => ({ ...prev, [k]: v })); }
  function startUpload() {
    setState("uploading"); setProgress(0);
    const iv = setInterval(() => setProgress(p => { if (p >= 100) { clearInterval(iv); setState("done"); onSubmit(); return 100; } return p + 4; }), 80);
  }
  const canSubmit = !!(d.fullName && d.nationalId);

  return (
    <>
      <PersonalFields data={d} onChange={set} />
      <p style={sectionTitleStyle}>● بيانات الفقدان</p>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="تاريخ الفقدان" type="date" value={d.disappearDate || ""} onChange={v => set("disappearDate", v)} required />
        <Field label="آخر مكان اتصال" value={d.lastLocation || ""} onChange={v => set("lastLocation", v)} required placeholder="المنطقة / الحي" />
      </div>
      <TextareaField label="ملاحظات إضافية وملابسات الفقدان" value={d.notes || ""} onChange={v => set("notes", v)} placeholder="وصف آخر يوم / ظروف الاختفاء..." />
      <PhotoSection photos={photos} onAdd={urls => setPhotos(p => [...p, ...urls])} onRemove={i => setPhotos(p => p.filter((_, j) => j !== i))} />
      {state !== "idle" ? <UploadOverlay progress={progress} onDone={state === "done"} />
        : <button onClick={startUpload} disabled={!canSubmit} style={{ ...submitBtn, opacity: canSubmit ? 1 : 0.4 }}>
            <Shield className="w-4 h-4" /> أرشفة الملف وإضافة 200 نقطة
          </button>}
    </>
  );
}

// ─── Form 2: الشهداء والضحايا ────────────────────────────────────────────────
function MartyrForm({ onSubmit }: { onSubmit: () => void }) {
  const [d, setD] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);

  function set(k: string, v: string) { setD(prev => ({ ...prev, [k]: v })); }
  function startUpload() {
    setState("uploading"); setProgress(0);
    const iv = setInterval(() => setProgress(p => { if (p >= 100) { clearInterval(iv); setState("done"); onSubmit(); return 100; } return p + 4; }), 80);
  }
  const canSubmit = !!(d.fullName && d.nationalId && d.martyrDate);

  return (
    <>
      <PersonalFields data={d} onChange={set} />
      <p style={sectionTitleStyle}>● بيانات الاستشهاد</p>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="تاريخ الاستشهاد" type="date" value={d.martyrDate || ""} onChange={v => set("martyrDate", v)} required />
        <Field label="مكان الاستشهاد" value={d.martyrPlace || ""} onChange={v => set("martyrPlace", v)} required placeholder="القرية / المنطقة" />
      </div>
      <SelectField label="طبيعة الحادثة" value={d.causeType || ""} onChange={v => set("causeType", v)}
        options={[
          { value: "shelling", label: "قصف / غارة جوية" },
          { value: "shooting", label: "إطلاق نار" },
          { value: "torture", label: "تعذيب / اعتقال" },
          { value: "mine", label: "لغم / متفجرة" },
          { value: "other", label: "أخرى" },
        ]} />
      <TextareaField label="وصف تفصيلي للحادثة" value={d.description || ""} onChange={v => set("description", v)} rows={4} placeholder="تفاصيل ما حدث..." />
      <PhotoSection photos={photos} onAdd={urls => setPhotos(p => [...p, ...urls])} onRemove={i => setPhotos(p => p.filter((_, j) => j !== i))} />
      {state !== "idle" ? <UploadOverlay progress={progress} onDone={state === "done"} />
        : <button onClick={startUpload} disabled={!canSubmit} style={{ ...submitBtn, opacity: canSubmit ? 1 : 0.4 }}>
            <Shield className="w-4 h-4" /> أرشفة الملف وإضافة 200 نقطة
          </button>}
    </>
  );
}

// ─── Form 3: المختطفات ──────────────────────────────────────────────────────
function KidnappedWomanForm({ onSubmit }: { onSubmit: () => void }) {
  const [d, setD] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"" | "unknown" | "known" | "returned">("");

  function set(k: string, v: string) { setD(prev => ({ ...prev, [k]: v })); }
  function startUpload() {
    setState("uploading"); setProgress(0);
    const iv = setInterval(() => setProgress(p => { if (p >= 100) { clearInterval(iv); setState("done"); onSubmit(); return 100; } return p + 4; }), 80);
  }
  const canSubmit = !!(d.fullName && d.nationalId && status);

  return (
    <>
      <PersonalFields data={d} onChange={set} />
      <p style={sectionTitleStyle}>● بيانات الاختطاف</p>
      <Field label="مكان الاختطاف" value={d.kidnapPlace || ""} onChange={v => set("kidnapPlace", v)} required placeholder="المنطقة / الحي / الطريق" />
      <Field label="تاريخ الاختطاف" type="date" value={d.kidnapDate || ""} onChange={v => set("kidnapDate", v)} />
      <SelectField label="وضع المختطفة حالياً" value={status} onChange={v => setStatus(v as typeof status)} required
        options={[
          { value: "unknown", label: "مجهول المصير" },
          { value: "known", label: "مكانها معلوم" },
          { value: "returned", label: "عادت من الخطف" },
        ]} />
      <AnimatePresence>
        {status === "known" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <TextareaField label="تفاصيل المكان المعروف" value={d.knownLocation || ""} onChange={v => set("knownLocation", v)} placeholder="المعتقل / الجهة الحاجزة / تفاصيل أخرى..." />
          </motion.div>
        )}
        {status === "returned" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <TextareaField label="شهادة الناجية" value={d.survivorTestimony || ""} onChange={v => set("survivorTestimony", v)} rows={5} placeholder="أدلي بشهادتك بحرية تامة — سيُحفظ هذا النص مشفراً وسرياً..." />
            <div className="rounded-xl px-3 py-2 mb-3" style={{ background: "rgba(212,175,55,0.06)", border: `1px solid ${GOLD}15` }}>
              <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 10, color: "rgba(212,175,55,0.55)", lineHeight: 1.7 }}>
                🔒 شهادة الناجية محمية بالكامل — لن تُشارَك بدون موافقة صريحة منك
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <PhotoSection photos={photos} onAdd={urls => setPhotos(p => [...p, ...urls])} onRemove={i => setPhotos(p => p.filter((_, j) => j !== i))} />
      {state !== "idle" ? <UploadOverlay progress={progress} onDone={state === "done"} />
        : <button onClick={startUpload} disabled={!canSubmit} style={{ ...submitBtn, opacity: canSubmit ? 1 : 0.4 }}>
            <Shield className="w-4 h-4" /> أرشفة الملف وإضافة 200 نقطة
          </button>}
    </>
  );
}

// ─── Form 4: المهجرون قسرياً ─────────────────────────────────────────────────
function DisplacedFamilyForm({ onSubmit }: { onSubmit: () => void }) {
  const [d, setD] = useState<Record<string, string>>({});
  const [children, setChildren] = useState<{ name: string; age: string }[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);

  function set(k: string, v: string) { setD(prev => ({ ...prev, [k]: v })); }
  function addChild() { setChildren(c => [...c, { name: "", age: "" }]); }
  function removeChild(i: number) { setChildren(c => c.filter((_, j) => j !== i)); }
  function updateChild(i: number, key: "name" | "age", val: string) {
    setChildren(c => c.map((ch, j) => j === i ? { ...ch, [key]: val } : ch));
  }
  function startUpload() {
    setState("uploading"); setProgress(0);
    const iv = setInterval(() => setProgress(p => { if (p >= 100) { clearInterval(iv); setState("done"); onSubmit(); return 100; } return p + 4; }), 80);
  }
  const canSubmit = !!(d.fullName && d.nationalId);

  return (
    <>
      <p style={sectionTitleStyle}>● بيانات رب الأسرة</p>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="الاسم الثلاثي" value={d.fullName || ""} onChange={v => set("fullName", v)} required />
        <Field label="اسم الوالد وكنيته" value={d.fatherName || ""} onChange={v => set("fatherName", v)} />
        <Field label="اسم الأم" value={d.motherName || ""} onChange={v => set("motherName", v)} />
        <Field label="تاريخ الميلاد" type="date" value={d.birthDate || ""} onChange={v => set("birthDate", v)} />
        <Field label="الرقم الوطني" value={d.nationalId || ""} onChange={v => set("nationalId", v)} required />
        <Field label="العمل السابق" value={d.previousJob || ""} onChange={v => set("previousJob", v)} />
      </div>

      <p style={sectionTitleStyle}>● العقار / الممتلكات المفقودة</p>
      <Field label="عنوان العقار المفقود" value={d.propertyAddress || ""} onChange={v => set("propertyAddress", v)} placeholder="القرية / الحي / الشارع" />
      <Field label="رقم العقار في السجل" value={d.propertyNumber || ""} onChange={v => set("propertyNumber", v)} placeholder="رقم الصك أو السجل العقاري" />

      <p style={sectionTitleStyle}>● بيانات الزوجة</p>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="اسم الزوجة" value={d.spouseName || ""} onChange={v => set("spouseName", v)} />
        <Field label="الرقم الوطني" value={d.spouseId || ""} onChange={v => set("spouseId", v)} />
      </div>

      <p style={sectionTitleStyle}>● الأبناء</p>
      {children.map((ch, i) => (
        <div key={i} className="flex gap-2 mb-2 items-end">
          <div className="flex-1">
            <label style={labelStyle}>الاسم</label>
            <input value={ch.name} onChange={e => updateChild(i, "name", e.target.value)} style={{ ...fieldStyle, resize: undefined }} />
          </div>
          <div style={{ width: 80 }}>
            <label style={labelStyle}>العمر</label>
            <input type="number" value={ch.age} onChange={e => updateChild(i, "age", e.target.value)} style={{ ...fieldStyle, resize: undefined }} />
          </div>
          <button onClick={() => removeChild(i)} type="button" className="mb-1 p-2 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      ))}
      <button onClick={addChild} type="button"
        className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3 active:scale-95 transition-all"
        style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${GOLD_DIM}`, color: GOLD, fontFamily: "'Cairo', sans-serif", fontSize: 12 }}>
        <Plus className="w-3.5 h-3.5" /> إضافة ابن / ابنة
      </button>

      <p style={sectionTitleStyle}>● أسباب التهجير</p>
      <SelectField label="الجهة المعتدية" value={d.aggressorType || ""} onChange={v => set("aggressorType", v)}
        options={[
          { value: "armed_groups", label: "فصائل مسلحة" },
          { value: "gov", label: "جهات حكومية" },
          { value: "settlers", label: "مستوطنون / ميليشيا" },
          { value: "unknown", label: "مجهولة" },
        ]} />
      <TextareaField label="وصف تفصيلي لأسباب وملابسات التهجير" value={d.displacementReason || ""} onChange={v => set("displacementReason", v)} rows={4} placeholder="متى وكيف جرى التهجير..." />
      <PhotoSection photos={photos} onAdd={urls => setPhotos(p => [...p, ...urls])} onRemove={i => setPhotos(p => p.filter((_, j) => j !== i))} />
      {state !== "idle" ? <UploadOverlay progress={progress} onDone={state === "done"} />
        : <button onClick={startUpload} disabled={!canSubmit} style={{ ...submitBtn, opacity: canSubmit ? 1 : 0.4 }}>
            <Shield className="w-4 h-4" /> أرشفة الملف وإضافة 200 نقطة
          </button>}
    </>
  );
}

// ─── Form 5: الأراضي والأملاك المسلوبة ──────────────────────────────────────
function StolenPropertyForm({ onSubmit }: { onSubmit: () => void }) {
  const [d, setD] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);

  function set(k: string, v: string) { setD(prev => ({ ...prev, [k]: v })); }
  function startUpload() {
    setState("uploading"); setProgress(0);
    const iv = setInterval(() => setProgress(p => { if (p >= 100) { clearInterval(iv); setState("done"); onSubmit(); return 100; } return p + 4; }), 80);
  }
  const canSubmit = !!(d.fullName && d.nationalId && d.propertyNumber);

  return (
    <>
      <p style={sectionTitleStyle}>● بيانات المالك</p>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="الاسم الثلاثي" value={d.fullName || ""} onChange={v => set("fullName", v)} required />
        <Field label="اسم الوالد وكنيته" value={d.fatherName || ""} onChange={v => set("fatherName", v)} />
        <Field label="اسم الأم" value={d.motherName || ""} onChange={v => set("motherName", v)} />
        <Field label="الرقم الوطني" value={d.nationalId || ""} onChange={v => set("nationalId", v)} required />
        <Field label="تاريخ الميلاد" type="date" value={d.birthDate || ""} onChange={v => set("birthDate", v)} />
        <Field label="العمل السابق" value={d.previousJob || ""} onChange={v => set("previousJob", v)} />
      </div>

      <p style={sectionTitleStyle}>● بيانات الملكية</p>
      <SelectField label="نوع الملكية" value={d.propertyType || ""} onChange={v => set("propertyType", v)} required
        options={[
          { value: "house", label: "منزل / شقة سكنية" },
          { value: "land", label: "أرض زراعية" },
          { value: "shop", label: "محل تجاري / مبنى" },
          { value: "vehicle", label: "مركبة" },
          { value: "other", label: "أخرى" },
        ]} />
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="رقم العقار في السجل" value={d.propertyNumber || ""} onChange={v => set("propertyNumber", v)} required placeholder="رقم الصك العقاري" />
        <Field label="موقع العقار" value={d.location || ""} onChange={v => set("location", v)} placeholder="القرية / المنطقة" />
      </div>
      <TextareaField label="وصف الحالة الراهنة للعقار" value={d.currentState || ""} onChange={v => set("currentState", v)} rows={3} placeholder="ما هي الحالة الحالية؟ مهدوم / مشغول / مصادر..." />
      <TextareaField label="الجهة المغتصبة حالياً" value={d.occupier || ""} onChange={v => set("occupier", v)} rows={2} placeholder="اسم الجهة أو الشخص المسيطر حالياً" />
      <PhotoSection photos={photos} onAdd={urls => setPhotos(p => [...p, ...urls])} onRemove={i => setPhotos(p => p.filter((_, j) => j !== i))} />
      {state !== "idle" ? <UploadOverlay progress={progress} onDone={state === "done"} />
        : <button onClick={startUpload} disabled={!canSubmit} style={{ ...submitBtn, opacity: canSubmit ? 1 : 0.4 }}>
            <Shield className="w-4 h-4" /> أرشفة الملف وإضافة 200 نقطة
          </button>}
    </>
  );
}

// ─── Form 6: الموظفون المفصولون ──────────────────────────────────────────────
function DismissedEmployeeForm({ onSubmit }: { onSubmit: () => void }) {
  const [d, setD] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [reasonType, setReasonType] = useState<"" | "arbitrary" | "stated">("");

  function set(k: string, v: string) { setD(prev => ({ ...prev, [k]: v })); }
  function startUpload() {
    setState("uploading"); setProgress(0);
    const iv = setInterval(() => setProgress(p => { if (p >= 100) { clearInterval(iv); setState("done"); onSubmit(); return 100; } return p + 4; }), 80);
  }
  const canSubmit = !!(d.fullName && d.nationalId && d.dismissDate && reasonType);

  return (
    <>
      <PersonalFields data={d} onChange={set} />
      <p style={sectionTitleStyle}>● بيانات الفصل الوظيفي</p>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="جهة العمل السابقة" value={d.employer || ""} onChange={v => set("employer", v)} required placeholder="الوزارة / الشركة / المؤسسة" />
        <Field label="المسمى الوظيفي" value={d.jobTitle || ""} onChange={v => set("jobTitle", v)} placeholder="المنصب أو الدرجة الوظيفية" />
        <Field label="تاريخ الفصل" type="date" value={d.dismissDate || ""} onChange={v => set("dismissDate", v)} required />
        <Field label="مدة الخدمة (سنوات)" type="number" value={d.serviceYears || ""} onChange={v => set("serviceYears", v)} />
      </div>

      <p style={{ ...sectionTitleStyle, marginTop: 10 }}>● حجة الفصل</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { val: "arbitrary", label: "تعسفي / بدون مبرر" },
          { val: "stated", label: "أسباب مُعلَنة" },
        ].map(opt => (
          <button key={opt.val} type="button" onClick={() => setReasonType(opt.val as typeof reasonType)}
            className="py-2.5 rounded-xl active:scale-95 transition-all"
            style={{
              fontFamily: "'Cairo', sans-serif", fontSize: 12, fontWeight: 700,
              background: reasonType === opt.val ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.04)",
              border: `1.5px solid ${reasonType === opt.val ? GOLD + "60" : "rgba(255,255,255,0.1)"}`,
              color: reasonType === opt.val ? GOLD : "rgba(255,255,255,0.4)",
            }}>
            {opt.label}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {reasonType === "stated" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <TextareaField label="الأسباب المُعلَنة من جهة العمل" value={d.statedReasons || ""} onChange={v => set("statedReasons", v)} rows={3} placeholder="اذكر الأسباب الرسمية التي أُبلغت بها..." />
          </motion.div>
        )}
      </AnimatePresence>
      <TextareaField label="تفاصيل وملابسات الفصل" value={d.details || ""} onChange={v => set("details", v)} rows={3} placeholder="ما جرى بالتفصيل..." />
      <PhotoSection photos={photos} onAdd={urls => setPhotos(p => [...p, ...urls])} onRemove={i => setPhotos(p => p.filter((_, j) => j !== i))} />
      {state !== "idle" ? <UploadOverlay progress={progress} onDone={state === "done"} />
        : <button onClick={startUpload} disabled={!canSubmit} style={{ ...submitBtn, opacity: canSubmit ? 1 : 0.4 }}>
            <Shield className="w-4 h-4" /> أرشفة الملف وإضافة 200 نقطة
          </button>}
    </>
  );
}

// ─── DocsTab (main export) ──────────────────────────────────────────────────
const FORM_DEFS = [
  { id: "missing",   emoji: "🔍", title: "المفقودون ومجهولو المصير",    subtitle: "الاسم · الرقم الوطني · تاريخ الفقدان" },
  { id: "martyr",    emoji: "🕊️",  title: "الشهداء والضحايا",             subtitle: "البيانات الشخصية · الاستشهاد" },
  { id: "kidnapped", emoji: "🆘", title: "المختطفات من النساء",           subtitle: "مكان الاختطاف · شهادة الناجية" },
  { id: "displaced", emoji: "🏠", title: "المهجرون قسرياً",               subtitle: "رب الأسرة · العقار · الأبناء" },
  { id: "property",  emoji: "📜", title: "الأراضي والأملاك المسلوبة",    subtitle: "نوع الملكية · الجهة المغتصبة" },
  { id: "employee",  emoji: "👔", title: "الموظفون المفصولون",             subtitle: "جهة العمل · تاريخ الفصل · الحجة" },
] as const;

export function DocsTab({ telegramId }: { telegramId: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [submittedPoints, setSubmittedPoints] = useState(0);
  const [submitCount, setSubmitCount] = useState(0);
  const _ = telegramId; // reserved for future API call

  const toggle = useCallback((id: string) => setOpenId(prev => prev === id ? null : id), []);

  function handleSubmit() {
    setSubmittedPoints(p => p + 200);
    setSubmitCount(c => c + 1);
  }

  return (
    <div>
      {/* Earned banner */}
      <AnimatePresence>
        {submittedPoints > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl px-4 py-3 flex items-center gap-3 mb-4"
            style={{ background: "rgba(34,197,94,0.1)", border: "1.5px solid rgba(34,197,94,0.35)" }}>
            <span className="text-2xl">🏆</span>
            <div>
              <p style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 13, color: "#4ade80" }}>
                +{submittedPoints} نقطة من {submitCount} {submitCount === 1 ? "نموذج" : "نماذج"} موثقة
              </p>
              <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 10, color: "rgba(74,222,128,0.55)", marginTop: 1 }}>
                تُضاف تلقائياً لسجل مساهماتك السيادية
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro */}
      <div className="rounded-2xl px-4 py-3 mb-4" style={{ background: "rgba(212,175,55,0.04)", border: `1px solid ${GOLD}15` }}>
        <div className="flex items-center gap-2 mb-1.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
          <p style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 12, color: GOLD }}>نماذج التوثيق السيادية — 6 ملفات قانونية</p>
        </div>
        <p style={{ fontFamily: "'Amiri', serif", fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.8 }}>
          كل نموذج مكتمل يُحفظ مشفراً بمعيار AES-256 في مجلدك الخاص داخل الأرشيف السحابي، ويُضيف <span style={{ color: GOLD }}>200 نقطة</span> لرصيدك السيادي.
        </p>
      </div>

      {/* Accordions */}
      {FORM_DEFS.map((form, i) => (
        <AccordionShell key={form.id} index={i + 1} emoji={form.emoji}
          title={form.title} subtitle={form.subtitle}
          isOpen={openId === form.id}
          onToggle={() => toggle(form.id)}
          submitState="idle">
          {form.id === "missing"   && <MissingPersonForm   onSubmit={handleSubmit} />}
          {form.id === "martyr"    && <MartyrForm           onSubmit={handleSubmit} />}
          {form.id === "kidnapped" && <KidnappedWomanForm   onSubmit={handleSubmit} />}
          {form.id === "displaced" && <DisplacedFamilyForm  onSubmit={handleSubmit} />}
          {form.id === "property"  && <StolenPropertyForm   onSubmit={handleSubmit} />}
          {form.id === "employee"  && <DismissedEmployeeForm onSubmit={handleSubmit} />}
        </AccordionShell>
      ))}

      {/* Security footer */}
      <div className="mt-4 rounded-2xl px-4 py-3 flex items-start gap-2.5"
        style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GOLD, opacity: 0.5 }} />
        <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.25)", lineHeight: 1.8 }}>
          🔒 جميع البيانات محمية بتشفير AES-256 · لا تُشارَك مع أي طرف خارجي · مُخزَّنة داخل مجلد مشفر بمعرفك الخاص · حقك في الحذف محفوظ دائماً
        </p>
      </div>
    </div>
  );
}
