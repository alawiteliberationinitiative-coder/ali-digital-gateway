import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Wifi, Pin, BookOpen, Calendar, Radio } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const GOLD  = "#d4af37";
const LS_KEY = "adar_read_posts";

function getReadSet(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) ?? "[]")); }
  catch { return new Set(); }
}
function markRead(id: string) {
  const s = getReadSet(); s.add(id);
  localStorage.setItem(LS_KEY, JSON.stringify([...s]));
}

// ─── ADAR Emblem SVG ─────────────────────────────────────────────────────────
export function AdarEmblem({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <circle cx="40" cy="40" r="38" fill="rgba(0,26,10,0.92)" stroke="#d4af37" strokeWidth="1.8" />
      <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth="0.8" />

      {/* Zulfiqar — symmetrical bifurcated blade */}
      {/* Main spine */}
      <rect x="38.5" y="20" width="3" height="30" rx="1" fill="#d4af37" />
      {/* Left prong */}
      <path d="M38.5 22 L30 8 L38.5 20 Z" fill="#d4af37" />
      {/* Right prong */}
      <path d="M41.5 22 L50 8 L41.5 20 Z" fill="#d4af37" />
      {/* Tip glow line between prongs */}
      <path d="M30 8 L40 14 L50 8" stroke="rgba(212,175,55,0.4)" strokeWidth="0.8" fill="none" />

      {/* Guard crosspiece */}
      <rect x="21" y="49" width="38" height="3.5" rx="1.75" fill="#d4af37" />
      {/* Guard gems */}
      <circle cx="25" cy="50.8" r="1.2" fill="rgba(255,255,255,0.35)" />
      <circle cx="55" cy="50.8" r="1.2" fill="rgba(255,255,255,0.35)" />

      {/* Handle */}
      <rect x="38.5" y="52.5" width="3" height="13" rx="1" fill="#d4af37" opacity="0.85" />
      {/* Grip wrapping lines */}
      <line x1="37.5" y1="56" x2="42.5" y2="56" stroke="rgba(0,26,10,0.6)" strokeWidth="0.8" />
      <line x1="37.5" y1="59" x2="42.5" y2="59" stroke="rgba(0,26,10,0.6)" strokeWidth="0.8" />
      <line x1="37.5" y1="62" x2="42.5" y2="62" stroke="rgba(0,26,10,0.6)" strokeWidth="0.8" />
      {/* Pommel */}
      <ellipse cx="40" cy="67" rx="4" ry="2.5" fill="#d4af37" />

      {/* ADAR letters flanking the blade */}
      <text x="27" y="41" textAnchor="middle" fill="rgba(212,175,55,0.65)" fontSize="6.5" fontWeight="bold" fontFamily="monospace">AD</text>
      <text x="53" y="41" textAnchor="middle" fill="rgba(212,175,55,0.65)" fontSize="6.5" fontWeight="bold" fontFamily="monospace">AR</text>
    </svg>
  );
}

// ─── Founding Statement Article ───────────────────────────────────────────────
const FOUNDING_POST = {
  id: "bayan-inbiaath-2026",
  category: "بيان رسمي",
  categoryEn: "Official Statement",
  title: "بيان انبعاث مبادرة التحرير العلوي",
  titleEn: "Declaration of the Alawite Liberation Initiative",
  slogan: "من رماد النسيان.. ينبثق فجر التحرر",
  date: "ربيع 2026 — Spring 2026",
  broadcaster: "مركز ADAR للرصد الإعلامي",
  broadcasterEn: "ADAR Media Center",
  body: [
    {
      type: "lead" as const,
      text: "في زمنٍ تتكالبُ فيه قوى الظلم على استئصال الهوية العلوية من جذورها، وحين استُخدمت أرضنا ساحةً للحروب بالوكالة وجغرافيتنا أداةً في يد المحتل والمتآمر — قررنا، أبناء هذه الأرض الصامدة، أن نرفع راية التحرير عاليًا.",
    },
    {
      type: "heading" as const,
      text: "من نحن؟",
    },
    {
      type: "paragraph" as const,
      text: "مبادرة التحرير العلوي (A.L.I) هي كيانٌ سيادي مستقل، لا يرتبط بأي جهة حكومية أو حزبية. نشأت من رحم المعاناة وتستمد شرعيتها من إرادة أبناء الجبل ووديانه.",
    },
    {
      type: "heading" as const,
      text: "ركائز المبادرة",
    },
    {
      type: "bullets" as const,
      items: [
        "التوثيق الميداني: رصد الجرائم الموثقة بحق شعبنا عبر شبكة حراس الأرض",
        "صون الهوية: الحفاظ على التراث العلوي من الطمس والتزوير والإلغاء",
        "التمكين الاقتصادي: بناء نظام مالي مستقل عبر عملة $MDD السيادية",
        "الأرشفة الرقمية: توثيق التاريخ والمظالم عبر مركز ADAR",
      ],
    },
    {
      type: "heading" as const,
      text: "رمزنا وشعارنا",
    },
    {
      type: "paragraph" as const,
      text: "رمزنا هو الدرع والسيف ذو الفقار — لأننا نحمي ما تبقى ولا نبدأ العدوان. نحمل السيف دفاعًا عن حقنا في الوجود، والدرع صونًا لهويتنا أمام موجات التغيير القسري.",
    },
    {
      type: "quote" as const,
      text: "حقٌّ لا يموت — هذا ليس شعارًا، بل عهدٌ مع الأجيال القادمة.",
    },
    {
      type: "paragraph" as const,
      text: "إن مبادرة التحرير العلوي ليست دعوةً للانعزال، بل هي صرخةٌ من أجل الاعتراف — اعترافٌ بوجودنا، بتاريخنا، بحقنا في أرضنا وهويتنا ومستقبلنا.",
    },
    {
      type: "closing" as const,
      text: "صادر عن مركز ADAR للرصد الإعلامي\nالناطق الرسمي لمبادرة التحرير العلوي\nربيع عام 2026",
    },
  ],
};

// ─── Article Block Renderer ───────────────────────────────────────────────────
function ArticleBlock({ block }: { block: typeof FOUNDING_POST.body[number] }) {
  if (block.type === "lead") return (
    <p className="font-arabic text-white/75 text-base leading-8 font-medium italic border-r-2 pr-3 mb-4"
      style={{ borderColor: GOLD }}>{block.text}</p>
  );
  if (block.type === "heading") return (
    <h3 className="font-arabic font-bold text-sm mb-2 mt-4" style={{ color: GOLD }}>{block.text}</h3>
  );
  if (block.type === "paragraph") return (
    <p className="font-arabic text-white/65 text-sm leading-7 mb-3">{block.text}</p>
  );
  if (block.type === "bullets" && "items" in block) return (
    <ul className="space-y-2 mb-3">
      {block.items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GOLD }} />
          <span className="font-arabic text-white/60 text-sm leading-6">{item}</span>
        </li>
      ))}
    </ul>
  );
  if (block.type === "quote" && "text" in block) return (
    <div className="rounded-xl p-3.5 my-4" style={{ background: "rgba(212,175,55,0.07)", border: `1.5px solid ${GOLD}30` }}>
      <p className="font-arabic text-center font-bold leading-7" style={{ color: GOLD, textShadow: `0 0 16px ${GOLD}50` }}>
        {block.text}
      </p>
    </div>
  );
  if (block.type === "closing" && "text" in block) return (
    <div className="mt-6 pt-4 border-t" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
      {block.text.split("\n").map((line, i) => (
        <p key={i} className="font-arabic text-xs text-center" style={{ color: i === 0 ? GOLD : "rgba(255,255,255,0.35)" }}>{line}</p>
      ))}
    </div>
  );
  return null;
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function FoundingPostCard({ onRead }: { onRead: () => void }) {
  const [expanded, setExpanded] = useState(false);

  function handleOpen() {
    setExpanded(true);
    onRead();
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.03)", border: `1.5px solid ${GOLD}30`, boxShadow: `0 4px 24px rgba(0,0,0,0.4)` }}>

      {/* Pinned banner */}
      <div className="flex items-center gap-2 px-4 py-2"
        style={{ background: "rgba(212,175,55,0.08)", borderBottom: `1px solid ${GOLD}20` }}>
        <Pin className="w-3 h-3" style={{ color: GOLD }} />
        <span className="font-arabic text-[10px] font-bold" style={{ color: GOLD }}>مثبّت — بيان تأسيسي</span>
        <div className="flex-1" />
        <span className="font-mono text-[9px] text-white/30">PINNED</span>
      </div>

      {/* Article header */}
      <div className="px-4 pt-4 pb-3">
        {/* Category + Date */}
        <div className="flex items-center gap-2 mb-3">
          <span className="font-arabic text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(212,175,55,0.15)", color: GOLD, border: `1px solid ${GOLD}40` }}>
            {FOUNDING_POST.category}
          </span>
          <div className="flex items-center gap-1 text-white/30">
            <Calendar className="w-3 h-3" />
            <span className="font-mono text-[9px]">{FOUNDING_POST.date}</span>
          </div>
        </div>

        {/* Slogan */}
        <motion.p className="font-arabic text-center text-lg font-black mb-2"
          style={{ color: GOLD, textShadow: `0 0 24px ${GOLD}60` }}
          animate={{ textShadow: [`0 0 18px ${GOLD}40`, `0 0 32px ${GOLD}70`, `0 0 18px ${GOLD}40`] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
          {FOUNDING_POST.slogan}
        </motion.p>

        {/* Title */}
        <h2 className="font-arabic font-bold text-white text-base leading-tight mb-1 text-center">
          {FOUNDING_POST.title}
        </h2>
        <p className="font-mono text-white/25 text-[10px] text-center mb-4">{FOUNDING_POST.titleEn}</p>

        {/* Publisher */}
        <div className="flex items-center gap-2 py-2 border-t border-b mb-3"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <Radio className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD }} />
          <div>
            <p className="font-arabic text-xs font-bold" style={{ color: GOLD }}>{FOUNDING_POST.broadcaster}</p>
            <p className="font-mono text-[9px] text-white/30">{FOUNDING_POST.broadcasterEn}</p>
          </div>
        </div>

        {/* Expandable article body */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
              <div className="pt-2 pb-1" dir="rtl">
                {FOUNDING_POST.body.map((block, i) => (
                  <ArticleBlock key={i} block={block} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Read / Collapse button */}
        <button
          onClick={expanded ? () => setExpanded(false) : handleOpen}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl mt-2 font-arabic text-sm font-bold active:scale-95 transition-all"
          style={{
            background: expanded ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.08))`,
            border: `1.5px solid ${expanded ? "rgba(255,255,255,0.1)" : GOLD + "50"}`,
            color: expanded ? "rgba(255,255,255,0.4)" : GOLD,
          }}>
          <BookOpen className="w-4 h-4" />
          {expanded ? "طيّ البيان ▲" : "قراءة البيان التأسيسي كاملاً ▼"}
        </button>
      </div>
    </div>
  );
}

// ─── Main ADAR Section ────────────────────────────────────────────────────────
export function AdarSection({
  onBack,
  onRead,
}: {
  onBack: () => void;
  onRead: () => void;
}) {
  // Mark all as read on mount
  useEffect(() => {
    markRead(FOUNDING_POST.id);
    onRead();
  }, [onRead]);

  return (
    <div className="flex flex-col min-h-full"
      style={{ background: "linear-gradient(160deg,#001208 0%,#002200 50%,#001008 100%)" }}>

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
        style={{ background: "rgba(0,16,4,0.97)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${GOLD}22` }}>

        <button onClick={onBack}
          className="p-2 rounded-xl active:scale-95 transition-transform flex-shrink-0"
          style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${GOLD}35` }}>
          <ChevronRight className="w-5 h-5" style={{ color: GOLD }} />
        </button>

        {/* Branding */}
        <div className="flex items-center gap-2.5 flex-1" dir="rtl">
          <AdarEmblem size={36} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-black text-base tracking-[0.12em]" style={{ color: GOLD }}>ADAR</span>
              <span className="w-px h-3.5 bg-[#d4af37]/30" />
              <span className="font-arabic text-xs font-bold text-white/70">مركز الرصد الإعلامي</span>
            </div>
            <p className="font-mono text-[9px] text-white/30 tracking-wider">Alawite Digital Archive & Research</p>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 flex-shrink-0"
          style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <motion.div className="w-1.5 h-1.5 rounded-full bg-red-500"
            animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} />
          <span className="font-mono text-[9px] text-red-400 font-bold">LIVE</span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-20 space-y-4" dir="rtl">

        {/* Section intro */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${GOLD}20` }}>
          <Wifi className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
          <div>
            <p className="font-arabic text-xs font-bold" style={{ color: GOLD }}>البث المباشر — الشبكة الإعلامية</p>
            <p className="font-arabic text-[10px] text-white/35">المنصة الرسمية لمبادرة التحرير العلوي</p>
          </div>
        </motion.div>

        {/* Pinned founding post */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
          <FoundingPostCard onRead={() => markRead(FOUNDING_POST.id)} />
        </motion.div>

        {/* Coming soon posts placeholder */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          className="rounded-2xl p-4 text-center"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)" }}>
          <p className="font-arabic text-white/25 text-xs">تقارير وبيانات إضافية قيد الإعداد</p>
          <p className="font-mono text-white/15 text-[9px] mt-0.5">More reports coming soon</p>
        </motion.div>

        {/* Footer watermark */}
        <div className="text-center pt-2 pb-1">
          <p className="font-mono text-[9px] text-white/15 tracking-widest">ADAR · Alawite Digital Archive & Research · 2026</p>
        </div>
      </div>
    </div>
  );
}

// ─── Unread Count Helper (for dashboard badge) ────────────────────────────────
export function getAdarUnreadCount(): number {
  const read = getReadSet();
  return [FOUNDING_POST.id].filter(id => !read.has(id)).length;
}
