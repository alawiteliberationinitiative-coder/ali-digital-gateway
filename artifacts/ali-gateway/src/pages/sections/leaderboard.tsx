import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Trophy, Star } from "lucide-react";

const GOLD = "#d4af37";
const podiumColors: Record<number, string> = { 1: GOLD, 2: "#94a3b8", 3: "#cd7f32" };

interface Leader {
  aliId: string;
  pseudonym: string;
  loyaltyPoints: number;
  level: number;
  rank: string;
}

function rankBadge(i: number) {
  if (i === 0) return "🏆";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return "⭐";
}

export function LeaderboardSection({ onBack }: { onBack: () => void }) {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    fetch("/api/leaderboard?limit=20")
      .then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<Leader[]>; })
      .then(data => { setLeaders(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const top3 = leaders.slice(0, 3);
  const rest  = leaders.slice(3);

  return (
    <motion.div className="flex flex-col h-full" dir="rtl"
      initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.3 }}>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-primary/10 text-primary active:scale-95 transition-transform">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-arabic font-bold text-primary text-lg leading-tight">قائمة المتصدرين</h1>
          <p className="font-arabic text-muted-foreground text-xs">ترتيب حقيقي · يتحدّث تلقائياً</p>
        </div>
        <Trophy className="w-6 h-6 text-[#d4af37] mr-auto" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 pb-20">

        {/* Loading */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-[#d4af37] border-t-transparent animate-spin" />
              <p className="font-arabic text-white/40 text-sm">جارٍ تحميل البيانات الحقيقية...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-16">
            <p className="font-arabic text-white/40 text-sm">تعذّر تحميل القائمة. تحقق من الاتصال.</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && leaders.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🏁</p>
            <p className="font-arabic text-white/50 text-sm">لا يوجد أعضاء في القائمة بعد</p>
            <p className="font-arabic text-white/25 text-xs mt-1">كن أول المتصدرين!</p>
          </div>
        )}

        {/* Podium — only when ≥3 users */}
        {!loading && !error && top3.length >= 3 && (
          <div className="flex items-end justify-center gap-3 mb-8 px-4">
            {[top3[1], top3[0], top3[2]].map((l, idx) => {
              const displayRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
              const heights = ["h-24", "h-32", "h-20"];
              return (
                <motion.div key={l.aliId}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.15 }}
                  className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-2xl">{rankBadge(displayRank - 1)}</div>
                  <div className="font-arabic text-xs text-center text-foreground/80 font-bold leading-tight truncate w-full px-1">{l.pseudonym}</div>
                  <div className={`w-full ${heights[idx]} rounded-t-2xl flex flex-col items-center justify-center`}
                    style={{
                      backgroundColor: `${podiumColors[displayRank]}22`,
                      border: `2px solid ${podiumColors[displayRank]}66`,
                      boxShadow: `0 4px 0 ${podiumColors[displayRank]}44`,
                    }}>
                    <div className="font-mono font-bold text-lg" style={{ color: podiumColors[displayRank] }}>{displayRank}</div>
                    <div className="font-arabic text-xs text-muted-foreground">{l.loyaltyPoints.toLocaleString()}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Rest list */}
        {!loading && !error && rest.length > 0 && (
          <div className="space-y-2">
            {rest.map((l, i) => (
              <motion.div key={l.aliId}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 + 0.3 }}
                className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="font-mono font-bold text-primary text-sm">{i + 4}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-arabic font-bold text-foreground text-sm truncate">{l.pseudonym}</div>
                  <div className="font-mono text-muted-foreground text-[10px]">{l.aliId}</div>
                </div>
                <div className="text-left flex-shrink-0">
                  <div className="font-mono text-primary text-sm font-bold">{l.loyaltyPoints.toLocaleString()}</div>
                  <div className="flex items-center gap-0.5 justify-end">
                    <Star className="w-2.5 h-2.5 text-[#d4af37]" fill="#d4af37" />
                    <span className="font-arabic text-[10px] text-muted-foreground">LVL {l.level}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Podium-only (1 or 2 users) — show as simple list */}
        {!loading && !error && top3.length > 0 && top3.length < 3 && (
          <div className="space-y-2">
            {leaders.map((l, i) => (
              <motion.div key={l.aliId}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3">
                <div className="text-2xl">{rankBadge(i)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-arabic font-bold text-foreground text-sm truncate">{l.pseudonym}</div>
                  <div className="font-mono text-muted-foreground text-[10px]">{l.aliId}</div>
                </div>
                <div className="font-mono text-[#d4af37] text-sm font-bold">{l.loyaltyPoints.toLocaleString()}</div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-5 text-center">
          <p className="font-arabic text-muted-foreground/50 text-xs">الأسماء مستعارة بالكامل · الخصوصية مصونة</p>
        </div>
      </div>
    </motion.div>
  );
}
