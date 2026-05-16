import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, BookOpen, Globe, Download, ExternalLink, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";

const GOLD = "#d4af37";
const GREEN = "#22c55e";
const BLUE  = "#60a5fa";

interface Article {
  id: number;
  title: string;
  body: string;
  authorPseudonym: string;
  createdAt: string;
}

const STATIC_DOCS = [
  {
    id: "s1",
    icon: BookOpen,
    accent: GOLD,
    category: "ميثاق",
    title: "الميثاق التأسيسي للمبادرة",
    desc: "وثيقة تأسيس مبادرة التحرير العلوي — المبادئ والغايات والآليات.",
    date: "2024",
    badge: "رسمي",
  },
  {
    id: "s2",
    icon: FileText,
    accent: GREEN,
    category: "تقرير",
    title: "تقرير حقوق الإنسان — 2024",
    desc: "توثيق منهجي لانتهاكات حقوق الإنسان بحق أبناء الطائفة في الفترة 2020–2024.",
    date: "2024",
    badge: "حصري",
  },
  {
    id: "s3",
    icon: Globe,
    accent: BLUE,
    category: "دراسة",
    title: "دراسة الجغرافيا السياسية",
    desc: "تحليل معمّق للمشهد الجيوسياسي ومركز الطائفة العلوية في الديناميكيات الإقليمية.",
    date: "2024",
    badge: "بحثي",
  },
  {
    id: "s4",
    icon: FileText,
    accent: GOLD,
    category: "دليل",
    title: "دليل استخدام منصة ALI",
    desc: "شرح تفصيلي لجميع ميزات المنصة وكيفية المشاركة في أنشطة المبادرة.",
    date: "2024",
    badge: "تقني",
  },
];

function DocCard({ item }: { item: typeof STATIC_DOCS[number] }) {
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 flex items-start gap-3"
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${item.accent}18`, backdropFilter: "blur(10px)" }}
      dir="rtl">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${item.accent}12`, border: `1px solid ${item.accent}30` }}>
        <Icon size={20} color={item.accent} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-arabic font-bold text-white/90 text-sm leading-snug">{item.title}</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
            style={{ background: `${item.accent}18`, border: `1px solid ${item.accent}35`, color: item.accent }}>
            {item.badge}
          </span>
        </div>
        <p className="font-arabic text-white/45 text-xs leading-relaxed line-clamp-2 mb-2">{item.desc}</p>
        <div className="flex items-center justify-between">
          <span className="text-white/25 text-[10px] font-mono">{item.date}</span>
          <div className="flex items-center gap-1.5">
            <button className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-arabic"
              style={{ background: `${item.accent}12`, border: `1px solid ${item.accent}28`, color: item.accent }}>
              <ExternalLink size={10} />
              عرض
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ArticleCard({ article, idx }: { article: Article; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="rounded-2xl p-4"
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}12`, backdropFilter: "blur(10px)" }}
      dir="rtl">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25` }}>
          <FileText size={16} color={GOLD} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-arabic font-bold text-white/90 text-sm leading-snug mb-1">{article.title}</p>
          <p className={`font-arabic text-white/50 text-xs leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
            {article.body}
          </p>
          {article.body.length > 120 && (
            <button onClick={() => setExpanded(e => !e)}
              className="font-arabic text-[10px] mt-1"
              style={{ color: GOLD }}>
              {expanded ? "أقل" : "المزيد"}
            </button>
          )}
          <div className="flex items-center gap-2 mt-2 text-white/30 text-[10px]">
            <span className="font-arabic">{article.authorPseudonym}</span>
            <span>·</span>
            <span>{new Date(article.createdAt).toLocaleDateString("ar-SA")}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ReportsSection({ telegramId: _telegramId }: { telegramId: string }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState("");
  const [tab,      setTab]      = useState<"official" | "community">("official");

  useEffect(() => {
    apiFetch("/api/articles")
      .then(r => (r.ok ? r.json() as Promise<Article[]> : Promise.reject()))
      .then(data => setArticles(data))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredArticles = articles.filter(a =>
    a.title.toLowerCase().includes(query) || a.body.toLowerCase().includes(query)
  );

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="px-4 pt-4 pb-24 space-y-4" dir="rtl">

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: GOLD + "80" }} />
          <input
            className="w-full rounded-2xl py-2.5 pr-9 pl-4 text-sm font-arabic text-white/70 outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${GOLD}15` }}
            placeholder="ابحث في الوثائق..."
            value={query}
            onChange={e => setQuery(e.target.value.toLowerCase())}
          />
        </div>

        {/* Tabs */}
        <div className="flex rounded-2xl p-1 gap-1"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}10` }}>
          {(["official", "community"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-xl font-arabic text-xs font-bold transition-colors"
              style={{
                background: tab === t ? `${GOLD}18` : "transparent",
                color: tab === t ? GOLD : "rgba(255,255,255,0.4)",
                border: tab === t ? `1px solid ${GOLD}30` : "1px solid transparent",
              }}>
              {t === "official" ? "الوثائق الرسمية" : "تقارير المجتمع"}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "official" && (
          <div className="space-y-3">
            <p className="font-arabic text-white/30 text-xs font-bold tracking-wider">الوثائق والإصدارات الرسمية</p>
            {STATIC_DOCS.map(doc => <DocCard key={doc.id} item={doc} />)}
          </div>
        )}

        {tab === "community" && (
          <div className="space-y-3">
            <p className="font-arabic text-white/30 text-xs font-bold tracking-wider">
              تقارير المجتمع ({articles.length})
            </p>
            {loading && (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 rounded-full animate-spin"
                  style={{ borderColor: `${GOLD}40`, borderTopColor: GOLD }} />
              </div>
            )}
            {!loading && filteredArticles.length === 0 && (
              <div className="text-center py-10">
                <p className="font-arabic text-white/30 text-sm">لا توجد تقارير مجتمعية بعد</p>
              </div>
            )}
            {!loading && filteredArticles.map((a, i) => <ArticleCard key={a.id} article={a} idx={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}
