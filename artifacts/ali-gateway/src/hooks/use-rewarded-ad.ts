import { useState, useCallback, useRef } from "react";

declare global {
  interface Window {
    show_11001376?: () => Promise<void>;
  }
}

export type AdPhase =
  | "idle"
  | "loading"
  | "showing"
  | "completed"
  | "dismissed"
  | "error";

export interface UseRewardedAdResult {
  phase: AdPhase;
  show: () => Promise<boolean>;
  reset: () => void;
  isActive: boolean;
  cooldownLeft: number;
}

const ZONE_FN = "show_11001376" as const;
const DEV_DURATION_MS = 2500;

export function useRewardedAd(cooldownMs = 0): UseRewardedAdResult {
  const [phase, setPhase] = useState<AdPhase>("idle");
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const lastShownAt = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(
    (ms: number) => {
      if (ms <= 0) return;
      lastShownAt.current = Date.now();
      setCooldownLeft(Math.ceil(ms / 1000));
      timerRef.current = setInterval(() => {
        const remaining = Math.ceil(
          (lastShownAt.current + ms - Date.now()) / 1000
        );
        if (remaining <= 0) {
          clearInterval(timerRef.current!);
          setCooldownLeft(0);
        } else {
          setCooldownLeft(remaining);
        }
      }, 500);
    },
    []
  );

  const show = useCallback(async (): Promise<boolean> => {
    if (phase === "loading" || phase === "showing") return false;
    if (cooldownMs > 0 && Date.now() - lastShownAt.current < cooldownMs)
      return false;

    setPhase("loading");

    try {
      setPhase("showing");
      if (typeof window[ZONE_FN] === "function") {
        await window[ZONE_FN]();
      } else {
        await new Promise<void>((res) => setTimeout(res, DEV_DURATION_MS));
      }
      setPhase("completed");
      if (cooldownMs > 0) startCooldown(cooldownMs);
      setTimeout(() => setPhase("idle"), 2800);
      return true;
    } catch {
      setPhase("dismissed");
      setTimeout(() => setPhase("idle"), 2500);
      return false;
    }
  }, [phase, cooldownMs, startCooldown]);

  const reset = useCallback(() => {
    setPhase("idle");
    setCooldownLeft(0);
  }, []);

  const isActive = phase === "loading" || phase === "showing";

  return { phase, show, reset, isActive, cooldownLeft };
}
