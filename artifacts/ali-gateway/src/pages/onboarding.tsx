import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTelegram } from "@/lib/telegram";
import { useGetMe, useConfirmKeys, getGetMeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, KeyRound, ArrowLeft } from "lucide-react";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user, webApp } = useTelegram();
  const telegramId = user?.id?.toString() || "";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [keysSaved, setKeysSaved] = useState(false);

  const { data: userData, isLoading, isError } = useGetMe({
    query: { enabled: !!telegramId, retry: 1 },
  });

  const confirmKeysMutation = useConfirmKeys();

  useEffect(() => {
    if (userData?.keysConfirmed) setLocation("/dashboard");
  }, [userData, setLocation]);

  // فقط نعيد التوجيه إلى "/" عند انعدام هوية المستخدم (خطأ 401/404).
  // إذا كان telegramId موجوداً لكن الخادم أخفق → نبقى هنا ولا ندور بحلقة.
  useEffect(() => {
    if (isError && !telegramId) setLocation("/");
  }, [isError, telegramId, setLocation]);

  const handleNextStep = () => {
    webApp?.HapticFeedback?.impactOccurred("light");
    setStep((prev) => prev + 1);
  };

  const handleConfirm = () => {
    if (!keysSaved) return;
    webApp?.HapticFeedback?.impactOccurred("medium");

    confirmKeysMutation.mutate(
      { data: { telegramId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setLocation("/dashboard");
        },
        onError: () => {
          toast({
            title: "فشل التأكيد",
            description: "حدث خطأ أثناء تأكيد مفاتيحك. حاول مجدداً.",
            variant: "destructive",
          });
        },
      },
    );
  };

  if (isLoading || !userData) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col px-6 py-12 relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <div className="relative z-10 flex-1 flex flex-col max-w-md mx-auto w-full">
        <header className="mb-12 flex justify-between items-center">
          <div className="text-primary font-serif font-bold tracking-widest">A.L.I.</div>
          <div className="font-arabic text-muted-foreground text-xs">الخطوة 0{step} / 03</div>
        </header>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col justify-center"
            >
              <div className="mb-8">
                <Shield className="w-12 h-12 text-primary mb-6" />
                <h1 className="font-arabic text-3xl text-primary font-bold mb-4">تأسّست هويّتك</h1>
                <p className="font-arabic text-muted-foreground text-sm leading-relaxed mb-8">
                  لقد أُنشئت حضورك الرقمي السيادي داخل البوابة. هذا هو رقمك الدائم في المبادرة.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-6 border border-primary/20 bg-card rounded-sm">
                  <div className="font-arabic text-xs text-muted-foreground mb-2">رقم الهوية A.L.I</div>
                  <div className="text-2xl font-mono text-primary">{userData.aliId}</div>
                </div>

                <div className="p-6 border border-primary/20 bg-card rounded-sm">
                  <div className="font-arabic text-xs text-muted-foreground mb-2">الاسم الرمزي</div>
                  <div className="text-xl font-mono text-foreground">{userData.pseudonym}</div>
                </div>
              </div>

              <div className="mt-auto pt-12">
                <Button
                  onClick={handleNextStep}
                  className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-arabic text-lg rounded-sm"
                >
                  المتابعة <ArrowLeft className="mr-2 w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col justify-center"
            >
              <div className="mb-8">
                <KeyRound className="w-12 h-12 text-primary mb-6" />
                <h1 className="font-arabic text-3xl text-primary font-bold mb-4">خزنة المفاتيح الثلاثية</h1>
                <p className="font-arabic text-muted-foreground text-sm leading-relaxed mb-8">
                  هذه المفاتيح التشفيرية هي السبيل الوحيد لاسترداد هويّتك. لا تحتفظ البوابة بها في نص واضح. احفظها بأمان خارج الإنترنت.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { label: "مفتاح الخزنة", value: userData.vaultKey },
                  { label: "مفتاح الهوية", value: userData.identityKey },
                  { label: "المفتاح الرئيسي", value: userData.masterKey },
                ].map((k, i) => (
                  <motion.div
                    key={k.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="p-4 border border-primary/20 bg-black/40 rounded-sm relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-1 h-full bg-primary/50" />
                    <div className="font-arabic text-xs text-primary/70 mb-1">{k.label}</div>
                    <div className="font-mono text-sm text-primary break-all drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">{k.value}</div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-auto pt-12">
                <Button
                  onClick={handleNextStep}
                  className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-arabic text-lg rounded-sm"
                >
                  استلمتُ المفاتيح <ArrowLeft className="mr-2 w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col justify-center"
            >
              <div className="mb-8">
                <h1 className="font-arabic text-3xl text-primary font-bold mb-4">البروتوكول الختامي</h1>
                <p className="font-arabic text-muted-foreground text-sm leading-relaxed mb-8">
                  أكّد مسؤوليتك عن خزنة المفاتيح الثلاثية. فقدانها يعني فقدان الوصول بشكل دائم.
                </p>
              </div>

              <div className="p-6 border border-primary bg-primary/5 rounded-sm mb-12">
                <div className="flex items-start gap-4">
                  <label
                    htmlFor="keys-saved"
                    className="font-arabic text-sm leading-relaxed text-foreground cursor-pointer flex-1"
                  >
                    أؤكد أنني احتفظت بالمفاتيح التشفيرية الثلاثة بأمان خارج الإنترنت، وأفهم أن البوابة لا تستطيع استرداد هذه المفاتيح نيابةً عني.
                  </label>
                  <Checkbox
                    id="keys-saved"
                    checked={keysSaved}
                    onCheckedChange={(c) => {
                      setKeysSaved(c as boolean);
                      webApp?.HapticFeedback?.selectionChanged();
                    }}
                    className="mt-1 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                </div>
              </div>

              <div className="mt-auto pt-12">
                <Button
                  onClick={handleConfirm}
                  disabled={!keysSaved || confirmKeysMutation.isPending}
                  className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-arabic text-lg rounded-sm disabled:opacity-50"
                >
                  {confirmKeysMutation.isPending ? "جارٍ التأكيد..." : "الدخول إلى البوابة"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
