import { motion } from "framer-motion";
import { ChevronRight, Trophy, Star } from "lucide-react";

const slide = { initial: { x: -40, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 40, opacity: 0 }, transition: { duration: 0.3 } };

const leaders = [
  { rank: 1, pseudo: "الصقر الأسود", aliId: "ALI-2026-0042", pts: 14820, lvl: 12, badge: "🏆" },
  { rank: 2, pseudo: "نجم الشمال", aliId: "ALI-2026-0117", pts: 12340, lvl: 11, badge: "🥈" },
  { rank: 3, pseudo: "حارس الوادي", aliId: "ALI-2026-0008", pts: 11900, lvl: 10, badge: "🥉" },
  { rank: 4, pseudo: "الجبل الأخضر", aliId: "ALI-2026-0251", pts: 9870, lvl: 9, badge: "⭐" },
  { rank: 5, pseudo: "سيف الحقيقة", aliId: "ALI-2026-0399", pts: 8650, lvl: 8, badge: "⭐" },
  { rank: 6, pseudo: "ضوء الفجر", aliId: "ALI-2026-0502", pts: 7420, lvl: 8, badge: "⭐" },
  { rank: 7, pseudo: "ذئب السهل", aliId: "ALI-2026-0631", pts: 6800, lvl: 7, badge: "⭐" },
  { rank: 8, pseudo: "العقاب الذهبي", aliId: "ALI-2026-0744", pts: 6100, lvl: 7, badge: "⭐" },
  { rank: 9, pseudo: "نهر الإباء", aliId: "ALI-2026-0818", pts: 5500, lvl: 6, badge: "⭐" },
  { rank: 10, pseudo: "صخر الصمود", aliId: "ALI-2026-0999", pts: 4950, lvl: 6, badge: "⭐" },
];

const podiumColors: Record<number, string> = { 1: "#d4af37", 2: "#94a3b8", 3: "#cd7f32" };

export function LeaderboardSection({ onBack }: { onBack: () => void }) {
  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <motion.div className="flex flex-col h-full" dir="rtl" {...slide}>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-primary/10 text-primary active:scale-95 transition-transform">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-arabic font-bold text-primary text-lg leading-tight">قائمة المتصدرين</h1>
          <p className="font-arabic text-muted-foreground text-xs">ترتيب الأسماء المستعارة · الولاء السري</p>
        </div>
        <Trophy className="w-6 h-6 text-[#d4af37] mr-auto" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 pb-20">
        {/* Podium */}
        <div className="flex items-end justify-center gap-3 mb-8 px-4">
          {[top3[1], top3[0], top3[2]].map((l, idx) => {
            const displayRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const heights = ["h-24", "h-32", "h-20"];
            return (
              <motion.div key={l.rank}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.15 }}
                className="flex-1 flex flex-col items-center gap-2">
                <div className="text-2xl">{l.badge}</div>
                <div className="font-arabic text-xs text-center text-foreground/80 font-bold leading-tight">{l.pseudo}</div>
                <div className={`w-full ${heights[idx]} rounded-t-2xl flex flex-col items-center justify-center`}
                  style={{ backgroundColor: `${podiumColors[displayRank]}22`, border: `2px solid ${podiumColors[displayRank]}66`, boxShadow: `0 4px 0 ${podiumColors[displayRank]}44` }}>
                  <div className="font-mono font-bold text-lg" style={{ color: podiumColors[displayRank] }}>{displayRank}</div>
                  <div className="font-arabic text-xs text-muted-foreground">{l.pts.toLocaleString()}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Rest of leaderboard */}
        <div className="space-y-2">
          {rest.map((l, i) => (
            <motion.div key={l.rank}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 + 0.3 }}
              className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="font-mono font-bold text-primary text-sm">{l.rank}</span>
              </div>
              <div className="flex-1">
                <div className="font-arabic font-bold text-foreground text-sm">{l.pseudo}</div>
                <div className="font-mono text-muted-foreground text-[10px]">{l.aliId}</div>
              </div>
              <div className="text-left">
                <div className="font-mono text-primary text-sm font-bold">{l.pts.toLocaleString()}</div>
                <div className="flex items-center gap-0.5 justify-end">
                  <Star className="w-2.5 h-2.5 text-[#d4af37]" fill="#d4af37" />
                  <span className="font-arabic text-[10px] text-muted-foreground">LVL {l.lvl}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <p className="font-arabic text-muted-foreground/50 text-xs">الأسماء مستعارة بالكامل · الخصوصية مصونة</p>
        </div>
      </div>
    </motion.div>
  );
}
