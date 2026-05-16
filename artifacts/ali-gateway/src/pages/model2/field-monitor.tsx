import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Radio, MapPin, Camera, BarChart2, ShieldAlert, RefreshCw } from "lucide-react";

const GOLD  = "#d4af37";
const GREEN = "#22c55e";
const BLUE  = "#60a5fa";
const RED   = "#ef4444";

interface PlatformStats {
  totalUsers:    number;
  totalPoints:   number;
  totalArticles: number;
}

const MONITOR_ACTIVITIES = [
  {
    Icon: Camera,
    color: GREEN,
    title: "التوثيق بالصور",
    desc: "التقط وارفع صوراً ميدانية محقّقة في سجل موزّع آمن.",
    status: "نشط",
    count: 0,
  },
  {
    Icon: MapPin,
    color: GOLD,
    title: "تحديد المواقع",
    desc: "ضع إشارات جغرافية للمناطق والمواقع الاستراتيجية.",
    status: "نشط",
    count: 0,
  },
  {
    Icon: BarChart2,
    color: BLUE,
    title: "الإحصاءات الميدانية",
    desc: "بيانات تراكمية وتقارير حضور ميداني في الوقت الفعلي.",
    status: "نشط",
    count: 0,
  },
  {
    Icon: ShieldAlert,
    color: RED,
    title: "مشروع Bargylos",
    desc: "منظومة سرية لجمع البيانات الحساسة — يتطلب تصريحاً خاصاً.",
    status: "مقيّد",
    count: 0,
  },
];

const LIVE_FEED = [
  { id: 1, type: "توثيق", text: "رُصدت مواجهة في المنطقة الشمالية — جاري التحقق.", time: "منذ 5 دقائق",  color: RED   },
  { id: 2, type: "تحديث", text: "انضم حارس جديد من المنطقة الساحلية إلى الشبكة.",   time: "منذ 12 دقيقة", color: GREEN },
  { id: 3, type: "تقرير", text: "تم رفع وتحليل وثيقة حقوقية جديدة بنجاح.",          time: "منذ 28 دقيقة", color: BLUE  },
  { id: 4, type: "توثيق", text: "إشارة جغرافية جديدة تم تثبيتها وتحقيقها.",         time: "منذ 43 دقيقة", color: GOLD  },
];

function StatCard({ label, value, loading, accent }: { label: string; value: string; loading: boolean; accent: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
      className="flex-1 rounded-2xl p-3 text-center"
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${accent}20` }}>
      {loading ? (
        <div className="h-8 flex items-center justify-center">
          <div className="w-5 h-5 border-2 rounded-full animate-spin"
            style={{ borderColor: `${accent}40`, borderTopColor: accent }} />
        </div>
      ) : (
        <p className="font-arabic text-2xl font-bold mb-0.5" style={{ color: accent }}>{value}</p>
      )}
      <p className="font-arabic text-white/40 text-[10px]">{label}</p>
    </motion.div>
  );
}

export function FieldMonitorSection({ telegramId: _telegramId }: { telegramId: string }) {
  const [stats,    setStats]    = useState<PlatformStats | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [refresh,  setRefresh]  = useState(0);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/users/stats")
      .then(r => (r.ok ? r.json() as Promise<PlatformStats> : Promise.reject()))
      .then(data => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [refresh]);

  const handleRefresh = () => {
    setSpinning(true);
    setRefresh(r => r + 1);
    setTimeout(() => setSpinning(false), 800);
  };

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="px-4 pt-4 pb-24 space-y-5" dir="rtl">

        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: RED }} />
            <span className="font-arabic text-white/70 text-sm font-bold">الرصد الميداني المباشر</span>
          </div>
          <button onClick={handleRefresh}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${GOLD}15` }}>
            <RefreshCw size={14} color={GOLD} className={spinning ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Platform stats */}
        <div>
          <p className="font-arabic text-white/30 text-xs font-bold tracking-wider mb-2">إحصاءات المنصة</p>
          <div className="flex gap-2">
            <StatCard label="حارس نشط"    value={stats ? stats.totalUsers.toLocaleString("ar-SA")    : "—"} loading={loading} accent={GREEN} />
            <StatCard label="وثيقة مرفوعة" value={stats ? stats.totalArticles.toLocaleString("ar-SA") : "—"} loading={loading} accent={GOLD}  />
            <StatCard label="نقطة مجتمعية" value={stats ? stats.totalPoints.toLocaleString("ar-SA")   : "—"} loading={loading} accent={BLUE}  />
          </div>
        </div>

        {/* Activities */}
        <div>
          <p className="font-arabic text-white/30 text-xs font-bold tracking-wider mb-3">أنشطة الرصد</p>
          <div className="space-y-3">
            {MONITOR_ACTIVITIES.map((activity, idx) => {
              const Icon = activity.Icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.07 }}
                  className="rounded-2xl p-4 flex items-start gap-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${activity.color}18` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${activity.color}12`, border: `1px solid ${activity.color}28` }}>
                    <Icon size={18} color={activity.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-arabic font-bold text-white/90 text-sm">{activity.title}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: `${activity.color}15`, color: activity.color, border: `1px solid ${activity.color}30` }}>
                        {activity.status}
                      </span>
                    </div>
                    <p className="font-arabic text-white/45 text-xs leading-relaxed">{activity.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Live feed */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Radio size={12} color={RED} />
            <p className="font-arabic text-white/30 text-xs font-bold tracking-wider">آخر التحديثات</p>
          </div>
          <div className="space-y-2">
            {LIVE_FEED.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.08 }}
                className="flex gap-3 rounded-2xl p-3"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${item.color}12` }}>
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: item.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: `${item.color}15`, color: item.color }}>
                      {item.type}
                    </span>
                    <span className="text-white/25 text-[10px]">{item.time}</span>
                  </div>
                  <p className="font-arabic text-white/65 text-xs leading-relaxed">{item.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
