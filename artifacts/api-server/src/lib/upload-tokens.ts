/**
 * Server-side upload token store.
 *
 * When a file is successfully received by /api/docs/upload-file the server
 * registers the returned fileId here, keyed by the uploader's telegramId.
 * /api/docs/submit must present one of these tokens and consume it before
 * loyalty points are awarded.  This prevents clients from calling
 * /api/docs/submit without ever performing a real upload.
 *
 * Tokens are single-use and expire after TOKEN_TTL_MS to prevent hoarding.
 */

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface TokenEntry {
  fileId: string;
  expiresAt: number;
}

const pendingTokens = new Map<string, TokenEntry[]>();

function pruneExpired(telegramId: string): void {
  const entries = pendingTokens.get(telegramId);
  if (!entries) return;
  const now = Date.now();
  const live = entries.filter((e) => e.expiresAt > now);
  if (live.length === 0) {
    pendingTokens.delete(telegramId);
  } else {
    pendingTokens.set(telegramId, live);
  }
}

export function registerUploadToken(telegramId: string, fileId: string): void {
  pruneExpired(telegramId);
  const entries = pendingTokens.get(telegramId) ?? [];
  entries.push({ fileId, expiresAt: Date.now() + TOKEN_TTL_MS });
  pendingTokens.set(telegramId, entries);
}

/**
 * Returns true and removes the token if it exists and has not expired.
 * Returns false otherwise.
 */
export function consumeUploadToken(
  telegramId: string,
  fileId: string
): boolean {
  pruneExpired(telegramId);
  const entries = pendingTokens.get(telegramId);
  if (!entries) return false;
  const idx = entries.findIndex((e) => e.fileId === fileId);
  if (idx === -1) return false;
  entries.splice(idx, 1);
  if (entries.length === 0) {
    pendingTokens.delete(telegramId);
  } else {
    pendingTokens.set(telegramId, entries);
  }
  return true;
}
