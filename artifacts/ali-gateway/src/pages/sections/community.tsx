import { motion } from "framer-motion";
import { ChevronRight, MessageCircle, Lock } from "lucide-react";

const slide = { initial: { x: -40, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 40, opacity: 0 }, transition: { duration: 0.3 } };

const rooms = [
  { emoji: "🏛", name: "الرئيسية العامة", desc: "النقاشات العامة والإعلانات", members: "٨٤٢", locked: false },
  { emoji: "🌿", name: "حراس الأرض", desc: "تبادل التقارير والتوثيق", members: "٢٨٩", locked: false },
  { emoji: "🌍", name: "غرفة السفراء", desc: "التنسيق الدولي والمهجر", members: "١٥٦", locked: false },
  { emoji: "💰", name: "اقتصاد $MDD", desc: "نقاشات التوكن والعقود الذكية", members: "٤٣١", locked: false },
  { emoji: "🔐", name: "القيادة المركزية", desc: "للأعضاء المؤهّلين فقط", members: "٤٧", locked: true },
  { emoji: "⚔️", name: "بروتوكول Bargylos", desc: "سري · يتطلب تصريح خاص", members: "٢٣", locked: true },
];

export function CommunitySection({ onBack }: { onBack: () => void }) {
  return (
    <motion.div className="flex flex-col min-h-full" dir="rtl" {...slide}>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-primary/10 text-primary active:scale-95 transition-transform">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-arabic font-bold text-primary text-lg leading-tight">المجتمع</h1>
          <p className="font-arabic text-muted-foreground text-xs">غرف النقاش والتواصل</p>
        </div>
        <span className="mr-auto text-2xl">💬</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 pb-20">
        {/* Online banner */}
        <div className="bg-card border border-primary/30 rounded-2xl p-4 flex items-center gap-3"
          style={{ boxShadow: "0 3px 0 rgba(212,175,55,0.2)" }}>
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          <div className="font-arabic text-sm text-foreground/80">
            <span className="font-bold text-primary">٣٤٧</span> عضو متصل الآن
          </div>
        </div>

        {/* Rooms */}
        {rooms.map((r, i) => (
          <motion.button key={r.name}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="w-full flex gap-4 items-center bg-card border border-border rounded-2xl p-4 text-right active:scale-[0.98] transition-transform"
            style={{ boxShadow: "0 3px 0 rgba(212,175,55,0.1)", opacity: r.locked ? 0.7 : 1 }}>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-2xl">
              {r.emoji}
            </div>
            <div className="flex-1 text-right">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {r.locked && <Lock className="w-3.5 h-3.5 text-[#d4af37]" />}
                </div>
                <h3 className="font-arabic font-bold text-foreground text-base">{r.name}</h3>
              </div>
              <p className="font-arabic text-muted-foreground text-xs mt-0.5">{r.desc}</p>
            </div>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-primary/50" />
              <span className="font-arabic text-[10px] text-muted-foreground">{r.members}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
