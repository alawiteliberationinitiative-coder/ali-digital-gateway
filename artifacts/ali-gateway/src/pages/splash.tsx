import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
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
      await new Promise((resolve) => setTimeout(resolve, 3000));

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
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-black">
      {/* Full-screen image */}
      <motion.img
        src="/ali-emblem.jpg"
        alt="A.L.I. Emblem"
        className="absolute inset-0 w-full h-full object-cover object-center"
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        draggable={false}
      />

      {/* Dark gradient overlay at bottom for text legibility */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-2/5"
        style={{
          background: "linear-gradient(to top, rgba(0,43,27,0.97) 0%, rgba(0,43,27,0.7) 55%, transparent 100%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
      />

      {/* Top vignette */}
      <div
        className="absolute inset-x-0 top-0 h-1/4 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)",
        }}
      />

      {/* Bottom text content */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center pb-14 px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.9 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-serif text-[#d4af37] tracking-[0.3em] uppercase mb-2">
            A.L.I.
          </h1>
          <p className="text-sm font-mono text-[#d4af37]/80 tracking-[0.2em] uppercase mb-1">
            Alawite Liberation Initiative
          </p>
          <p className="text-[11px] font-mono text-white/40 tracking-widest uppercase">
            Management of Diversified Development
          </p>
        </motion.div>

        {/* Progress bar */}
        <motion.div
          className="w-48 h-[2px] bg-white/10 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.4 }}
        >
          <motion.div
            className="h-full bg-[#d4af37]"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ delay: 1.8, duration: 2.4, ease: "easeInOut" }}
          />
        </motion.div>

        <motion.p
          className="mt-3 text-[10px] font-mono text-white/30 tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.1, duration: 0.5 }}
        >
          Initializing Secure Portal…
        </motion.p>
      </div>
    </div>
  );
}
