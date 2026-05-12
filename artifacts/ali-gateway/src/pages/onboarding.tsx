import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTelegram } from "@/lib/telegram";
import { useGetMe, useConfirmKeys, getGetMeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, KeyRound, ArrowRight } from "lucide-react";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user, webApp } = useTelegram();
  const telegramId = user?.id?.toString() || "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1);
  const [keysSaved, setKeysSaved] = useState(false);
  
  const { data: userData, isLoading } = useGetMe({
    request: { headers: { "X-Telegram-ID": telegramId } },
    query: { enabled: !!telegramId }
  });

  const confirmKeysMutation = useConfirmKeys();

  useEffect(() => {
    if (userData?.keysConfirmed) {
      setLocation("/dashboard");
    }
  }, [userData, setLocation]);

  const handleNextStep = () => {
    webApp?.HapticFeedback?.impactOccurred('light');
    setStep(prev => prev + 1);
  };

  const handleConfirm = () => {
    if (!keysSaved) return;
    
    webApp?.HapticFeedback?.impactOccurred('medium');
    
    confirmKeysMutation.mutate(
      { data: { telegramId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setLocation("/dashboard");
        },
        onError: () => {
          toast({
            title: "Confirmation Failed",
            description: "An error occurred while confirming your keys.",
            variant: "destructive"
          });
        }
      }
    );
  };

  if (isLoading || !userData) {
    return <div className="min-h-[100dvh] bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
      
      <div className="relative z-10 flex-1 flex flex-col max-w-md mx-auto w-full">
        <header className="mb-12 flex justify-between items-center">
          <div className="text-primary font-serif font-bold tracking-widest">A.L.I.</div>
          <div className="text-muted-foreground font-mono text-xs">STEP 0{step}/03</div>
        </header>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-center"
            >
              <div className="mb-8">
                <Shield className="w-12 h-12 text-primary mb-6" />
                <h1 className="text-3xl font-serif text-primary mb-4">Identity Forged</h1>
                <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                  Your sovereign digital presence has been established within the Gateway. This is your permanent designation.
                </p>
              </div>

              <div className="space-y-6">
                <div className="p-6 border border-primary/20 bg-card rounded-sm">
                  <div className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">A.L.I. Designation</div>
                  <div className="text-2xl font-mono text-primary">{userData.aliId}</div>
                </div>
                
                <div className="p-6 border border-primary/20 bg-card rounded-sm">
                  <div className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Pseudonym</div>
                  <div className="text-xl font-mono text-foreground">{userData.pseudonym}</div>
                </div>
              </div>

              <div className="mt-auto pt-12">
                <Button 
                  onClick={handleNextStep}
                  className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-serif tracking-widest text-lg rounded-sm"
                >
                  PROCEED <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-center"
            >
              <div className="mb-8">
                <KeyRound className="w-12 h-12 text-primary mb-6" />
                <h1 className="text-3xl font-serif text-primary mb-4">Triple Key Vault</h1>
                <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                  These cryptographic keys are the only way to recover your identity. The Gateway does not store them in plaintext. Store them securely offline.
                </p>
              </div>

              <div className="space-y-4">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="p-4 border border-primary/20 bg-black/40 rounded-sm relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/50"></div>
                  <div className="text-xs font-mono text-primary/70 mb-1 uppercase tracking-wider">Vault Key</div>
                  <div className="font-mono text-sm text-primary break-all drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">{userData.vaultKey}</div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  className="p-4 border border-primary/20 bg-black/40 rounded-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/50"></div>
                  <div className="text-xs font-mono text-primary/70 mb-1 uppercase tracking-wider">Identity Key</div>
                  <div className="font-mono text-sm text-primary break-all drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">{userData.identityKey}</div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                  className="p-4 border border-primary/20 bg-black/40 rounded-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/50"></div>
                  <div className="text-xs font-mono text-primary/70 mb-1 uppercase tracking-wider">Master Key</div>
                  <div className="font-mono text-sm text-primary break-all drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">{userData.masterKey}</div>
                </motion.div>
              </div>

              <div className="mt-auto pt-12">
                <Button 
                  onClick={handleNextStep}
                  className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-serif tracking-widest text-lg rounded-sm"
                >
                  ACKNOWLEDGE <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-center"
            >
              <div className="mb-8">
                <h1 className="text-3xl font-serif text-primary mb-4">Final Protocol</h1>
                <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                  Confirm your responsibility over the Triple Key Vault. Loss of these keys results in permanent loss of access.
                </p>
              </div>

              <div className="p-6 border border-primary bg-primary/5 rounded-sm mb-12">
                <div className="flex items-start space-x-4">
                  <Checkbox 
                    id="keys-saved" 
                    checked={keysSaved} 
                    onCheckedChange={(c) => {
                      setKeysSaved(c as boolean);
                      webApp?.HapticFeedback?.selectionChanged();
                    }}
                    className="mt-1 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                  <label 
                    htmlFor="keys-saved" 
                    className="text-sm font-mono leading-relaxed text-foreground cursor-pointer"
                  >
                    I confirm that I have securely saved all three cryptographic keys offline. I understand that the Gateway cannot recover them for me.
                  </label>
                </div>
              </div>

              <div className="mt-auto pt-12">
                <Button 
                  onClick={handleConfirm}
                  disabled={!keysSaved || confirmKeysMutation.isPending}
                  className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-serif tracking-widest text-lg rounded-sm disabled:opacity-50"
                >
                  {confirmKeysMutation.isPending ? "CONFIRMING..." : "ENTER GATEWAY"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
