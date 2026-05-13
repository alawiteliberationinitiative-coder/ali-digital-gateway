import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, FileText, Scale, BarChart2, ChevronDown, Download, Eye, Shield } from "lucide-react";

const GOLD = "#d4af37";
const GOLD_DIM = "rgba(212,175,55,0.35)";

// ─── Static archive categories ───────────────────────────────────────────────
const ARCHIVE_CATEGORIES = [
  {
    id: "legal",
    icon: "⚖️",
    lucide: Scale,
    title: "التقارير القانونية والحقوقية",
    desc: "وثائق قانونية رسمية وتقارير حقوق الإنسان المعتمدة",
    count: 47,
    isNew: true,
    reports: [
      { title: "تقرير الانتهاكات الموثقة 2024–2026", date: "مارس 2026", pages: 84, views: 3240, authors: "فريق ADAR القانوني" },
      { title: "إحصائيات المفقودين في منطقة الساحل", date: "فبراير 2026", pages: 32, views: 1830, authors: "وحدة الرصد الميداني" },
      { title: "الإطار القانوني لملفات الملكية والتهجير", date: "يناير 2026", pages: 56, views: 1620, authors: "مستشارون قانونيون مستقلون" },
      { title: "تصنيف الانتهاكات وفق القانون الدولي الإنساني", date: "ديسمبر 2025", pages: 41, views: 980, authors: "فريق ADAR القانوني" },
    ],
  },
  {
    id: "field",
    icon: "🔬",
    lucide: Eye,
    title: "الدراسات الميدانية",
    desc: "أبحاث ميدانية ودراسات اجتماعية معمّقة",
    count: 23,
    isNew: false,
    reports: [
      { title: "دراسة أثر التهجير القسري على الأسرة العلوية", date: "مارس 2026", pages: 68, views: 2100, authors: "مركز ADAR للبحث الاجتماعي" },
      { title: "خريطة بيانية لمناطق التهجير 2020–2026", date: "يناير 2026", pages: 28, views: 1450, authors: "وحدة الرصد الجغرافي" },
      { title: "شهادات الناجين — توثيق معمّق لحالات الاختطاف", date: "نوفمبر 2025", pages: 93, views: 870, authors: "فريق الشهادات الميدانية" },
    ],
  },
  {
    id: "statistical",
    icon: "📊",
    lucide: BarChart2,
    title: "الدراسات الإحصائية",
    desc: "بيانات وأرقام موثقة لدعم القضايا أمام المحاكم الدولية",
    count: 15,
    isNew: false,
    reports: [
      { title: "أطلس الأضرار العقارية في المناطق المتضررة", date: "فبراير 2026", pages: 112, views: 2890, authors: "قسم المعلوماتية والبيانات" },
      { title: "مؤشرات التوثيق — تقرير ربع سنوي Q1 2026", date: "مارس 2026", pages: 22, views: 1200, authors: "وحدة الإحصاء" },
    ],
  },
  {
    id: "research",
    icon: "📝",
    lucide: FileText,
    title: "المقالات والدراسات الأكاديمية",
    desc: "أوراق بحثية محكّمة للنشر والتوثيق الأكاديمي",
    count: 31,
    isNew: true,
    reports: [
      { title: "السيادة الرقمية كأداة للحفاظ على الهوية", date: "مارس 2026", pages: 18, views: 4100, authors: "د. خالد السعيد" },
      { title: "الأرشفة الرقمية وضمانات العدالة الانتقالية", date: "يناير 2026", pages: 24, views: 3320, authors: "فريق البحث الأكاديمي" },
      { title: "نماذج الأرشفة السيادية في تجارب دولية مقارنة", date: "ديسمبر 2025", pages: 36, views: 1780, authors: "مركز ADAR للدراسات" },
    ],
  },
];

// ─── Report Item ──────────────────────────────────────────────────────────────
function ReportItem({ report, index }: {
  report: { title: string; date: string; pages: number; views: number; authors: string };
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-xl px-3 py-2.5"
      style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${GOLD}12` }}
    >
      <div className="flex items-start gap-2" dir="rtl">
        <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
          style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${GOLD_DIM}` }}>
          <FileText style={{ width: 12, height: 12, color: GOLD }} />
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
            {report.title}
          </p>
          <p style={{ fontFamily: "'Amiri', serif", fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            {report.authors}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: 10, color: "rgba(212,175,55,0.5)" }}>
              {report.date}
            </span>
            <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
              {report.pages} صفحة
            </span>
            <span className="flex items-center gap-0.5" style={{ fontFamily: "'Cairo', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
              <Eye style={{ width: 9, height: 9 }} />
              {report.views.toLocaleString("ar-SA")}
            </span>
          </div>
        </div>
        <button
          className="flex-shrink-0 p-1.5 rounded-lg active:scale-90 transition-all"
          style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${GOLD}18` }}
        >
          <Download style={{ width: 12, height: 12, color: GOLD }} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Category Accordion ───────────────────────────────────────────────────────
function CategoryBlock({ cat, index }: {
  cat: typeof ARCHIVE_CATEGORIES[0];
  index: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="rounded-2xl overflow-hidden mb-3"
      style={{ background: "rgba(0,0,0,0.3)", border: `1.5px solid ${open ? GOLD + "40" : GOLD + "18"}` }}
    >
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-right active:opacity-80 transition-opacity"
        style={{ background: open ? "rgba(212,175,55,0.06)" : "rgba(212,175,55,0.02)" }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${GOLD_DIM}` }}>
          {cat.icon}
        </div>
        <div className="flex-1 text-right">
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 13, color: GOLD }}>
              {cat.title}
            </span>
            {cat.isNew && (
              <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: 9, color: "#4ade80", background: "rgba(34,197,94,0.12)", borderRadius: 8, padding: "1px 6px", border: "1px solid rgba(34,197,94,0.25)" }}>
                جديد
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p style={{ fontFamily: "'Amiri', serif", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{cat.desc}</p>
            <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: 10, color: "rgba(212,175,55,0.45)", flexShrink: 0 }}>
              {cat.count} ملف
            </span>
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown style={{ width: 16, height: 16, color: GOLD_DIM }} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pt-2 pb-4 space-y-2" style={{ borderTop: `1px solid ${GOLD}12` }}>
              {cat.reports.map((r, i) => <ReportItem key={i} report={r} index={i} />)}
              <button
                className="w-full py-2 rounded-xl font-arabic text-xs"
                style={{ background: "transparent", border: `1px dashed ${GOLD}22`, color: "rgba(212,175,55,0.4)" }}
              >
                عرض كافة الملفات ({cat.count})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Locked State ─────────────────────────────────────────────────────────────
function LockedState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{ background: "rgba(212,175,55,0.07)", border: `2px solid ${GOLD}25` }}>
        <Lock style={{ width: 36, height: 36, color: GOLD, opacity: 0.45 }} />
      </div>
      <div>
        <p style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 16, color: "rgba(212,175,55,0.7)" }}>
          أرشيف البحث — للأعضاء الموثقين
        </p>
        <p style={{ fontFamily: "'Amiri', serif", fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 6, lineHeight: 1.8 }}>
          يتطلب الوصول إلى الأرشيف البحثي تسجيل عضوية<br />
          مؤكدة في منظومة ADAR الرقمية.
        </p>
      </div>
      <div className="rounded-2xl px-5 py-3 mt-2"
        style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${GOLD}18` }}>
        <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 11, color: "rgba(212,175,55,0.55)", lineHeight: 1.8 }}>
          🔐 سجّل في المنصة أولاً للحصول على صلاحية الوصول<br />
          📋 أكمل ملف التوثيق الشخصي لتفعيل العضوية<br />
          🏆 الأعضاء أصحاب 500+ نقطة يحصلون على وصول كامل
        </p>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function ArchiveTab({ telegramId }: { telegramId: string }) {
  if (!telegramId) return <LockedState />;

  return (
    <div>
      {/* Header */}
      <div className="rounded-2xl px-4 py-3 mb-4"
        style={{ background: "rgba(212,175,55,0.04)", border: `1px solid ${GOLD}18` }}>
        <div className="flex items-center gap-2 mb-1.5">
          <Shield style={{ width: 16, height: 16, color: GOLD, flexShrink: 0 }} />
          <p style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 12, color: GOLD }}>
            الأرشيف البحثي السيادي — للأعضاء الموثقين فقط
          </p>
        </div>
        <p style={{ fontFamily: "'Amiri', serif", fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.8 }}>
          يضم الأرشيف أكثر من <span style={{ color: GOLD }}>116 ملفاً</span> بحثياً وقانونياً وإحصائياً
          موثقاً بمعيار الأرشفة السيادية. جميع الملفات مشفرة ومرجّعة قانونياً.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "ملف بحثي", value: "116" },
          { label: "صفحة موثقة", value: "2.8k" },
          { label: "مراجعة علمية", value: "34" },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl px-3 py-2.5 text-center"
            style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${GOLD}12` }}>
            <p style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 900, fontSize: 18, color: GOLD }}>
              {stat.value}
            </p>
            <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Category Accordions */}
      {ARCHIVE_CATEGORIES.map((cat, i) => (
        <CategoryBlock key={cat.id} cat={cat} index={i} />
      ))}

      {/* Footer security note */}
      <div className="mt-4 rounded-2xl px-4 py-3 flex items-start gap-2.5"
        style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <Shield style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2, color: GOLD, opacity: 0.45 }} />
        <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.22)", lineHeight: 1.9 }}>
          🔒 جميع الملفات مصنّفة وفق درجات السرية · متاحة للأعضاء الموثقين فقط ·
          البيانات الحساسة محمية بتشفير AES-256 · لا تُنشر خارج المنظومة السيادية
        </p>
      </div>
    </div>
  );
}
