import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Play, Pause } from "lucide-react";

interface AdOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  type?: "interstitial" | "video";
}

export function AdOverlay({ isOpen, onClose, type = "interstitial" }: AdOverlayProps) {
  const [canSkip, setCanSkip] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCanSkip(false);
      setCountdown(5);
      setIsPlaying(false);
      setProgress(0);
      return;
    }

    if (type === "interstitial") {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanSkip(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }

    if (type === "video" && isPlaying) {
      const duration = 8000;
      const interval = 100;
      const timer = setInterval(() => {
        setProgress((prev) => {
          const next = prev + (interval / duration) * 100;
          if (next >= 100) {
            clearInterval(timer);
            setCanSkip(true);
            return 100;
          }
          return next;
        });
      }, interval);
      return () => clearInterval(timer);
    }
  }, [isOpen, type, isPlaying]);

  useEffect(() => {
    if (isOpen && type === "video") {
      setIsPlaying(true);
    }
  }, [isOpen, type]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col bg-black text-white"
          data-testid="ad-overlay"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/50 absolute top-0 w-full z-10">
            <span className="text-xs uppercase tracking-widest text-white/50 font-bold">
              Advertisement
            </span>
            <div className="flex items-center gap-4">
              {type === "interstitial" && !canSkip && (
                <span className="text-sm text-white/70" data-testid="text-ad-countdown">
                  Skip in {countdown}s
                </span>
              )}
              {(canSkip || type === "video" && progress >= 100) ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="bg-transparent border-white/20 text-white hover:bg-white/10"
                  data-testid="button-ad-close"
                >
                  <X className="w-4 h-4 mr-2" />
                  Close
                </Button>
              ) : type === "interstitial" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="bg-transparent border-white/10 text-white/50"
                  data-testid="button-ad-skip-disabled"
                >
                  Skip after {countdown}s
                </Button>
              ) : null}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-slate-900">
            {type === "interstitial" ? (
              <div className="text-center max-w-md px-6">
                <div className="w-24 h-24 bg-primary/20 rounded-2xl mx-auto mb-8 flex items-center justify-center">
                  <div className="w-12 h-12 bg-primary rounded-xl" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Empower Your Mission</h2>
                <p className="text-white/60 mb-8 text-lg">
                  Join thousands of leaders making a difference. Upgrade to premium for exclusive insights.
                </p>
                <Button
                  size="lg"
                  className="w-full text-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={onClose}
                  data-testid="button-ad-cta"
                >
                  Learn More
                </Button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-black relative">
                {progress >= 100 ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center z-10"
                  >
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Thank you for supporting ALI!</h3>
                    <p className="text-white/60">Your support keeps the initiative moving forward.</p>
                  </motion.div>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-slate-800 flex items-center justify-center">
                      <div className="text-center opacity-50">
                        <div className="w-32 h-32 border-4 border-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Play className="w-12 h-12 text-white/50 ml-2" />
                        </div>
                        <p className="text-2xl font-bold tracking-widest uppercase">Video Ad</p>
                      </div>
                    </div>
                    
                    {/* Fake Video Player Controls */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="flex items-center gap-4 mb-4">
                        <button 
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="text-white hover:text-primary transition-colors"
                          data-testid="button-ad-playpause"
                        >
                          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                        </button>
                        <div className="text-sm font-mono text-white/80">
                          00:0{Math.floor((progress / 100) * 8)} / 00:08
                        </div>
                      </div>
                      <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-100 ease-linear"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
