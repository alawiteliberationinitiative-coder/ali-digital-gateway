/**
 * Centralized fetch utility that automatically attaches auth headers.
 *
 * Auth priority:
 *  1. x-telegram-init-data  — Telegram Mini App context (HMAC-validated server-side)
 *  2. Authorization: Bearer — Native-app context (JWT issued after one-time code exchange)
 *
 * Timeout: applied to every request (default 12 s).
 * Retries:  only for safe, idempotent methods (GET, HEAD).
 *           POST / PUT / PATCH / DELETE are never retried.
 */

let _initData   = "";
let _telegramId = "";
let _nativeJwt  = "";

export function configureApi(telegramId: string, initData: string): void {
  _telegramId = telegramId;
  _initData   = initData;
  _nativeJwt  = "";     // clear native JWT when Telegram auth is active
}

export function configureApiNative(jwt: string): void {
  _nativeJwt  = jwt;
  _initData   = "";     // clear Telegram auth when native JWT is active
  _telegramId = "";
}

export function clearApiAuth(): void {
  _initData   = "";
  _telegramId = "";
  _nativeJwt  = "";
}

export function getInitData(): string  { return _initData; }
export function getNativeJwt(): string { return _nativeJwt; }

interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?:   number;
}

const SAFE_METHODS = new Set(["GET", "HEAD"]);

async function doFetch(input: RequestInfo, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function apiFetch(
  input: RequestInfo,
  { timeoutMs = 12_000, retries = 2, ...init }: ApiFetchOptions = {},
): Promise<Response> {
  const headers = new Headers(init.headers);

  // Attach the appropriate auth header based on context
  if (_nativeJwt) {
    // Native-app context: Bearer JWT
    headers.set("authorization", `Bearer ${_nativeJwt}`);
  } else if (_initData) {
    // Telegram Mini App context: validated initData
    headers.set("x-telegram-init-data", _initData);
  }

  // Auto-set Content-Type for JSON string bodies
  if (typeof init.body === "string" && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const reqInit: RequestInit = { ...init, headers };

  const method      = (reqInit.method ?? "GET").toUpperCase();
  const maxAttempts = SAFE_METHODS.has(method) ? retries + 1 : 1;

  let lastError: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) await new Promise(r =>
      setTimeout(r, Math.min(600 * Math.pow(2, i - 1) + Math.random() * 300, 8_000))
    );
    try {
      return await doFetch(input, reqInit, timeoutMs);
    } catch (err) {
      lastError = err;
      if (err instanceof DOMException && err.name === "AbortError") continue;
      const isNetworkError =
        err instanceof TypeError &&
        (err.message.includes("fetch") || err.message.includes("network") || err.message.includes("Failed"));
      if (!isNetworkError) throw err;
    }
  }
  throw lastError;
}
