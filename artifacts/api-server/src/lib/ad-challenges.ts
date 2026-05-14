/**
 * Server-side ad challenge token store.
 *
 * Flow:
 *   1. Client calls POST /api/ads/challenge before starting the ad.
 *      The server records a token with the caller's telegramId and issuedAt.
 *   2. Client shows the ad (real network call or dev timeout).
 *   3. Client calls POST /api/ads/reward with the challenge token.
 *      The server verifies:
 *        - token exists and belongs to this telegramId (binding)
 *        - token is at least MIN_AGE_MS old (proves time was spent watching)
 *        - token has not yet expired (TTL)
 *        - token has not already been spent (single-use)
 *
 * This prevents reward farming by direct API replay: an attacker cannot obtain
 * points without first receiving a server-issued token and then waiting the
 * minimum ad duration before claiming the reward.
 */

import { randomUUID } from "crypto";

export const MIN_AGE_MS = 15_000;   // challenge must be at least 15 s old
const TTL_MS           = 5 * 60_000; // tokens expire after 5 minutes

interface ChallengeEntry {
  telegramId: string;
  issuedAt:   number;
}

const challenges = new Map<string, ChallengeEntry>();

export function issueChallenge(telegramId: string): string {
  const token    = randomUUID();
  const issuedAt = Date.now();
  challenges.set(token, { telegramId, issuedAt });

  // Opportunistic GC: prune expired entries while we are here.
  const expiry = issuedAt - TTL_MS;
  for (const [k, v] of challenges) {
    if (v.issuedAt < expiry) challenges.delete(k);
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
  challenges.delete(token); // consume regardless so it can't be retried

  if (age < MIN_AGE_MS) return null; // submitted too quickly — ad not watched
  if (age > TTL_MS)     return null; // expired

  return age;
}
