import { useState, useCallback, useRef } from "react";
import { apiFetch } from "../lib/api";

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
  /**
   * Show the rewarded ad.
   * Returns the server-issued challengeToken (string) if the ad completed
   * and a valid challenge was obtained, or false if the ad was skipped /
   * dismissed / the challenge request failed.
   * Pass the token to POST /api/ads/reward to claim points.
   */
  show: () => Promise<string | false>;
  reset: () => void;
  isActive: boolean;
  cooldownLeft: number;
}

const ZONE_FN = "show_11001376" as const;
const DEV_DURATION_MS = 2500;
// If the ad network function doesn't resolve in this time, treat as completed
// so the user is never permanently stuck on the ad screen.
const AD_TIMEOUT_MS = 18000;

export function useRewardedAd(
  cooldownMs = 0,
  telegramId = ""
): UseRewardedAdResult {
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

  const show = useCallback(async (): Promise<string | false> => {
    if (phase === "loading" || phase === "showing") return false;
    if (cooldownMs > 0 && Date.now() - lastShownAt.current < cooldownMs)
      return false;

    setPhase("loading");

    // Obtain a server-issued challenge token before the ad starts.
    // This token records the start time server-side; the reward endpoint
    // verifies the token is old enough to prove the ad was watched.
    // Uses apiFetch so x-telegram-init-data (HMAC-verified) is sent automatically.
    let challengeToken: string | null = null;
    try {
      const challengeRes = await apiFetch("/api/ads/challenge", { method: "POST" });
      if (challengeRes.ok) {
        const data = await challengeRes.json() as { challengeToken?: string };
        challengeToken = data.challengeToken ?? null;
      } else if (challengeRes.status === 429) {
        // Still in cooldown — surface the server's error to the caller.
        setPhase("idle");
        return false;
      }
    } catch {
      // Network error: proceed without token; reward will be rejected server-side.
    }

    try {
      setPhase("showing");
      if (typeof window[ZONE_FN] === "function") {
        // Race the ad network call against a timeout so users are never
        // permanently stuck if the ad function hangs without resolving.
        await Promise.race([
          window[ZONE_FN](),
          new Promise<void>((resolve) => setTimeout(resolve, AD_TIMEOUT_MS)),
        ]);
      } else {
        await new Promise<void>((res) => setTimeout(res, DEV_DURATION_MS));
      }
      setPhase("completed");
      if (cooldownMs > 0) startCooldown(cooldownMs);
      setTimeout(() => setPhase("idle"), 2800);
      return challengeToken ?? false;
    } catch {
      setPhase("dismissed");
      setTimeout(() => setPhase("idle"), 2500);
      return false;
    }
  }, [phase, cooldownMs, telegramId, startCooldown]);

  const reset = useCallback(() => {
    setPhase("idle");
    setCooldownLeft(0);
  }, []);

  const isActive = phase === "loading" || phase === "showing";

  return { phase, show, reset, isActive, cooldownLeft };
}
