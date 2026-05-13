import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Camera, MapPin, BarChart2, ShieldAlert } from "lucide-react";

const slide = { initial: { x: -40, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 40, opacity: 0 }, transition: { duration: 0.3 } };

interface PlatformStats {
  totalUsers:    number;
  totalPoints:   number;
  totalArticles: number;
}

function toArabicNumerals(n: number): string {
  return n.toLocaleString("ar-SA");
}

const activities = [
  { icon: Camera,     color: "#22c55e", title: "التوثيق بالصور",      desc: "التقط صوراً ميدانية وارفعها للتحقق والحفظ في السجل الموزّع." },
  { icon: MapPin,     color: "#d4af37", title: "تحديد المواقع",        desc: "ضع إشارات جغرافية دقيقة للمناطق والمواقع ذات الأهمية." },
  { icon: BarChart2,  color: "#3b82f6", title: "الإحصاءات الميدانية", desc: "اطّلع على البيانات التراكمية وتقارير الحضور الميداني." },
  { icon: ShieldAlert,color: "#f59e0b", title: "مشروع Bargylos",       desc: "المنظومة السرية لجمع وتحليل البيانات الحساسة — يتطلب تصريحاً خاصاً." },
];

function StatCard({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="bg-card border border-border rounded-2xl p-4 text-center"
      style={{ boxShadow: "0 3px 0 rgba(212,175,55,0.2)" }}>
      {loading ? (
        <div className="h-9 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-[#d4af37] border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="font-arabic text-3xl font-bold text-primary mb-1">{value}</div>
      )}
      <div className="font-arabic text-xs text-muted-foreground">{label}</div>
    </motion.div>
  );
}

export function GuardiansSection({ onBack }: { onBack: () => void }) {
  const [stats,   setStats]   = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/stats")
      .then(r => r.ok ? r.json() as Promise<PlatformStats> : Promise.reject())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const statCards = [
    { label: "تقرير موثّق",    value: stats ? toArabicNumerals(stats.totalArticles) : "—" },
    { label: "منطقة مرصودة",  value: "—" },
    { label: "حارس نشط",      value: stats ? toArabicNumerals(stats.totalUsers)    : "—" },
    { label: "نقطة مُكافأة",  value: stats ? toArabicNumerals(stats.totalPoints)   : "—" },
  ];

  return (
    <motion.div className="flex flex-col h-full" dir="rtl" {...slide}>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-primary/10 text-primary active:scale-95 transition-transform">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-arabic font-bold text-primary text-lg leading-tight">حراس الأرض</h1>
          <p className="font-arabic text-muted-foreground text-xs">إحصاءات حقيقية · تتحدّث تلقائياً</p>
        </div>
        <span className="mr-auto text-2xl">🌿</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 pb-20">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} loading={loading} />
          ))}
        </div>

        {/* Activity cards */}
        <h2 className="font-arabic font-bold text-foreground text-lg">النشاطات المتاحة</h2>
        {activities.map((a, i) => (
          <motion.button key={a.title}
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="w-full flex gap-4 items-start bg-card border border-border rounded-2xl p-5 text-right active:scale-[0.98] transition-transform"
            style={{ boxShadow: `0 3px 0 ${a.color}44` }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${a.color}22`, border: `1.5px solid ${a.color}55` }}>
              <a.icon className="w-6 h-6" style={{ color: a.color }} />
            </div>
            <div className="flex-1 text-right">
              <h3 className="font-arabic font-bold text-foreground text-base mb-1">{a.title}</h3>
              <p className="font-arabic text-muted-foreground text-sm leading-relaxed">{a.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
