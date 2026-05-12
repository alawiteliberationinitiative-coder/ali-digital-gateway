import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { AliEmblem } from "@/components/ui/ali-emblem";
import { useTelegram } from "@/lib/telegram";
import { useRegisterUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function Splash() {
  const [, setLocation] = useLocation();
  const { user, webApp } = useTelegram();
  const { toast } = useToast();
  
  const registerMutation = useRegisterUser();

  useEffect(() => {
    const initApp = async () => {
      // Simulate splash screen delay for animation
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const telegramId = user?.id?.toString() || `dev-${Date.now()}`;
      
      registerMutation.mutate(
        {
          data: {
            telegramId,
            telegramUsername: user?.username || null,
            firstName: user?.first_name || null,
            lastName: user?.last_name || null,
          }
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
          }
        }
      );
    };

    initApp();
  }, [user, setLocation, registerMutation, toast]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Background noise/texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
      
      <div className="relative z-10 flex flex-col items-center">
        <AliEmblem className="w-48 h-48 mb-12" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="text-center"
        >
          <h1 className="text-3xl font-serif text-primary tracking-widest mb-2 uppercase">A.L.I.</h1>
          <p className="text-muted-foreground font-mono text-sm tracking-widest uppercase">Digital Gateway</p>
        </motion.div>
        
        <motion.div 
          className="mt-16 h-1 w-48 bg-primary/20 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.5 }}
        >
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ delay: 2, duration: 2, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    </div>
  );
}
