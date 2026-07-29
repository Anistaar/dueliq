// DuelIQ — Onboarding: role + rank personalization (localStorage, no account)
// Not endorsed by Riot Games.

// ── Types ──────────────────────────────────────────────────────────────────

export type Role = "Duelist" | "Initiator" | "Controller" | "Sentinel" | "Flex";
export type RankBand = "Iron-Silver" | "Gold-Plat" | "Diamond-Ascendant" | "Immortal+";

export interface OnboardingProfile {
  role: Role;
  rank: RankBand;
}

// ── Constants ──────────────────────────────────────────────────────────────

const LS_KEY = "dueliq_onboarding_v1";
const LS_DISMISSED = "dueliq_onboarding_dismissed";

// ── Role → relevant themes mapping ────────────────────────────────────────
// Used to score puzzle relevance for "Recommended for you" section.
// Priority themes listed first = highest weight.
//
// Design rationale:
//   Duelist   → entry/clutch fraggers, aggressive plays
//   Initiator → utility, information gathering
//   Controller → util/post-plant, area denial
//   Sentinel  → retake, rotation, info denial
//   Flex      → broad mix — all themes weighted equally via no restriction
export const ROLE_THEMES: Record<Role, string[]> = {
  Duelist:    ["entry", "clutch", "eco", "postplant"],
  Initiator:  ["util", "info", "entry", "eco"],
  Controller: ["util", "postplant", "rotation", "eco"],
  Sentinel:   ["retake", "rotation", "util", "postplant"],
  Flex:       ["entry", "clutch", "util", "postplant", "retake", "rotation", "eco", "info"],
};

// ── Rank → difficulty window mapping ──────────────────────────────────────
// Maps rank band to ideal difficulty range [min, max] (scale 1-5).
// Puzzles within range scored +2, adjacent ±1 scored +1, outside = 0.
//
// Logic:
//   Iron-Silver       → diff 2-3 (fundamentals, clear concepts)
//   Gold-Plat         → diff 3   (solid fundamentals, medium complexity)
//   Diamond-Ascendant → diff 3-4 (advanced, multi-variable decisions)
//   Immortal+         → diff 4-5 (mastery, highest complexity)
export const RANK_DIFFICULTY: Record<RankBand, [number, number]> = {
  "Iron-Silver":       [2, 3],
  "Gold-Plat":         [3, 3],
  "Diamond-Ascendant": [3, 4],
  "Immortal+":         [4, 5],
};

// ── Relevance scoring ─────────────────────────────────────────────────────
// Returns a score 0-4 for how relevant a puzzle is to the user's profile.
// Higher = more relevant → sorted first in "Recommended for you".
export function getPuzzleRelevanceScore(
  puzzle: { theme: string; difficulty: number },
  profile: OnboardingProfile
): number {
  let score = 0;

  // Theme relevance: index in ROLE_THEMES array (lower index = higher priority)
  const themeList = ROLE_THEMES[profile.role];
  const themeIdx = themeList.indexOf(puzzle.theme);
  if (themeIdx === 0) score += 2;
  else if (themeIdx > 0 && themeIdx <= 2) score += 1;
  // themeIdx === -1 (not in list): 0 points — Flex gets all themes listed so always matches

  // Difficulty relevance: within rank window
  const [minDiff, maxDiff] = RANK_DIFFICULTY[profile.rank];
  if (puzzle.difficulty >= minDiff && puzzle.difficulty <= maxDiff) {
    score += 2;
  } else if (
    puzzle.difficulty === minDiff - 1 ||
    puzzle.difficulty === maxDiff + 1
  ) {
    score += 1;
  }

  return score;
}

// ── Persistence ───────────────────────────────────────────────────────────

export function loadProfile(): OnboardingProfile | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingProfile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: OnboardingProfile): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(profile));
  } catch {
    // localStorage unavailable — silent fail
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_DISMISSED);
  } catch {}
}

/** Banner dismissed without completing: user clicked "Later" */
export function dismissBanner(): void {
  try {
    localStorage.setItem(LS_DISMISSED, "1");
  } catch {}
}

export function isBannerDismissed(): boolean {
  try {
    return localStorage.getItem(LS_DISMISSED) === "1";
  } catch {
    return false;
  }
}

/** Banner should show if: no profile saved AND not dismissed */
export function shouldShowBanner(): boolean {
  return loadProfile() === null && !isBannerDismissed();
}
