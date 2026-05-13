import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, TrendingUp, Layers, Droplets, Copy, Vault } from "lucide-react";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useGetTreasuryBalance } from "@workspace/api-client-react";

const slide = { initial: { x: -40, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 40, opacity: 0 }, transition: { duration: 0.3 } };

const priceData = [
  { t: "١", v: 0.012 }, { t: "٢", v: 0.015 }, { t: "٣", v: 0.013 },
  { t: "٤", v: 0.019 }, { t: "٥", v: 0.022 }, { t: "٦", v: 0.021 },
  { t: "٧", v: 0.028 }, { t: "٨", v: 0.031 }, { t: "٩", v: 0.029 },
  { t: "١٠", v: 0.035 }, { t: "١١", v: 0.038 }, { t: "١٢", v: 0.042 },
];

const CONTRACT = "قيد الإطلاق · Solana";

function shortAddr(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}

export function MddSection({ onBack }: { onBack: () => void }) {
  const [copied, setCopied] = useState(false);
  const { data: treasury, isLoading: treasuryLoading } = useGetTreasuryBalance();

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <motion.div className="flex flex-col h-full" dir="rtl" {...slide}>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-primary/10 text-primary active:scale-95 transition-transform">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-arabic font-bold text-primary text-lg leading-tight">ركن <span className="font-mono">$MDD</span></h1>
          <p className="font-arabic text-muted-foreground text-xs">Management of Diversified Development</p>
        </div>
        <img src="/ali-emblem-sq.jpg" alt="MDD" className="w-9 h-9 object-cover object-center rounded-full mr-auto" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 pb-20">
        {/* Price card */}
        <div className="bg-card border-2 border-[#d4af37]/50 rounded-2xl p-5"
          style={{ background: "linear-gradient(135deg, #1a1000 0%, #2a1a00 100%)", boxShadow: "0 4px 0 rgba(212,175,55,0.35)" }}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="font-arabic text-[#d4af37]/70 text-xs mb-1">السعر الحالي</div>
              <div className="font-mono text-[#d4af37] text-3xl font-bold">$0.042</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                <span className="font-mono text-green-400 text-sm">+12.4%</span>
                <span className="font-arabic text-white/40 text-xs">هذا الأسبوع</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-arabic text-white/50 text-xs mb-1">الرمز</div>
              <div className="font-mono text-[#d4af37] text-xl font-bold">$MDD</div>
            </div>
          </div>

          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceData}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tick={{ fill: "rgba(212,175,55,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1a1000", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "8px", fontFamily: "monospace", fontSize: 11 }} itemStyle={{ color: "#d4af37" }} />
                <Area type="monotone" dataKey="v" stroke="#d4af37" strokeWidth={2} fill="url(#goldGrad)" dot={false} activeDot={{ r: 4, fill: "#d4af37" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Layers, label: "العرض الكلي", value: "١٢ تريليون MDD" },
            { icon: Droplets, label: "السيولة", value: "$48,200" },
            { icon: TrendingUp, label: "القيمة السوقية", value: "$4.2M" },
            { icon: Layers, label: "حاملو التوكن", value: "٢,٨٤١" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-4"
              style={{ boxShadow: "0 3px 0 rgba(212,175,55,0.15)" }}>
              <s.icon className="w-4 h-4 text-primary mb-2" />
              <div className="font-mono text-foreground font-bold text-base">{s.value}</div>
              <div className="font-arabic text-muted-foreground text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* TON Treasury Balance — Transparency block */}
        <div className="rounded-2xl border-2 p-5 space-y-3"
          style={{ background: "linear-gradient(135deg, rgba(0,26,16,0.8), rgba(0,43,27,0.6))", borderColor: "rgba(212,175,55,0.35)", boxShadow: "0 4px 0 rgba(0,0,0,0.4)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Vault className="w-4 h-4 text-[#d4af37]" />
            <h3 className="font-arabic font-bold text-[#d4af37] text-base">خزينة المبادرة · TON</h3>
            <span className="mr-auto text-[10px] font-arabic bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-full px-2 py-0.5 text-[#d4af37]">شفافية مباشرة</span>
          </div>

          {treasuryLoading ? (
            <div className="flex items-center gap-2 py-2">
              <div className="w-4 h-4 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
              <span className="font-arabic text-white/50 text-sm">جارٍ جلب الرصيد...</span>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-arabic text-white/50 text-xs mb-0.5">الرصيد الحالي</div>
                  <div className="font-mono text-[#d4af37] text-2xl font-bold">
                    {treasury?.balanceTon != null ? treasury.balanceTon.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"} TON
                  </div>
                  {treasury?.balanceUsd != null && treasury.balanceUsd > 0 && (
                    <div className="font-mono text-white/40 text-xs mt-0.5">${treasury.balanceUsd.toLocaleString()} USD</div>
                  )}
                </div>
                <div className="text-3xl">💎</div>
              </div>

              {treasury?.address && treasury.address !== "غير مُهيَّأ بعد" && (
                <div className="bg-black/30 rounded-xl p-3 border border-[#d4af37]/20 flex items-center gap-2">
                  <span className="font-mono text-[#d4af37]/70 text-xs flex-1 truncate">{shortAddr(treasury.address)}</span>
                  <button onClick={() => handleCopy(treasury.address)}
                    className="p-1.5 rounded-lg bg-[#d4af37]/10 active:scale-95 transition-transform flex-shrink-0">
                    <Copy className="w-3.5 h-3.5 text-[#d4af37]" />
                  </button>
                  {copied && <span className="font-arabic text-green-400 text-xs">نُسخ!</span>}
                </div>
              )}

              {(!treasury?.address || treasury.address === "غير مُهيَّأ بعد") && (
                <p className="font-arabic text-white/40 text-xs">الخزينة قيد التهيئة · ستظهر البيانات بعد الإطلاق الرسمي</p>
              )}

              {treasury?.lastUpdated && (
                <p className="font-arabic text-white/30 text-[10px]">
                  آخر تحديث: {new Date(treasury.lastUpdated).toLocaleString("ar-SY")}
                </p>
              )}
            </>
          )}
        </div>

        {/* Contract */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-arabic font-bold text-foreground text-base mb-3">العقد الذكي</h3>
          <div className="flex items-center gap-2 bg-background rounded-xl p-3 border border-border">
            <span className="font-mono text-primary text-xs flex-1 break-all">{CONTRACT}</span>
            <button className="p-1.5 rounded-lg bg-primary/10 active:scale-95 transition-transform">
              <Copy className="w-4 h-4 text-primary" />
            </button>
          </div>
          <p className="font-arabic text-muted-foreground text-xs mt-3 leading-5">
            العقد قيد التدقيق الأمني النهائي · الإطلاق الرسمي قريباً على شبكة Solana
          </p>
        </div>
      </div>
    </motion.div>
  );
}
