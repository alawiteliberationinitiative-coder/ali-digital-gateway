import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Wifi, Pin, BookOpen, Calendar, Radio } from "lucide-react";
import { markRead } from "./adar-utils";

const adarLogoSrc = `${import.meta.env.BASE_URL}adar-logo.png`;

// ─── Constants ────────────────────────────────────────────────────────────────
const GOLD = "#d4af37";

// ─── ADAR Logo Image Component ────────────────────────────────────────────────
export function AdarEmblem({
  size = 52,
  className = "",
  glow = false,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  return (
    <img
      src={adarLogoSrc}
      alt="ADAR"
      width={size}
      height={size}
      className={className}
      style={{
        objectFit: "contain",
        display: "block",
        filter: glow
          ? "drop-shadow(0 0 8px rgba(212,175,55,0.8)) drop-shadow(0 0 16px rgba(212,175,55,0.45)) brightness(1.08)"
          : "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
      }}
    />
  );
}

// ─── Watermark overlay (semi-transparent logo for cards/reports) ───────────────
function AdarWatermark({ opacity = 0.07, size = 80 }: { opacity?: number; size?: number }) {
  return (
    <img
      src={adarLogoSrc}
      alt=""
      aria-hidden
      style={{
        position: "absolute",
        width: size,
        height: size,
        objectFit: "contain",
        opacity,
        pointerEvents: "none",
        userSelect: "none",
        filter: "brightness(1.3)",
      }}
    />
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
    <div className="rounded-2xl overflow-hidden relative"
      style={{ background: "rgba(255,255,255,0.03)", border: `1.5px solid ${GOLD}30`, boxShadow: `0 4px 24px rgba(0,0,0,0.4)` }}>

      {/* Watermark — bottom-left corner */}
      <div className="absolute bottom-3 left-3 z-0" style={{ opacity: 0.09 }}>
        <AdarWatermark size={90} opacity={1} />
      </div>

      {/* Pinned banner */}
      <div className="flex items-center gap-2 px-4 py-2 relative z-10"
        style={{ background: "rgba(212,175,55,0.08)", borderBottom: `1px solid ${GOLD}20` }}>
        <Pin className="w-3 h-3" style={{ color: GOLD }} />
        <span className="font-arabic text-[10px] font-bold" style={{ color: GOLD }}>مثبّت — بيان تأسيسي</span>
        <div className="flex-1" />
        <span className="font-mono text-[9px] text-white/30">PINNED</span>
      </div>

      {/* Article header */}
      <div className="px-4 pt-4 pb-3 relative z-10">
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

        {/* Publisher — with real logo */}
        <div className="flex items-center gap-2.5 py-2 border-t border-b mb-3"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <img src={adarLogoSrc} alt="ADAR" className="w-8 h-8 rounded-full flex-shrink-0"
            style={{ objectFit: "contain", background: "rgba(0,26,10,0.8)", border: `1px solid ${GOLD}40`, padding: 2 }} />
          <div>
            <p className="font-arabic text-xs font-bold" style={{ color: GOLD }}>{FOUNDING_POST.broadcaster}</p>
            <p className="font-mono text-[9px] text-white/30">{FOUNDING_POST.broadcasterEn}</p>
          </div>
          <div className="flex-1" />
          <Radio className="w-3 h-3 flex-shrink-0" style={{ color: GOLD, opacity: 0.5 }} />
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
          className="rounded-2xl p-5 flex flex-col items-center gap-3 relative overflow-hidden"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(212,175,55,0.15)" }}>
          <div style={{ opacity: 0.07 }}>
            <img src={adarLogoSrc} alt="" aria-hidden style={{ width: 56, height: 56, objectFit: "contain" }} />
          </div>
          <p className="font-arabic text-white/30 text-xs">تقارير وبيانات إضافية قيد الإعداد</p>
          <p className="font-mono text-white/15 text-[9px]">More reports coming soon</p>
        </motion.div>

        {/* Footer watermark strip */}
        <div className="flex items-center justify-center gap-3 pt-2 pb-1">
          <div style={{ opacity: 0.15 }}>
            <img src={adarLogoSrc} alt="" aria-hidden style={{ width: 20, height: 20, objectFit: "contain" }} />
          </div>
          <p className="font-mono text-[9px] text-white/15 tracking-widest">ADAR · Alawite Digital Archive & Research · 2026</p>
          <div style={{ opacity: 0.15 }}>
            <img src={adarLogoSrc} alt="" aria-hidden style={{ width: 20, height: 20, objectFit: "contain" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

