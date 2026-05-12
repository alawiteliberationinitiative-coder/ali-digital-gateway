import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTelegram } from "@/lib/telegram";
import { useGetMe } from "@workspace/api-client-react";
import { AliEmblem } from "@/components/ui/ali-emblem";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Hexagon, ShieldAlert, Cpu, KeyRound } from "lucide-react";

const mockMddData = [
  { date: "Day 1", balance: 0 },
  { date: "Day 2", balance: 120 },
  { date: "Day 3", balance: 145 },
  { date: "Day 4", balance: 210 },
  { date: "Day 5", balance: 350 },
  { date: "Day 6", balance: 480 },
  { date: "Day 7", balance: 650 },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useTelegram();
  const telegramId = user?.id?.toString() || "";

  const { data: userData, isLoading } = useGetMe({
    request: { headers: { "X-Telegram-ID": telegramId } },
    query: { enabled: !!telegramId },
  });

  useEffect(() => {
    if (!isLoading && userData && !userData.keysConfirmed) {
      setLocation("/onboarding");
    }
  }, [userData, isLoading, setLocation]);

  if (isLoading || !userData) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground relative overflow-hidden pb-12">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AliEmblem className="w-10 h-10 shadow-lg" animate={false} />
          <div>
            <div className="font-serif font-bold text-primary tracking-widest text-base leading-none">A.L.I.</div>
            <div className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase leading-tight">
              Digital Gateway
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <span className="font-mono text-xs text-primary tracking-widest uppercase">Secure</span>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-6 relative z-10 max-w-md mx-auto">

        {/* Identity Card */}
        <section className="bg-card border border-border rounded-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Operative</h2>
              <div className="text-2xl font-serif text-foreground">{userData.pseudonym}</div>
            </div>
            <div className="text-right">
              <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Rank</h2>
              <div className="text-sm font-mono text-primary uppercase">
                {userData.rank} <span className="opacity-50 text-xs">LVL {userData.level}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">A.L.I. Designation</h2>
            <div className="font-mono text-sm tracking-[0.2em] text-primary">{userData.aliId}</div>
          </div>
        </section>

        {/* MDD Economy */}
        <section className="bg-card border border-border rounded-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Hexagon className="w-5 h-5 text-primary" />
            <h2 className="font-serif text-lg text-primary tracking-widest">MDD Treasury</h2>
          </div>

          {/* MDD Logo row */}
          <div className="flex items-center gap-3 mb-5 p-3 bg-primary/5 border border-primary/10 rounded-sm">
            <img
              src="/ali-emblem.jpg"
              alt="MDD"
              className="w-10 h-10 rounded-full object-contain"
            />
            <div>
              <div className="text-3xl font-mono text-foreground leading-none">{userData.mddBalance.toLocaleString()}</div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1">MDD Balance</div>
            </div>
          </div>

          <div className="h-36 w-full ml-[-10px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockMddData}>
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "2px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "hsl(var(--primary))" }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Project Bargylos */}
        <section className="bg-card border border-border rounded-sm p-5 relative overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors">
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              <h2 className="font-serif text-lg text-primary tracking-widest">Project Bargylos</h2>
            </div>
            <div className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-sm text-[10px] font-mono text-primary uppercase">
              Classified
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed font-mono">
            Awaiting clearance. Decryption protocol pending secondary authorization from Command.
          </p>
        </section>

        {/* System Status */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-sm p-4 flex flex-col items-center justify-center text-center">
            <Cpu className="w-6 h-6 text-primary mb-3" />
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Network</div>
            <div className="text-sm font-mono text-green-500 uppercase">Optimal</div>
          </div>
          <div className="bg-card border border-border rounded-sm p-4 flex flex-col items-center justify-center text-center">
            <KeyRound className="w-6 h-6 text-primary mb-3" />
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Vault Status</div>
            <div className="text-sm font-mono text-primary uppercase">Secured</div>
          </div>
        </section>
      </div>
    </div>
  );
}
