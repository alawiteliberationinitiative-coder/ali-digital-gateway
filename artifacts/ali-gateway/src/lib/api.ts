/**
 * Centralized fetch utility that automatically attaches Telegram auth headers.
 * x-telegram-init-data is the authoritative identity signal validated by the server.
 *
 * Timeout: applied to every request (default 12 s).
 * Retries:  only for safe, idempotent methods (GET, HEAD).
 *           POST / PUT / PATCH / DELETE are never retried — retrying side-effecting
 *           requests could duplicate rewards, invites, signaling writes, etc.
 */

let _initData   = "";
let _telegramId = "";

export function configureApi(telegramId: string, initData: string) {
  _telegramId = telegramId;
  _initData   = initData;
}

export function getInitData(): string { return _initData; }

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
  if (_telegramId) headers.set("x-telegram-id", _telegramId);
  if (_initData)   headers.set("x-telegram-init-data", _initData);

  // Auto-set Content-Type for JSON string bodies so express.json() parses them
  if (typeof init.body === "string" && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const reqInit: RequestInit = { ...init, headers };

  // Only retry safe, idempotent methods — never retry side-effecting requests
  const method = (reqInit.method ?? "GET").toUpperCase();
  const maxAttempts = SAFE_METHODS.has(method) ? retries + 1 : 1;

  let lastError: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 400 * i));
    try {
      return await doFetch(input, reqInit, timeoutMs);
    } catch (err) {
      lastError = err;
      if (err instanceof DOMException && err.name === "AbortError") continue;
      const isNetworkError =
        err instanceof TypeError &&
        (err.message.includes("fetch") || err.message.includes("network"));
      if (!isNetworkError) throw err;
    }
  }
  throw lastError;
}
