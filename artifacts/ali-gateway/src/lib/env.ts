/**
 * Runtime environment detection for multi-platform operation.
 *
 * Three contexts:
 *  - Telegram Mini App  : window.Telegram.WebApp.initDataUnsafe.user is populated
 *  - Native (Capacitor) : window.Capacitor.isNativePlatform() === true  AND  not Telegram
 *  - Browser / Dev      : everything else (dev fallback, testing, regular web browser)
 */

/** Returns true when running inside Telegram as a Mini App with a real user. */
export function isTelegramEnv(): boolean {
  return !!(
    typeof window !== "undefined" &&
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id
  );
}

/** Returns true when running in a Capacitor native wrapper (Android or iOS). */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as Record<string, unknown>).Capacitor;
  if (!cap || typeof cap !== "object") return false;
  const c = cap as Record<string, unknown>;
  return typeof c.isNativePlatform === "function" &&
    (c.isNativePlatform as () => boolean)();
}

/**
 * Returns true when the app should use JWT-based native auth instead of
 * Telegram initData — i.e. running in a Capacitor wrapper without Telegram.
 */
export function isNativeContext(): boolean {
  return isCapacitorNative() && !isTelegramEnv();
}

/** Returns the current platform label for logging / analytics. */
export function getPlatform(): "telegram" | "native-android" | "native-ios" | "web" {
  if (isTelegramEnv())    return "telegram";
  if (isCapacitorNative()) {
    const cap = (window as unknown as Record<string, unknown>).Capacitor as
      Record<string, unknown> | undefined;
    const platform = (cap?.getPlatform as (() => string) | undefined)?.();
    if (platform === "android") return "native-android";
    if (platform === "ios")     return "native-ios";
  }
  return "web";
}
