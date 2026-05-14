/**
 * Server-side quiz session token store.
 *
 * Flow:
 *   1. Client calls POST /api/quiz/start-level before displaying the quiz UI.
 *      The server records a token bound to the caller's telegramId and the
 *      specific level being started.  Only one outstanding token exists per
 *      user at a time; issuing a new one revokes the previous.
 *   2. Client presents the quiz questions to the user.
 *   3. Client calls POST /api/quiz/complete-level with the quizToken.
 *      The server verifies:
 *        - token exists and belongs to this telegramId (binding)
 *        - token was issued for the level now being completed (level binding)
 *        - token is at least MIN_QUIZ_AGE_MS old (proves quiz session was open)
 *        - token has not yet expired (TTL)
 *        - token has not already been spent (single-use)
 *
 * This closes the direct-API exploit: an attacker cannot call complete-level
 * without first calling start-level, and the minimum-age check ensures the
 * quiz session was open for a realistic duration.
 */

import { randomUUID } from "crypto";

export const MIN_QUIZ_AGE_MS = 10_000;  // quiz session must be at least 10 s old
const TTL_MS                 = 15 * 60_000; // tokens expire after 15 minutes

interface QuizChallengeEntry {
  telegramId: string;
  level:      number;
  issuedAt:   number;
}

const challenges = new Map<string, QuizChallengeEntry>();

// Reverse index: telegramId → current outstanding quiz token UUID.
const userToken  = new Map<string, string>();

/**
 * Issues a quiz session token bound to a specific level.
 * Any previous outstanding token for this user is revoked.
 */
export function issueQuizChallenge(telegramId: string, level: number): string {
  // Revoke any previously outstanding token for this user.
  const previous = userToken.get(telegramId);
  if (previous) challenges.delete(previous);

  const token    = randomUUID();
  const issuedAt = Date.now();
  challenges.set(token, { telegramId, level, issuedAt });
  userToken.set(telegramId, token);

  // Opportunistic GC: prune expired entries.
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
 * Validates the quiz token for a specific level and removes it (single-use).
 * Returns the age in ms if valid, null otherwise.
 */
export function validateAndConsumeQuiz(
  telegramId: string,
  token:      string,
  level:      number,
): number | null {
  const entry = challenges.get(token);
  if (!entry) return null;
  if (entry.telegramId !== telegramId) return null;
  if (entry.level      !== level)      return null;

  const age = Date.now() - entry.issuedAt;
  challenges.delete(token);
  userToken.delete(telegramId);

  if (age < MIN_QUIZ_AGE_MS) return null; // submitted too quickly
  if (age > TTL_MS)          return null; // expired

  return age;
}
