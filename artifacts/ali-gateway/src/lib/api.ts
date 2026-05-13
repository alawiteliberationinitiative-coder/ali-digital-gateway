/**
 * Centralized fetch utility that automatically attaches Telegram auth headers.
 * Send x-telegram-init-data (validated on server) + x-telegram-id (for compat).
 */

let _initData = "";
let _telegramId = "";

export function configureApi(telegramId: string, initData: string) {
  _telegramId = telegramId;
  _initData = initData;
}

export function apiFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);

  if (_telegramId) headers.set("x-telegram-id", _telegramId);
  if (_initData)   headers.set("x-telegram-init-data", _initData);
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    // only set JSON content-type for non-FormData bodies
  }

  return fetch(input, { ...init, headers });
}
