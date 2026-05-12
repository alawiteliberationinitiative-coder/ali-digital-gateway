import { motion } from "framer-motion";
import { ChevronRight, Target, Eye, Flame, Globe } from "lucide-react";

const slide = { initial: { x: -40, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 40, opacity: 0 }, transition: { duration: 0.3 } };

const pillars = [
  { icon: Target, title: "رؤيتنا", body: "بناء منظومة رقمية سيادية تُمكّن أبناء الطائفة العلوية من التعبير عن هويّتهم وحفظ حقوقهم في الفضاء الرقمي." },
  { icon: Eye, title: "مهمّتنا", body: "توحيد جهود المغتربين والمقيمين تحت مظلة واحدة عبر أدوات تشفير متقدمة وشبكة ولاء رقمية تضمن الخصوصية." },
  { icon: Flame, title: "قيمنا", body: "الحق لا يموت · الوحدة قبل الفرقة · السيادة الرقمية حق لا امتياز · الشفافية مع الحفاظ على الهوية." },
  { icon: Globe, title: "نطاق عملنا", body: "أكثر من 40 دولة · شبكة من المنسّقين الميدانيين · مشاريع تنموية عبر مبادرة $MDD." },
];

export function AboutSection({ onBack }: { onBack: () => void }) {
  return (
    <motion.div className="flex flex-col min-h-full" dir="rtl" {...slide}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-primary/10 text-primary active:scale-95 transition-transform">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-arabic font-bold text-primary text-lg leading-tight">عن المبادرة</h1>
          <p className="font-arabic text-muted-foreground text-xs">مبادرة التحرير العلوي · A.L.I</p>
        </div>
        <img src="/ali-emblem.jpg" alt="ALI" className="w-10 h-10 object-contain mr-auto opacity-90" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-20">
        {/* Hero card */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-[#d4af37]/60"
          style={{ background: "linear-gradient(135deg, #002b1b 0%, #001a10 100%)", boxShadow: "0 4px 0 #d4af37aa" }}>
          <img src="/ali-emblem.jpg" alt="ALI" className="w-full h-44 object-cover object-top opacity-50" />
          <div className="absolute inset-0 flex flex-col justify-end p-5"
            style={{ background: "linear-gradient(to top, rgba(0,43,27,0.98) 40%, transparent 100%)" }}>
            <p className="font-arabic text-[#d4af37] text-2xl font-bold leading-tight mb-1">مبادرة التحرير العلوي</p>
            <p className="font-arabic text-white/70 text-sm">Alawite Liberation Initiative — A.L.I</p>
            <p className="font-arabic text-white/40 text-xs mt-1">Management of Diversified Development · $MDD</p>
          </div>
        </div>

        {/* Intro */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="font-arabic text-foreground/90 text-sm leading-7 text-right">
            مبادرة التحرير العلوي (A.L.I) هي منظومة رقمية سيادية تأسّست لتوحيد الحضور العلوي في الفضاء الرقمي العالمي، وتمكين الأعضاء من حفظ هويّتهم وبناء اقتصادهم الرقمي عبر عملة $MDD وشبكة نقاط الولاء.
          </p>
        </div>

        {/* Pillars */}
        {pillars.map((p, i) => (
          <motion.div key={p.title}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 + 0.2 }}
            className="bg-card border border-border rounded-2xl p-5 flex gap-4 items-start"
            style={{ boxShadow: "0 3px 0 rgba(212,175,55,0.2)" }}>
            <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <p.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-arabic font-bold text-primary text-base mb-1">{p.title}</h3>
              <p className="font-arabic text-muted-foreground text-sm leading-6">{p.body}</p>
            </div>
          </motion.div>
        ))}

        {/* Motto */}
        <div className="text-center py-4">
          <p className="font-arabic text-[#d4af37]/70 text-lg italic font-bold">❝ حقٌّ لا يموت ❞</p>
        </div>
      </div>
    </motion.div>
  );
}
