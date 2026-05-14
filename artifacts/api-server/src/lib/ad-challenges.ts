/**
 * Server-side ad challenge token store.
 *
 * Flow:
 *   1. Client calls POST /api/ads/challenge before starting the ad.
 *      The server records a token with the caller's telegramId and issuedAt.
 *      Any previously outstanding (unconsumed) token for the same user is
 *      immediately revoked, so only one active token exists per user at a time.
 *   2. Client shows the ad (real network call or dev timeout).
 *   3. Client calls POST /api/ads/reward with the challenge token.
 *      The server verifies:
 *        - token exists and belongs to this telegramId (binding)
 *        - token is at least MIN_AGE_MS old (proves time was spent watching)
 *        - token has not yet expired (TTL)
 *        - token has not already been spent (single-use)
 *
 * The one-token-per-user invariant closes the stockpiling attack: a caller
 * cannot pre-mint a batch of valid tokens because each new /challenge request
 * revokes the previous outstanding one.
 */

import { randomUUID } from "crypto";

export const MIN_AGE_MS = 15_000;   // challenge must be at least 15 s old
const TTL_MS           = 5 * 60_000; // tokens expire after 5 minutes

interface ChallengeEntry {
  telegramId: string;
  issuedAt:   number;
}

const challenges  = new Map<string, ChallengeEntry>();

// Reverse index: telegramId → current outstanding token UUID.
// Maintained so that issuing a new challenge can revoke the previous one.
const userToken   = new Map<string, string>();

export function issueChallenge(telegramId: string): string {
  // Revoke any previously outstanding token for this user.
  const previous = userToken.get(telegramId);
  if (previous) challenges.delete(previous);

  const token    = randomUUID();
  const issuedAt = Date.now();
  challenges.set(token, { telegramId, issuedAt });
  userToken.set(telegramId, token);

  // Opportunistic GC: prune expired entries while we are here.
  const expiry = issuedAt - TTL_MS;
  for (const [k, v] of challenges) {
    if (v.issuedAt < expiry) {
      userToken.delete(v.telegramId);
      challenges.delete(k);
    }
  }

  return token;
}

/**
 * Validates the challenge token and removes it (single-use).
 * Returns the age in ms if valid, or null if invalid/expired/too-young/wrong-user.
 */
export function validateAndConsume(
  telegramId: string,
  token: string
): number | null {
  const entry = challenges.get(token);
  if (!entry) return null;
  if (entry.telegramId !== telegramId) return null;

  const age = Date.now() - entry.issuedAt;
  challenges.delete(token);
  userToken.delete(telegramId);

  if (age < MIN_AGE_MS) return null; // submitted too quickly — ad not watched
  if (age > TTL_MS)     return null; // expired

  return age;
}
