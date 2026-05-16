import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Archive, FileText, Clock, ChevronDown, ChevronUp, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";

const GOLD  = "#d4af37";
const GREEN = "#22c55e";

interface Article {
  id: number;
  title: string;
  body: string;
  authorPseudonym: string;
  authorAliId: string;
  createdAt: string;
}

const CATEGORIES = [
  { id: "all", label: "الكل" },
  { id: "events", label: "أحداث" },
  { id: "analysis", label: "تحليلات" },
  { id: "data", label: "بيانات" },
];

function ArticleExpanded({ article }: { article: Article }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}12` }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 p-4 text-right active:opacity-80"
        dir="rtl">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}22` }}>
          <FileText size={15} color={GOLD} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-arabic font-bold text-white/90 text-sm leading-snug line-clamp-2 mb-1">{article.title}</p>
          <div className="flex items-center gap-1.5 text-white/30 text-[10px]">
            <Clock size={10} />
            <span>{new Date(article.createdAt).toLocaleDateString("ar-SA")}</span>
            <span>·</span>
            <span className="font-arabic">{article.authorPseudonym}</span>
          </div>
        </div>
        <div className="flex-shrink-0 mt-1"
          style={{ color: GOLD + "80" }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.22, ease: "easeInOut" }}
        style={{ overflow: "hidden" }}>
        <div className="px-4 pb-4 pt-0" dir="rtl">
          <div className="h-px mb-3" style={{ background: `${GOLD}10` }} />
          <p className="font-arabic text-white/65 text-sm leading-[1.9]">{article.body}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function DocumentationSection({ telegramId: _telegramId }: { telegramId: string }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    apiFetch("/api/articles")
      .then(r => (r.ok ? r.json() as Promise<Article[]> : Promise.reject()))
      .then(data => setArticles(data))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = articles.filter(a =>
    a.title.toLowerCase().includes(query) || a.body.toLowerCase().includes(query)
  );

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="px-4 pt-4 pb-24 space-y-4" dir="rtl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}28` }}>
            <Archive size={18} color={GOLD} />
          </div>
          <div>
            <p className="font-arabic font-bold text-white/90 text-base">مستودع التوثيق</p>
            <p className="font-arabic text-white/35 text-xs">{articles.length} وثيقة مؤرشفة</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: GOLD + "70" }} />
          <input
            className="w-full rounded-2xl py-2.5 pr-9 pl-4 text-sm font-arabic text-white/70 outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${GOLD}12` }}
            placeholder="ابحث في الأرشيف..."
            value={query}
            onChange={e => setQuery(e.target.value.toLowerCase())}
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full font-arabic text-xs font-bold transition-colors"
              style={{
                background: category === cat.id ? `${GOLD}20` : "rgba(255,255,255,0.05)",
                border: `1px solid ${category === cat.id ? GOLD + "40" : "rgba(255,255,255,0.08)"}`,
                color: category === cat.id ? GOLD : "rgba(255,255,255,0.4)",
              }}>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-2 rounded-full animate-spin"
              style={{ borderColor: `${GOLD}40`, borderTopColor: GOLD }} />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-14">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}15` }}>
              <Archive size={28} color={GOLD + "60"} />
            </div>
            <p className="font-arabic text-white/30 text-sm mb-1">الأرشيف فارغ حالياً</p>
            <p className="font-arabic text-white/20 text-xs">ستظهر الوثائق هنا عند نشرها من قِبل فريق المبادرة</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1" style={{ background: `${GREEN}15` }} />
              <span className="font-arabic text-white/25 text-[10px] font-bold">
                {filtered.length} نتيجة
              </span>
              <div className="h-px flex-1" style={{ background: `${GREEN}15` }} />
            </div>
            {filtered.map(article => (
              <ArticleExpanded key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
