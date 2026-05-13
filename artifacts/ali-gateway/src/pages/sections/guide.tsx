import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Smartphone, Zap, Wallet, Star, Tv } from "lucide-react";

const slide = { initial: { x: -40, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 40, opacity: 0 }, transition: { duration: 0.3 } };

const tabs = [
  { id: "app",        label: "التطبيق",    icon: Smartphone },
  { id: "activities", label: "النشاطات",   icon: Zap },
  { id: "wallet",     label: "المحفظة",    icon: Wallet },
  { id: "points",     label: "نقاط الولاء", icon: Star },
  { id: "ads",        label: "شاهد وادعم", icon: Tv },
];

const content: Record<string, { title: string; steps: { num: string; text: string }[] }> = {
  app: {
    title: "كيف تستخدم التطبيق",
    steps: [
      { num: "١", text: "افتح التطبيق عبر زر «إطلاق البوابة الآمنة» في بوت تيليغرام." },
      { num: "٢", text: "ستُنشأ هويّتك الرقمية تلقائياً مع رقم ALI-ID فريد لك." },
      { num: "٣", text: "احفظ مفاتيحك الثلاثة في مكان آمن خارج الإنترنت." },
      { num: "٤", text: "استكشف الأقسام من الشاشة الرئيسية وابدأ نشاطك." },
    ],
  },
  activities: {
    title: "أنواع النشاطات",
    steps: [
      { num: "🌿", text: "حراس الأرض: توثيق ميداني بالصور والإحصاءات." },
      { num: "🌍", text: "سفراء القضية: نشاطات دولية ومناصرة في المهجر." },
      { num: "💬", text: "المجتمع: مناقشات ومشاركة المحتوى التوعوي." },
      { num: "💰", text: "المعاملات: شراء وتحويل $MDD للشركاء." },
    ],
  },
  wallet: {
    title: "المحفظة الرقمية",
    steps: [
      { num: "١", text: "تُفعَّل محفظتك تلقائياً لحظة إنشاء هويّتك في البوابة." },
      { num: "٢", text: "تستقبل مكافآت $MDD عند إتمام النشاطات." },
      { num: "٣", text: "يمكنك متابعة رصيدك ومخطط الأداء في قسم ركن $MDD." },
      { num: "٤", text: "المحفظة محمية بمفاتيحك الثلاثة — لا يمكن استرداد المفاتيح إذا فُقدت." },
    ],
  },
  points: {
    title: "آلية نقاط الولاء",
    steps: [
      { num: "⭐", text: "توثيق ميداني: 50 نقطة لكل تقرير موثّق." },
      { num: "⭐", text: "نشاط يومي: 10 نقاط للدخول اليومي المتواصل." },
      { num: "⭐", text: "دعوة عضو جديد: 100 نقطة لكل دعوة مقبولة." },
      { num: "⭐", text: "المشاركة في النقاشات: 5 نقاط لكل مساهمة فعّالة." },
      { num: "⭐", text: "مشاهدة إعلانات المبادرة: من 15 حتى 25 نقطة لكل إعلان." },
      { num: "🎯", text: "مسابقة «اربح وادعم»: حتى 325+ نقطة جلسة واحدة مع بونص السلسلة." },
    ],
  },
  ads: {
    title: "نقاط الولاء عبر مشاهدة الإعلانات",
    steps: [
      { num: "📺", text: "اضغط «شاهد وادعم» من الشاشة الرئيسية أو من هنا في أي وقت تشاء." },
      { num: "▶️", text: "اختر أي إعلان من قائمة المحتوى المتاح واضغط زر التشغيل." },
      { num: "⏱", text: "شاهد الإعلان حتى اكتماله (من 15 إلى 25 ثانية) دون تخطٍّ." },
      { num: "⭐", text: "بعد الاكتمال يظهر زر «استلم النقاط» فاضغطه لإضافة نقاطك فوراً." },
      { num: "🔥", text: "كل إعلان تشاهده أثناء مسابقة «اربح وادعم» يُضاعف نقاط الجلسة." },
      { num: "🔄", text: "يتجدّد المحتوى يومياً — شاهد كل يوم للحصول على أقصى نقاط." },
    ],
  },
};

export function GuideSection({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState("app");
  const tab = content[activeTab];

  return (
    <motion.div className="flex flex-col h-full" dir="rtl" {...slide}>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-primary/10 text-primary active:scale-95 transition-transform">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-arabic font-bold text-primary text-lg leading-tight">تعليمات الأنشطة</h1>
          <p className="font-arabic text-muted-foreground text-xs">دليلك الكامل للمبادرة</p>
        </div>
      </div>

      {/* Tabs — scrollable */}
      <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto scrollbar-none">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-arabic text-sm whitespace-nowrap flex-shrink-0 transition-all active:scale-95 ${
              activeTab === t.id
                ? t.id === "ads"
                  ? "bg-purple-700 text-white font-bold"
                  : "bg-primary text-primary-foreground font-bold shadow-md"
                : "bg-card border border-border text-muted-foreground"
            }`}
            style={activeTab === t.id ? { boxShadow: t.id === "ads" ? "0 3px 0 rgba(88,28,135,0.5)" : "0 3px 0 rgba(0,0,0,0.3)" } : {}}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-20">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}>
            <h2 className="font-arabic font-bold text-foreground text-xl mb-5">{tab.title}</h2>

            {/* Special banner for ads tab */}
            {activeTab === "ads" && (
              <div className="rounded-2xl p-4 mb-5 flex items-center gap-3"
                style={{ background: "linear-gradient(135deg, rgba(88,28,135,0.25), rgba(109,40,217,0.15))", border: "1.5px solid rgba(139,92,246,0.4)", boxShadow: "0 3px 0 rgba(88,28,135,0.2)" }}>
                <div className="text-3xl flex-shrink-0">📺</div>
                <div>
                  <p className="font-arabic font-bold text-purple-300 text-sm mb-0.5">متاح في أي وقت</p>
                  <p className="font-arabic text-white/60 text-xs leading-5">شاهد محتوى المبادرة من الشاشة الرئيسية عبر زر «شاهد وادعم» وكسب نقاط حتى خارج المسابقة.</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {tab.steps.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                  className="flex gap-4 items-start bg-card border border-border rounded-2xl p-4"
                  style={{ boxShadow: activeTab === "ads" ? "0 3px 0 rgba(139,92,246,0.15)" : "0 3px 0 rgba(212,175,55,0.15)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-arabic font-bold text-lg flex-shrink-0"
                    style={{ backgroundColor: activeTab === "ads" ? "rgba(139,92,246,0.15)" : "rgba(0,43,27,0.3)", color: activeTab === "ads" ? "#a78bfa" : "var(--primary)" }}>
                    {s.num}
                  </div>
                  <p className="font-arabic text-foreground/90 text-sm leading-6 flex-1">{s.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
