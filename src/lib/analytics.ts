// DuelIQ — GoatCounter analytics helpers
// No cookies. No personal data. Anonymous aggregate counts only.
// Not endorsed by Riot Games.

import type { OptionTier } from "./engine/puzzle_types.js";
import { utcDayIndex } from "./daily.js";

const GC_COUNT_URL = "https://dueliq.goatcounter.com/count";
const GC_BASE = "https://dueliq.goatcounter.com";

// Bucket path segment per tier
function tierBucket(tier: OptionTier): string {
  return tier; // "optimal" | "acceptable" | "couteux" | "faute"
}

/** Virtual path for a daily event: /e/daily/{dayIndex}/{bucket} */
function dailyEventPath(dayIndex: number, tier: OptionTier): string {
  return `/e/daily/${dayIndex}/${tierBucket(tier)}`;
}

/**
 * Send a virtual pageview to GoatCounter for the daily completion.
 * GoatCounter count endpoint uses GET with URL params (same as gc.zgo.at/count.js beacon).
 * Uses sendBeacon for reliability on page close, falls back to fetch image.
 * Fire-and-forget — errors are silent (adblock, offline, account not created yet).
 */
export function trackDailyCompletion(tier: OptionTier): void {
  const dayIndex = utcDayIndex();
  const path = dailyEventPath(dayIndex, tier);
  const rnd = Math.random().toString(36).slice(2, 8);
  const params = new URLSearchParams({
    p: path,
    t: `DuelIQ daily #${dayIndex} — ${tier}`,
    r: "",
    e: "1",   // event flag
    rnd,
  });
  const url = `${GC_COUNT_URL}?${params.toString()}`;

  try {
    // sendBeacon survives page unload; no response needed
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url);
    } else {
      // Fallback: fire-and-forget image pixel
      new Image().src = url;
    }
  } catch {
    // Silent: adblock, network error, account not yet created — non-blocking
  }
}

/** Parse GoatCounter count string (e.g. "1,234") → number */
function parseCount(s: string): number {
  return parseInt(s.replace(/,/g, ""), 10) || 0;
}

/** Fetch count for one path from GoatCounter public counter JSON endpoint */
async function fetchBucketCount(dayIndex: number, tier: OptionTier): Promise<number> {
  const path = dailyEventPath(dayIndex, tier);
  // GoatCounter public counter URL format: /counter/<path>.json
  // Path has a leading slash → results in double-slash after /counter/
  // e.g. /counter//e/daily/20660/optimal.json
  // The last path segment must not conflict with the .json extension —
  // our tier values (optimal/acceptable/couteux/faute) have no dots, so this is safe.
  const url = `${GC_BASE}/counter/${path}.json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { count: string; count_unique?: string };
  return parseCount(data.count);
}

export interface PercentileResult {
  /** Total players today (sum of all 4 buckets) */
  total: number;
  /** Players who scored LOWER than the user (strictly worse tiers) */
  below: number;
  /** Percentile beat (0–100), integer */
  percentile: number;
  /** True when N < 10 — show "parmi les N premiers" instead of % */
  smallCohort: boolean;
}

// Tier ordering from worst to best
const TIER_ORDER: OptionTier[] = ["faute", "couteux", "acceptable", "optimal"];

/**
 * Fetch all 4 bucket counts for today and compute user's percentile.
 * Returns null on any fetch error (adblock, account not created, network).
 */
export async function fetchDailyPercentile(
  userTier: OptionTier
): Promise<PercentileResult | null> {
  const dayIndex = utcDayIndex();

  try {
    // Parallel fetch of all 4 buckets
    const counts = await Promise.all(
      TIER_ORDER.map((tier) => fetchBucketCount(dayIndex, tier))
    );

    const bucketMap: Record<OptionTier, number> = {
      faute:      counts[0],
      couteux:    counts[1],
      acceptable: counts[2],
      optimal:    counts[3],
    };

    const total = counts.reduce((a, b) => a + b, 0);

    // Players strictly BELOW user = those in tiers worse than user's tier
    const userTierIdx = TIER_ORDER.indexOf(userTier); // higher idx = better
    const below = TIER_ORDER.slice(0, userTierIdx).reduce(
      (acc, tier) => acc + bucketMap[tier],
      0
    );

    // Percentile: proportion of players the user beats
    // If total = 0 (no one played yet), return null — not enough data
    if (total === 0) return null;

    const percentile = Math.round((below / total) * 100);
    const smallCohort = total < 10;

    return { total, below, percentile, smallCohort };
  } catch {
    return null; // Adblock, network, account not created — silent degrade
  }
}

/** Format percentile result into a display string */
export function formatPercentile(result: PercentileResult): string {
  if (result.smallCohort) {
    return `Parmi les ${result.total} premiers joueurs du jour`;
  }
  if (result.percentile >= 99) return "Mieux que 99% des joueurs du jour";
  if (result.percentile === 0) return "En bas du classement du jour";
  return `Mieux que ${result.percentile}% des joueurs du jour`;
}
