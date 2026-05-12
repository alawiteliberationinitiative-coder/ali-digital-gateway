import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { AliEmblem } from "@/components/ui/ali-emblem";
import { useTelegram } from "@/lib/telegram";
import { useRegisterUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function Splash() {
  const [, setLocation] = useLocation();
  const { user } = useTelegram();
  const { toast } = useToast();

  const registerMutation = useRegisterUser();

  useEffect(() => {
    const initApp = async () => {
      await new Promise((resolve) => setTimeout(resolve, 2800));

      const telegramId = user?.id?.toString() || `dev-${Date.now()}`;

      registerMutation.mutate(
        {
          data: {
            telegramId,
            telegramUsername: user?.username || null,
            firstName: user?.first_name || null,
            lastName: user?.last_name || null,
          },
        },
        {
          onSuccess: (data) => {
            if (data.keysConfirmed) {
              setLocation("/dashboard");
            } else {
              setLocation("/onboarding");
            }
          },
          onError: () => {
            toast({
              title: "Initialization Failed",
              description: "Could not establish secure connection to the Gateway.",
              variant: "destructive",
            });
          },
        },
      );
    };

    initApp();
  }, [user, setLocation, registerMutation, toast]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

      {/* Glow behind emblem */}
      <motion.div
        className="absolute w-72 h-72 rounded-full bg-primary/20 blur-3xl"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <AliEmblem className="w-56 h-56 mb-10 shadow-2xl" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="text-center"
        >
          <h1 className="text-3xl font-serif text-primary tracking-widest mb-1 uppercase">A.L.I.</h1>
          <p className="text-xs font-mono text-muted-foreground tracking-[0.3em] uppercase">
            Alawite Liberation Initiative
          </p>
          <p className="text-[10px] font-mono text-muted-foreground/60 tracking-widest uppercase mt-1">
            Management of Diversified Development
          </p>
        </motion.div>

        <motion.div
          className="mt-12 h-[2px] w-48 bg-primary/20 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.5 }}
        >
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ delay: 1.8, duration: 2.2, ease: "easeInOut" }}
          />
        </motion.div>

        <motion.p
          className="mt-4 text-[10px] font-mono text-muted-foreground/40 tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.5 }}
        >
          Initializing Secure Portal…
        </motion.p>
      </div>
    </div>
  );
}
