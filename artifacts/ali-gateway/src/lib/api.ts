/**
 * Centralized fetch utility that automatically attaches Telegram auth headers.
 * x-telegram-init-data is the authoritative identity signal validated by the server.
 * Supports per-request timeout (default 12 s) and automatic retry on network failures.
 */

let _initData = "";
let _telegramId = "";

export function configureApi(telegramId: string, initData: string) {
  _telegramId = telegramId;
  _initData = initData;
}

export function getInitData(): string { return _initData; }

interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

async function attempt(input: RequestInfo, init: RequestInit, timeoutMs: number): Promise<Response> {
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

  const reqInit: RequestInit = { ...init, headers };

  let lastError: unknown;
  for (let attempt_ = 0; attempt_ <= retries; attempt_++) {
    if (attempt_ > 0) {
      await new Promise((r) => setTimeout(r, 400 * attempt_));
    }
    try {
      const res = await attempt(input, reqInit, timeoutMs);
      return res;
    } catch (err) {
      lastError = err;
      if (err instanceof DOMException && err.name === "AbortError") {
        continue;
      }
      const isNetworkError =
        err instanceof TypeError && (err.message.includes("fetch") || err.message.includes("network"));
      if (!isNetworkError) throw err;
    }
  }
  throw lastError;
}
