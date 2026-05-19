/**
 * Native-app JWT storage and retrieval.
 *
 * Uses localStorage (scoped to the production domain when server.url is set in
 * capacitor.config.ts). Can be upgraded to @capacitor/preferences for hardware-
 * backed secure storage if required.
 */

const TOKEN_KEY = "ali_native_jwt";
const TID_KEY   = "ali_native_tid";

export function storeNativeToken(token: string, telegramId: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TID_KEY,   telegramId);
  } catch { /* storage unavailable */ }
}

export function getNativeToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function getNativeTelegramId(): string | null {
  try { return localStorage.getItem(TID_KEY); } catch { return null; }
}

export function clearNativeToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TID_KEY);
  } catch { /* ignore */ }
}

/**
 * Client-side expiry check (best-effort).
 * The server always performs its own signature + expiry verification.
 */
export function hasValidNativeToken(): boolean {
  const token = getNativeToken();
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    // Pad base64url to standard base64 for atob
    const padded  = parts[1].replace(/-/g, "+").replace(/_/g, "/")
      .padEnd(parts[1].length + (4 - parts[1].length % 4) % 4, "=");
    const payload = JSON.parse(atob(padded)) as { exp?: number; type?: string };
    if (payload.type !== "native") { clearNativeToken(); return false; }
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      clearNativeToken(); return false;
    }
    return true;
  } catch {
    clearNativeToken();
    return false;
  }
}
