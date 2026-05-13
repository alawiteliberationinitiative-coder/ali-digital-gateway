import { motion } from "framer-motion";
import { ChevronRight, Globe, Megaphone, Users, FileText } from "lucide-react";

const slide = { initial: { x: -40, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 40, opacity: 0 }, transition: { duration: 0.3 } };

const countries = ["🇩🇪 ألمانيا", "🇸🇪 السويد", "🇨🇦 كندا", "🇦🇺 أستراليا", "🇫🇷 فرنسا", "🇬🇧 بريطانيا", "🇺🇸 أمريكا", "🇳🇱 هولندا"];

const programs = [
  { icon: Megaphone, title: "المناصرة الدولية", desc: "حملات للتعريف بقضية الطائفة في المحافل والمنظمات الدولية." },
  { icon: Globe, title: "الشبكة الدبلوماسية", desc: "بناء علاقات مع منظمات حقوق الإنسان وأصحاب القرار." },
  { icon: Users, title: "لقاءات المهجر", desc: "تنظيم اجتماعات دورية للمجتمعات العلوية في الخارج." },
  { icon: FileText, title: "إنتاج المحتوى", desc: "توثيق ونشر روايات موثّقة بلغات متعددة." },
];

export function AmbassadorsSection({ onBack }: { onBack: () => void }) {
  return (
    <motion.div className="flex flex-col h-full" dir="rtl" {...slide}>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-primary/10 text-primary active:scale-95 transition-transform">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-arabic font-bold text-primary text-lg leading-tight">سفراء القضية</h1>
          <p className="font-arabic text-muted-foreground text-xs">الشبكة الدولية والعمل الدبلوماسي</p>
        </div>
        <span className="mr-auto text-2xl">🌍</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 pb-20">
        {/* Globe banner */}
        <div className="bg-card border border-[#d4af37]/40 rounded-2xl p-5 text-center"
          style={{ background: "linear-gradient(135deg, #001a10 0%, #002b1b 100%)", boxShadow: "0 4px 0 rgba(212,175,55,0.3)" }}>
          <div className="text-5xl mb-3">🌐</div>
          <p className="font-arabic text-[#d4af37] font-bold text-xl mb-1">٤٠+ دولة</p>
          <p className="font-arabic text-white/60 text-sm">شبكة سفراء القضية حول العالم</p>
        </div>

        {/* Countries */}
        <div>
          <h2 className="font-arabic font-bold text-foreground text-base mb-3">الدول النشطة</h2>
          <div className="flex flex-wrap gap-2">
            {countries.map((c) => (
              <span key={c} className="font-arabic text-sm bg-card border border-border rounded-full px-3 py-1.5 text-foreground/80">{c}</span>
            ))}
            <span className="font-arabic text-sm bg-primary/10 border border-primary/30 rounded-full px-3 py-1.5 text-primary">+٣٢ دولة أخرى</span>
          </div>
        </div>

        {/* Programs */}
        <h2 className="font-arabic font-bold text-foreground text-base">برامج السفراء</h2>
        {programs.map((p, i) => (
          <motion.div key={p.title}
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="flex gap-4 items-start bg-card border border-border rounded-2xl p-5"
            style={{ boxShadow: "0 3px 0 rgba(93,173,226,0.2)" }}>
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <p.icon className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-arabic font-bold text-foreground text-base mb-1">{p.title}</h3>
              <p className="font-arabic text-muted-foreground text-sm leading-5">{p.desc}</p>
            </div>
          </motion.div>
        ))}

        {/* Join CTA */}
        <button className="w-full bg-primary text-primary-foreground rounded-2xl py-4 font-arabic font-bold text-lg active:scale-[0.98] transition-transform"
          style={{ boxShadow: "0 4px 0 rgba(0,0,0,0.4)" }}>
          التقديم كسفير
        </button>
      </div>
    </motion.div>
  );
}
