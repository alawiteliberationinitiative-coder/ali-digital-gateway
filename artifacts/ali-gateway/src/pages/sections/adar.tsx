import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, Wifi, Pin, BookOpen, Calendar, Radio,
  Send, CheckCircle, Trophy, FileText, Scale,
  Loader2, RotateCcw,
} from "lucide-react";
import { markRead } from "./adar-utils";
import { useTelegram } from "../../lib/telegram";
import { DocsTab, ScrollingTicker } from "./adar-docs";

const adarLogoSrc = `${import.meta.env.BASE_URL}adar-logo.png`;
const GOLD = "#d4af37";

// ─── ADAR Logo ─────────────────────────────────────────────────────────────
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

// ─── Founding Post ──────────────────────────────────────────────────────────
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
    { type: "lead" as const, text: "في زمنٍ تتكالبُ فيه قوى الظلم على استئصال الهوية العلوية من جذورها، وحين استُخدمت أرضنا ساحةً للحروب بالوكالة وجغرافيتنا أداةً في يد المحتل والمتآمر — قررنا، أبناء هذه الأرض الصامدة، أن نرفع راية التحرير عاليًا." },
    { type: "heading" as const, text: "من نحن؟" },
    { type: "paragraph" as const, text: "مبادرة التحرير العلوي (A.L.I) هي كيانٌ سيادي مستقل، لا يرتبط بأي جهة حكومية أو حزبية. نشأت من رحم المعاناة وتستمد شرعيتها من إرادة أبناء الجبل ووديانه." },
    { type: "heading" as const, text: "ركائز المبادرة" },
    { type: "bullets" as const, items: [
      "التوثيق الميداني: رصد الجرائم الموثقة بحق شعبنا عبر شبكة حراس الأرض",
      "صون الهوية: الحفاظ على التراث العلوي من الطمس والتزوير والإلغاء",
      "التمكين الاقتصادي: بناء نظام مالي مستقل عبر عملة $MDD السيادية",
      "الأرشفة الرقمية: توثيق التاريخ والمظالم عبر مركز ADAR",
    ]},
    { type: "quote" as const, text: "حقٌّ لا يموت — هذا ليس شعارًا، بل عهدٌ مع الأجيال القادمة." },
    { type: "paragraph" as const, text: "إن مبادرة التحرير العلوي ليست دعوةً للانعزال، بل هي صرخةٌ من أجل الاعتراف — اعترافٌ بوجودنا، بتاريخنا، بحقنا في أرضنا وهويتنا ومستقبلنا." },
    { type: "closing" as const, text: "صادر عن مركز ADAR للرصد الإعلامي\nالناطق الرسمي لمبادرة التحرير العلوي\nربيع عام 2026" },
  ],
};

function ArticleBlock({ block }: { block: typeof FOUNDING_POST.body[number] }) {
  if (block.type === "lead") return <p className="font-arabic text-white/75 text-base leading-8 font-medium italic border-r-2 pr-3 mb-4" style={{ borderColor: GOLD }}>{block.text}</p>;
  if (block.type === "heading") return <h3 className="font-arabic font-bold text-sm mb-2 mt-4" style={{ color: GOLD }}>{block.text}</h3>;
  if (block.type === "paragraph") return <p className="font-arabic text-white/65 text-sm leading-7 mb-3">{block.text}</p>;
  if (block.type === "bullets" && "items" in block) return (
    <ul className="space-y-2 mb-3">{block.items.map((item, i) => (
      <li key={i} className="flex items-start gap-2">
        <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GOLD }} />
        <span className="font-arabic text-white/60 text-sm leading-6">{item}</span>
      </li>
    ))}</ul>
  );
  if (block.type === "quote" && "text" in block) return (
    <div className="rounded-xl p-3.5 my-4" style={{ background: "rgba(212,175,55,0.07)", border: `1.5px solid ${GOLD}30` }}>
      <p className="font-arabic text-center font-bold leading-7" style={{ color: GOLD }}>{block.text}</p>
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

function FoundingPostCard({ onRead }: { onRead: () => void }) {
  const [expanded, setExpanded] = useState(false);
  function handleOpen() { setExpanded(true); onRead(); }
  return (
    <div className="rounded-2xl overflow-hidden relative" style={{ background: "rgba(255,255,255,0.03)", border: `1.5px solid ${GOLD}30`, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
      <div className="absolute bottom-3 left-3 z-0" style={{ opacity: 0.09 }}><AdarWatermark size={90} opacity={1} /></div>
      <div className="flex items-center gap-2 px-4 py-2 relative z-10" style={{ background: "rgba(212,175,55,0.08)", borderBottom: `1px solid ${GOLD}20` }}>
        <Pin className="w-3 h-3" style={{ color: GOLD }} />
        <span className="font-arabic text-[10px] font-bold" style={{ color: GOLD }}>مثبّت — بيان تأسيسي</span>
        <div className="flex-1" />
        <span className="font-mono text-[9px] text-white/30">PINNED</span>
      </div>
      <div className="px-4 pt-4 pb-3 relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-arabic text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(212,175,55,0.15)", color: GOLD, border: `1px solid ${GOLD}40` }}>{FOUNDING_POST.category}</span>
          <div className="flex items-center gap-1 text-white/30"><Calendar className="w-3 h-3" /><span className="font-mono text-[9px]">{FOUNDING_POST.date}</span></div>
        </div>
        <motion.p className="font-arabic text-center text-lg font-black mb-2" style={{ color: GOLD }}
          animate={{ textShadow: [`0 0 18px ${GOLD}40`, `0 0 32px ${GOLD}70`, `0 0 18px ${GOLD}40`] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>{FOUNDING_POST.slogan}</motion.p>
        <h2 className="font-arabic font-bold text-white text-base leading-tight mb-1 text-center">{FOUNDING_POST.title}</h2>
        <p className="font-mono text-white/25 text-[10px] text-center mb-4">{FOUNDING_POST.titleEn}</p>
        <div className="flex items-center gap-2.5 py-2 border-t border-b mb-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <img src={adarLogoSrc} alt="ADAR" className="w-8 h-8 rounded-full flex-shrink-0" style={{ objectFit: "contain", background: "rgba(0,26,10,0.8)", border: `1px solid ${GOLD}40`, padding: 2 }} />
          <div>
            <p className="font-arabic text-xs font-bold" style={{ color: GOLD }}>{FOUNDING_POST.broadcaster}</p>
            <p className="font-mono text-[9px] text-white/30">{FOUNDING_POST.broadcasterEn}</p>
          </div>
          <div className="flex-1" />
          <Radio className="w-3 h-3 flex-shrink-0" style={{ color: GOLD, opacity: 0.5 }} />
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
              <div className="pt-2 pb-1" dir="rtl">{FOUNDING_POST.body.map((block, i) => <ArticleBlock key={i} block={block} />)}</div>
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={expanded ? () => setExpanded(false) : handleOpen}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl mt-2 font-arabic text-sm font-bold active:scale-95 transition-all"
          style={{ background: expanded ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.08))`, border: `1.5px solid ${expanded ? "rgba(255,255,255,0.1)" : GOLD + "50"}`, color: expanded ? "rgba(255,255,255,0.4)" : GOLD }}>
          <BookOpen className="w-4 h-4" />
          {expanded ? "طيّ البيان ▲" : "قراءة البيان التأسيسي كاملاً ▼"}
        </button>
      </div>
    </div>
  );
}

// ─── Tab: الأخبار ───────────────────────────────────────────────────────────
function NewsTab() {
  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${GOLD}20` }}>
        <Wifi className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
        <div>
          <p className="font-arabic text-xs font-bold" style={{ color: GOLD }}>البث المباشر — الشبكة الإعلامية</p>
          <p className="font-arabic text-[10px] text-white/35">المنصة الرسمية لمبادرة التحرير العلوي</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
        <FoundingPostCard onRead={() => markRead(FOUNDING_POST.id)} />
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
        className="rounded-2xl p-5 flex flex-col items-center gap-3 relative overflow-hidden"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(212,175,55,0.15)" }}>
        <div style={{ opacity: 0.07 }}><img src={adarLogoSrc} alt="" aria-hidden style={{ width: 56, height: 56, objectFit: "contain" }} /></div>
        <p className="font-arabic text-white/30 text-xs">تقارير وبيانات إضافية قيد الإعداد</p>
        <p className="font-mono text-white/15 text-[9px]">More reports coming soon</p>
      </motion.div>
    </div>
  );
}

// ─── Tab: الرصد الميداني ───────────────────────────────────────────────────
type FormState = "idle" | "sending" | "done";

function ResearchTab({ telegramId }: { telegramId: string }) {
  const [testimony, setTestimony] = useState("");
  const [statType, setStatType] = useState("");
  const [statValue, setStatValue] = useState("");
  const [testimonyState, setTestimonyState] = useState<FormState>("idle");
  const [statsState, setStatsState] = useState<FormState>("idle");

  const submitTestimony = useCallback(async () => {
    if (!testimony.trim() || !telegramId) return;
    setTestimonyState("sending");
    await new Promise(r => setTimeout(r, 1200));
    setTestimonyState("done");
    setTestimony("");
    setTimeout(() => setTestimonyState("idle"), 4000);
  }, [testimony, telegramId]);

  const submitStats = useCallback(async () => {
    if (!statType || !statValue.trim() || !telegramId) return;
    setStatsState("sending");
    await new Promise(r => setTimeout(r, 1000));
    setStatsState("done");
    setStatType("");
    setStatValue("");
    setTimeout(() => setStatsState("idle"), 4000);
  }, [statType, statValue, telegramId]);

  const cardStyle = {
    background: "rgba(255,255,255,0.03)",
    border: `1.5px solid ${GOLD}25`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(212,175,55,0.2)",
    borderRadius: 10,
    padding: "10px 12px",
    color: "rgba(255,255,255,0.75)",
    fontFamily: "inherit",
    fontSize: 13,
    outline: "none",
    resize: "none" as const,
    direction: "rtl",
  };

  return (
    <div className="space-y-1">
      {/* Intro */}
      <div className="rounded-2xl px-4 py-3 mb-4" style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${GOLD}20` }}>
        <p className="font-arabic text-xs font-bold mb-0.5" style={{ color: GOLD }}>الرصد الميداني — توثيق الحقيقة</p>
        <p className="font-arabic text-[11px] text-white/45 leading-5">ساهم في أرشفة الشهادات والإحصاءات الميدانية. كل مساهمة موثقة تُحتسب في سجل مساهماتك السيادية.</p>
      </div>

      {/* Form 1: Testimony */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
          <p className="font-arabic text-sm font-bold" style={{ color: GOLD }}>شهادة موثقة</p>
          <span className="font-arabic text-[9px] px-2 py-0.5 rounded-full mr-auto" style={{ background: "rgba(212,175,55,0.1)", color: "rgba(212,175,55,0.7)", border: "1px solid rgba(212,175,55,0.2)" }}>+5 نقاط</span>
        </div>
        <p className="font-arabic text-[11px] text-white/40 mb-2 leading-5">أدلِ بشهادتك الميدانية الموثقة عن أي حادثة أو وضع تعيشه أو تشهده على أرض الواقع.</p>
        <textarea
          value={testimony}
          onChange={e => setTestimony(e.target.value)}
          rows={4}
          placeholder="اكتب شهادتك هنا... (الحد الأدنى 50 حرفاً)"
          className="mb-3"
          style={inputStyle}
          disabled={testimonyState !== "idle"}
        />
        {testimonyState === "done" ? (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl p-3" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="font-arabic text-xs text-green-300 font-bold">شهادتك قُيِّدت في الأرشيف الرقمي — شكراً لمساهمتك</p>
          </motion.div>
        ) : (
          <button onClick={submitTestimony} disabled={testimony.trim().length < 50 || testimonyState === "sending"}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-arabic text-sm font-bold active:scale-95 transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))", border: `1.5px solid ${GOLD}45`, color: GOLD }}>
            {testimonyState === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {testimonyState === "sending" ? "جاري الإرسال..." : "رفع الشهادة للأرشيف"}
          </button>
        )}
      </div>

      {/* Form 2: Statistical Data */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">📊</span>
          <p className="font-arabic text-sm font-bold" style={{ color: GOLD }}>بيانات إحصائية</p>
          <span className="font-arabic text-[9px] px-2 py-0.5 rounded-full mr-auto" style={{ background: "rgba(212,175,55,0.1)", color: "rgba(212,175,55,0.7)", border: "1px solid rgba(212,175,55,0.2)" }}>+3 نقاط</span>
        </div>
        <p className="font-arabic text-[11px] text-white/40 mb-3 leading-5">شارك ببيانات إحصائية تساعد في رصد الوضع الميداني.</p>
        <select value={statType} onChange={e => setStatType(e.target.value)}
          className="mb-2"
          style={{ ...inputStyle, resize: undefined }}
          disabled={statsState !== "idle"}>
          <option value="">— اختر نوع البيانات —</option>
          <option value="displacement">تهجير / نزوح</option>
          <option value="demolition">هدم / تدمير ممتلكات</option>
          <option value="detainees">حالات اعتقال</option>
          <option value="killing">قتل وتصفية جسدية</option>
          <option value="kidnapping">خطف وإخفاء قسري</option>
          <option value="armed_movements">تحركات فصائل وعصابات مسلحة وترهيب</option>
        </select>
        <textarea value={statValue} onChange={e => setStatValue(e.target.value)}
          rows={3}
          placeholder="أدخل البيانات والأرقام أو وصفاً موجزاً..."
          className="mb-3"
          style={inputStyle}
          disabled={statsState !== "idle"}
        />
        {statsState === "done" ? (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl p-3" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="font-arabic text-xs text-green-300 font-bold">البيانات مُسجَّلة — تُضاف النقاط لرصيدك</p>
          </motion.div>
        ) : (
          <button onClick={submitStats} disabled={!statType || !statValue.trim() || statsState === "sending"}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-arabic text-sm font-bold active:scale-95 transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))", border: `1.5px solid ${GOLD}45`, color: GOLD }}>
            {statsState === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {statsState === "sending" ? "جاري التسجيل..." : "إرسال البيانات"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Tab: المسابقات الثقافية ────────────────────────────────────────────────
const COMPETITIONS = [
  {
    id: "comp1",
    title: "التراث العلوي — المستوى الأول",
    emoji: "🌿",
    questions: [
      { q: "ما اسم الجبل الذي يُعدّ المعقل التاريخي للعلويين في الشام؟", a: "جبل الأنصارية (جبل العلويين)، ويمتد على طول الساحل السوري الغربي." },
      { q: "ما معنى 'ذو الفقار' ولمن كان ينتسب تاريخياً؟", a: "سيف الإمام علي بن أبي طالب (ع)، وكان هدية من النبي ﷺ بعد غزوة بدر. يُعدّ رمزاً للشجاعة والعدالة." },
      { q: "ما هو الاسم التاريخي الذي عُرف به العلويون قبل انتشار هذه التسمية؟", a: "النصيريون — نسبةً إلى محمد بن نصير النميري، أحد الرموز الدينية المؤسسة للمذهب في القرن الثالث الهجري." },
    ],
  },
  {
    id: "comp2",
    title: "الهوية الرقمية — مبادرة ALI",
    emoji: "💡",
    questions: [
      { q: "ماذا تعني اختصارات A.L.I في مبادرة التحرير العلوي؟", a: "Alawite Liberation Initiative — مبادرة التحرير العلوي. وهي منصة سيادية رقمية للتوثيق والتمكين والحفاظ على الهوية." },
      { q: "ما وظيفة عملة $MDD في منظومة المبادرة؟", a: "$MDD (Management of Diversified Development) هي العملة الرقمية السيادية التي تعكس مساهمة المنتسب وتُستخدم كأداة تمكين اقتصادي مستقل." },
      { q: "ما هو مركز ADAR وما دوره ضمن المبادرة؟", a: "Alawite Digital Archive & Research — مركز الأرشفة والرصد الإعلامي، يتولى توثيق الشهادات والتقارير ونشر البيانات البحثية باسم المبادرة." },
    ],
  },
];

type CompState = { [key: string]: boolean };

function CompetitionsTab() {
  const [revealed, setRevealed] = useState<CompState>({});
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [rewardShown, setRewardShown] = useState<Set<string>>(new Set());

  function revealAnswer(compId: string, qIdx: number) {
    const key = `${compId}-${qIdx}`;
    setRevealed(prev => ({ ...prev, [key]: true }));
  }

  function completeComp(compId: string, totalQ: number) {
    const allRevealed = Array.from({ length: totalQ }, (_, i) => revealed[`${compId}-${i}`]).every(Boolean);
    if (allRevealed && !completed.has(compId)) {
      setCompleted(prev => new Set([...prev, compId]));
      setRewardShown(prev => new Set([...prev, compId]));
      setTimeout(() => setRewardShown(prev => { const s = new Set(prev); s.delete(compId); return s; }), 5000);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${GOLD}20` }}>
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-4 h-4" style={{ color: GOLD }} />
          <p className="font-arabic text-xs font-bold" style={{ color: GOLD }}>مسابقات ثقافية — حفظ الهوية والتراث</p>
        </div>
        <p className="font-arabic text-[11px] text-white/40 leading-5">أجب على الأسئلة واكشف الإجابات الصحيحة لتحصل على المكافأة فور إتمام المسابقة.</p>
      </div>

      {COMPETITIONS.map(comp => {
        const isDone = completed.has(comp.id);
        const showReward = rewardShown.has(comp.id);
        const allAnswered = comp.questions.every((_, i) => revealed[`${comp.id}-${i}`]);

        return (
          <motion.div key={comp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.03)", border: `1.5px solid ${isDone ? "rgba(34,197,94,0.4)" : GOLD + "25"}` }}>

            {/* Competition header */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: isDone ? "rgba(34,197,94,0.08)" : "rgba(212,175,55,0.06)", borderBottom: `1px solid ${isDone ? "rgba(34,197,94,0.2)" : GOLD + "15"}` }}>
              <span className="text-2xl">{comp.emoji}</span>
              <div className="flex-1">
                <p className="font-arabic text-sm font-bold" style={{ color: isDone ? "#4ade80" : GOLD }}>{comp.title}</p>
                <p className="font-arabic text-[10px]" style={{ color: isDone ? "rgba(74,222,128,0.6)" : "rgba(212,175,55,0.5)" }}>{comp.questions.length} أسئلة · {isDone ? "مكتمل ✓" : "جارٍ..."}</p>
              </div>
              <span className="font-arabic text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: "rgba(212,175,55,0.12)", color: GOLD, border: "1px solid rgba(212,175,55,0.25)" }}>
                +{comp.questions.length * 5} نقطة
              </span>
            </div>

            {/* Reward banner */}
            <AnimatePresence>
              {showReward && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 px-4 py-3" style={{ background: "rgba(34,197,94,0.12)", borderBottom: "1px solid rgba(34,197,94,0.2)" }}>
                  <span className="text-2xl">🎉</span>
                  <div>
                    <p className="font-arabic text-sm font-bold text-green-300">أحسنت! تمّت المسابقة بنجاح</p>
                    <p className="font-arabic text-[11px] text-green-400/70">+{comp.questions.length * 5} نقطة أُضيفت لسجل مساهماتك السيادية</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Questions */}
            <div className="px-4 py-3 space-y-3" dir="rtl">
              {comp.questions.map((q, i) => {
                const key = `${comp.id}-${i}`;
                const isRevealed = revealed[key];
                return (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isRevealed ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)"}` }}>
                    <div className="px-3 py-2.5" style={{ background: "rgba(0,0,0,0.2)" }}>
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5" style={{ background: "rgba(212,175,55,0.15)", color: GOLD }}>{i + 1}</span>
                        <p className="font-arabic text-sm text-white/75 leading-6">{q.q}</p>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isRevealed ? (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          className="px-3 py-2.5 flex items-start gap-2" style={{ background: "rgba(34,197,94,0.06)" }}>
                          <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                          <p className="font-arabic text-[12px] text-green-300/90 leading-5">{q.a}</p>
                        </motion.div>
                      ) : (
                        <button onClick={() => revealAnswer(comp.id, i)}
                          className="w-full px-3 py-2 font-arabic text-xs text-white/40 text-center active:brightness-125 transition-all"
                          style={{ background: "rgba(212,175,55,0.04)" }}>
                          اكشف الإجابة ▼
                        </button>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Complete button */}
              {allAnswered && !isDone && (
                <motion.button initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  onClick={() => completeComp(comp.id, comp.questions.length)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-arabic font-bold text-sm active:scale-95 transition-all"
                  style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.25), rgba(22,163,74,0.15))", border: "1.5px solid rgba(34,197,94,0.45)", color: "#4ade80" }}>
                  <Trophy className="w-4 h-4" />
                  احتسب المكافأة
                </motion.button>
              )}
              {isDone && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="font-arabic text-sm text-green-400 font-bold">مكتمل — المكافأة في رصيدك</span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Reset button */}
      <button onClick={() => { setRevealed({}); setCompleted(new Set()); }}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-arabic text-sm text-white/25 active:text-white/50 transition-all"
        style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
        <RotateCcw className="w-3.5 h-3.5" />
        إعادة المسابقات
      </button>
    </div>
  );
}

// ─── Tab: الميثاق ──────────────────────────────────────────────────────────
function CharterTab() {
  const articles = [
    {
      num: "المادة الأولى",
      title: "الطرفان والإقرار",
      body: "يُعدّ المستخدم المنتسب إلى منصة مبادرة التحرير العلوي (A.L.I) شريكاً تشاركياً لا مجرد مستخدم. يُعدّ مركز ADAR الجهة الحافظة للبيانات والناطقة الرسمية باسم المنظومة الإعلامية.",
    },
    {
      num: "المادة الثانية",
      title: "حقوق المستخدم السيادية",
      body: "الحق في الحصة الكاملة من عوائد البيانات البحثية. الحق في المشاركة في المسابقات الثقافية والحصول على مكافآتها. الحق في الاطلاع على الإحصائيات العامة للمنظومة وتعديل مساهماته الشخصية.",
    },
    {
      num: "المادة الثالثة",
      title: "مصادر العوائد التشاركية",
      body: "تعود نسبة من عوائد المنظومة الإعلامية للمنتسبين من ثلاثة مصادر حصرية:\n① البيانات البحثية والإحصائية بموافقة صريحة من المستخدم.\n② المسابقات الثقافية التي تولّد قيمة أكاديمية موثقة.\n③ الشهادات الميدانية المؤرشفة في قاعدة بيانات ADAR.",
    },
    {
      num: "المادة الرابعة",
      title: "نقاط الولاء $MDD",
      body: "نقاط الولاء هي الوحدة الرقمية التي تُعبّر عن مساهمة المستخدم في المنظومة. تُحتسب كحصة قابلة للتحويل إلى $MDD بعد الإيردروب الرسمي بناءً على سجل المساهمات السيادية.",
    },
    {
      num: "المادة الخامسة",
      title: "حماية البيانات والخصوصية",
      body: "تلتزم منظومة ADAR بعدم بيع أي بيانات شخصية لأطراف خارجية دون موافقة صريحة من صاحبها. تُخزَّن البيانات على بنية تحتية مشفرة مع احترام تام لخصوصية المنتسبين وحقهم في الحذف.",
    },
    {
      num: "المادة السادسة",
      title: "السيادة القانونية للمنظومة",
      body: "هذه الاتفاقية وثيقة سيادية داخلية لا تخضع لأي سلطة قانونية خارجية. أي نزاع يُحسم بالحوار الداخلي بين المنتسبين ومجلس قيادة المبادرة وفق مبدأ الشورى السيادية.",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl p-4 text-center relative overflow-hidden" style={{ background: "rgba(212,175,55,0.06)", border: `1.5px solid ${GOLD}30` }}>
        <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0.05 }}>
          <img src={adarLogoSrc} alt="" aria-hidden style={{ width: 120, height: 120, objectFit: "contain" }} />
        </div>
        <div className="relative z-10">
          <img src={adarLogoSrc} alt="ADAR" style={{ width: 48, height: 48, objectFit: "contain", margin: "0 auto 8px", filter: "drop-shadow(0 0 8px rgba(212,175,55,0.5))" }} />
          <p className="font-arabic font-black text-lg" style={{ color: GOLD }}>ميثاق السيادة الرقمية</p>
          <p className="font-mono text-[10px] text-white/30 mt-0.5">Digital Sovereignty Charter · ADAR 2026</p>
          <div className="mt-2 px-3 py-1.5 rounded-xl inline-block" style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${GOLD}30` }}>
            <p className="font-arabic text-[11px]" style={{ color: GOLD }}>اتفاقية المستخدم ومنظومة السيادة الرقمية</p>
          </div>
        </div>
      </div>

      {/* Preamble */}
      <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="font-arabic text-center text-sm font-bold text-white/50 mb-2">بسم الله الرحمن الرحيم</p>
        <p className="font-arabic text-[12px] text-white/45 leading-6 text-center italic">
          صادرة عن مركز ADAR للرصد الإعلامي — الذراع الإعلامي الرسمي لمبادرة التحرير العلوي
        </p>
      </div>

      {/* Sovereignty statement */}
      <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(212,175,55,0.06)", border: `1px solid ${GOLD}20` }}>
        <div className="flex items-center gap-2 mb-2">
          <Scale className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
          <p className="font-arabic text-xs font-bold" style={{ color: GOLD }}>المبدأ الجوهري</p>
        </div>
        <p className="font-arabic text-sm font-bold text-white/75 leading-7">
          الأرباح تعود للمشتركين مقابل مساهماتهم في البيانات البحثية والإحصائية والمسابقات الثقافية — لا استغلال ولا احتكار.
        </p>
      </div>

      {/* Articles */}
      {articles.map((art, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}15` }}>
          <div className="px-4 py-2.5" style={{ background: "rgba(212,175,55,0.06)", borderBottom: `1px solid ${GOLD}12` }}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(212,175,55,0.15)", color: GOLD }}>{art.num}</span>
              <span className="font-arabic text-xs font-bold text-white/70">{art.title}</span>
            </div>
          </div>
          <div className="px-4 py-3" dir="rtl">
            {art.body.split("\n").map((line, j) => (
              <p key={j} className="font-arabic text-[12px] text-white/55 leading-6">{line}</p>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Seal */}
      <div className="rounded-2xl px-4 py-4 text-center" style={{ background: "rgba(212,175,55,0.04)", border: `1px dashed ${GOLD}25` }}>
        <p className="font-arabic text-[11px] text-white/30 leading-5">صادر عن مركز ADAR للرصد الإعلامي</p>
        <p className="font-mono text-[9px] text-white/20 mt-0.5">Alawite Digital Archive & Research · Spring 2026</p>
      </div>
    </div>
  );
}

// ─── Main ADAR Section ─────────────────────────────────────────────────────
type AdarTab = "news" | "research" | "docs" | "competitions" | "charter";

const TABS: { id: AdarTab; label: string; icon: string }[] = [
  { id: "news",         label: "الأخبار",   icon: "📡" },
  { id: "research",     label: "الرصد",     icon: "🔬" },
  { id: "docs",         label: "التوثيق",   icon: "📁" },
  { id: "competitions", label: "مسابقات",   icon: "🏆" },
  { id: "charter",      label: "الميثاق",   icon: "⚖️" },
];

export function AdarSection({
  onBack,
  onRead,
}: {
  onBack: () => void;
  onRead: () => void;
}) {
  const { user } = useTelegram();
  const telegramId = user?.id?.toString() || "";
  const [activeTab, setActiveTab] = useState<AdarTab>("news");

  useEffect(() => {
    markRead(FOUNDING_POST.id);
    onRead();
  }, [onRead]);

  return (
    <div className="flex flex-col min-h-full" style={{ background: "linear-gradient(160deg,#001208 0%,#002200 50%,#001008 100%)" }}>

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20" style={{ background: "rgba(0,16,4,0.97)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${GOLD}22` }}>
        {/* Brand row */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <button onClick={onBack} className="p-2 rounded-xl active:scale-95 transition-transform flex-shrink-0"
            style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${GOLD}35` }}>
            <ChevronRight className="w-5 h-5" style={{ color: GOLD }} />
          </button>
          <div className="flex items-center gap-2.5 flex-1" dir="rtl">
            <AdarEmblem size={34} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-base tracking-[0.12em]" style={{ color: GOLD }}>ADAR</span>
                <span className="w-px h-3.5 bg-[#d4af37]/30" />
                <span className="font-arabic text-xs font-bold text-white/70">مركز الرصد الإعلامي</span>
              </div>
              <p className="font-mono text-[9px] text-white/30 tracking-wider">Alawite Digital Archive & Research</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 flex-shrink-0"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <motion.div className="w-1.5 h-1.5 rounded-full bg-red-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} />
            <span className="font-mono text-[9px] text-red-400 font-bold">LIVE</span>
          </div>
        </div>

        {/* Scrolling ticker — docs tab only */}
        {activeTab === "docs" && <ScrollingTicker />}

        {/* Tab bar */}
        <div className="flex gap-1 px-3 pb-2.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-arabic text-xs font-bold transition-all active:scale-95"
                style={{
                  background: active ? `linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.12))` : "rgba(255,255,255,0.04)",
                  border: active ? `1.5px solid ${GOLD}60` : "1.5px solid rgba(255,255,255,0.08)",
                  color: active ? GOLD : "rgba(255,255,255,0.35)",
                }}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24" dir="rtl">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}>
            {activeTab === "news"         && <NewsTab />}
            {activeTab === "research"     && <ResearchTab telegramId={telegramId} />}
            {activeTab === "docs"         && <DocsTab telegramId={telegramId} />}
            {activeTab === "competitions" && <CompetitionsTab />}
            {activeTab === "charter"      && <CharterTab />}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 pt-4 pb-1 mt-2">
          <div style={{ opacity: 0.15 }}><img src={adarLogoSrc} alt="" aria-hidden style={{ width: 18, height: 18, objectFit: "contain" }} /></div>
          <p className="font-mono text-[9px] text-white/15 tracking-widest">ADAR · Alawite Digital Archive & Research · 2026</p>
          <div style={{ opacity: 0.15 }}><img src={adarLogoSrc} alt="" aria-hidden style={{ width: 18, height: 18, objectFit: "contain" }} /></div>
        </div>
      </div>
    </div>
  );
}
