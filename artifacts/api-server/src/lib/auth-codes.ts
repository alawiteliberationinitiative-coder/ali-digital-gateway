/**
 * In-memory one-time login code store for native (Capacitor) authentication.
 *
 * Flow:
 *  1. Bot calls POST /api/auth/generate-code → gets an 8-char code
 *  2. Bot sends the code to the user via Telegram
 *  3. User enters the code in the native app
 *  4. App calls POST /api/auth/verify-code → gets a long-lived JWT
 *
 * Codes are:
 *  - 8 characters, uppercase alphanumeric (no ambiguous chars: 0/O, 1/I)
 *  - One per telegramId (new code replaces old)
 *  - One-time use: consumed on first successful verify
 *  - TTL: 10 minutes
 */

interface CodeEntry {
  telegramId: string;
  expiresAt:  number; // Date.now() ms
}

const CODE_TTL_MS = 10 * 60 * 1000;
const CHARS       = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

const codeStore = new Map<string, CodeEntry>(); // code  → entry
const idToCode  = new Map<string, string>();     // tgId  → latest code

// Periodic cleanup to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of codeStore) {
    if (now > entry.expiresAt) {
      codeStore.delete(code);
      if (idToCode.get(entry.telegramId) === code) idToCode.delete(entry.telegramId);
    }
  }
}, 60_000);

function generate(): string {
  let code = "";
  for (let i = 0; i < 8; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

/** Generate (or replace) a one-time login code for a given Telegram user. */
export function createCode(telegramId: string): string {
  // Revoke previous code if any
  const prev = idToCode.get(telegramId);
  if (prev) codeStore.delete(prev);

  // Ensure uniqueness
  let code = generate();
  while (codeStore.has(code)) code = generate();

  codeStore.set(code, { telegramId, expiresAt: Date.now() + CODE_TTL_MS });
  idToCode.set(telegramId, code);
  return code;
}

/**
 * Validate and consume a one-time code.
 * Returns the associated telegramId on success, null on failure/expiry.
 */
export function consumeCode(rawCode: string): string | null {
  const code  = rawCode.toUpperCase().trim();
  const entry = codeStore.get(code);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    codeStore.delete(code);
    if (idToCode.get(entry.telegramId) === code) idToCode.delete(entry.telegramId);
    return null;
  }
  // Consume: remove both code and reverse-lookup entries
  codeStore.delete(code);
  if (idToCode.get(entry.telegramId) === code) idToCode.delete(entry.telegramId);
  return entry.telegramId;
}
