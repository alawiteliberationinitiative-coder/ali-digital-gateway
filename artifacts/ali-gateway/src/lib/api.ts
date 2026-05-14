/**
 * Centralized fetch utility that automatically attaches Telegram auth headers.
 * x-telegram-init-data is the authoritative identity signal validated by the server.
 * x-telegram-id is sent for informational purposes but is not trusted by the server
 * for external connections — the server only accepts it from local bot processes.
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
