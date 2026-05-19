/**
 * Module-level prefetch cache — written by splash.tsx during the 3-second
 * loading screen, read instantly by articles/reels pages when they mount.
 *
 * Uses plain module state (no React, no context) so it survives route changes
 * and is immediately available synchronously before any useEffect fires.
 */

export type RawArticle = Record<string, unknown>;

interface CacheEntry {
  data: RawArticle[];
  fetchedAt: number;
}

let articlesEntry: CacheEntry | undefined;

const MAX_AGE_MS = 120_000; // 2 minutes

export function setArticlesCache(data: RawArticle[]): void {
  articlesEntry = { data, fetchedAt: Date.now() };
}

/**
 * Returns cached articles if they exist and are younger than maxAgeMs.
 * Returns null if no cache or cache is stale.
 */
export function getArticlesCache(maxAgeMs = MAX_AGE_MS): RawArticle[] | null {
  if (!articlesEntry) return null;
  if (Date.now() - articlesEntry.fetchedAt > maxAgeMs) return null;
  return articlesEntry.data;
}
