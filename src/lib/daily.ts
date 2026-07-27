// DuelIQ — Daily puzzle logic
// Not endorsed by Riot Games.

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO-FIRST DAILY (DESIGN_SPEC v2.1 — real Valorant footage is the product)
// The daily now serves a video puzzle (clip → freeze → choose → real resolution).
// The 30 static 2D puzzles are demoted to an internal library, still reachable
// via ?p=001..030 (deep-links / playtest) but never the served daily.
//
// Runway: 15 video puzzles = 15-day rotation (batch #2 added video-007..015 from
// two additional CC-BY sources — see footage/SOURCES.md). Maps: Haven (001-006,
// 014-015), Ascent (007-010), Bind (011-013). ≥14-day runway, cadence TODO cleared.
// ─────────────────────────────────────────────────────────────────────────────
export const VIDEO_DAILY = [
  "puzzle-video-001.json",
  "puzzle-video-002.json",
  "puzzle-video-003.json",
  "puzzle-video-004.json",
  "puzzle-video-005.json",
  "puzzle-video-006.json",
  "puzzle-video-007.json",
  "puzzle-video-008.json",
  "puzzle-video-009.json",
  "puzzle-video-010.json",
  "puzzle-video-011.json",
  "puzzle-video-012.json",
  "puzzle-video-013.json",
  "puzzle-video-014.json",
  "puzzle-video-015.json",
] as const;

// Ordered list of static puzzle filenames (p001-p030) — internal library.
// Still deep-linkable via ?p=NNN; no longer the served daily (video-first).
// puzzle-000-exemple is excluded from rotation (wrong viewBox baseline)
export const DAILY_PUZZLES = [
  "puzzle-001-retake-haven.json",
  "puzzle-002-retake-bind.json",
  "puzzle-003-postplant-ascent.json",
  "puzzle-004-postplant-haven.json",
  "puzzle-005-eco-bind.json",
  "puzzle-006-eco-ascent.json",
  "puzzle-007-entry-ascent.json",
  "puzzle-008-entry-bind.json",
  "puzzle-009-rotation-haven.json",
  "puzzle-010-rotation-ascent.json",
  "puzzle-011-postplant-bind.json",
  "puzzle-012-postplant-haven.json",
  "puzzle-013-lurk-ascent.json",
  "puzzle-014-lurk-bind.json",
  "puzzle-015-util-haven.json",
  "puzzle-016-util-ascent.json",
  "puzzle-017-eco-bind.json",
  "puzzle-018-eco-ascent.json",
  "puzzle-019-clutch-haven.json",
  "puzzle-020-clutch-ascent.json",
  "puzzle-021-entry-split.json",
  "puzzle-022-retake-split.json",
  "puzzle-023-postplant-split.json",
  "puzzle-024-eco-split.json",
  "puzzle-025-clutch-split.json",
  "puzzle-026-rotation-lotus.json",
  "puzzle-027-util-lotus.json",
  "puzzle-028-entry-lotus.json",
  "puzzle-029-rotation-lotus.json",
  "puzzle-030-retake-lotus.json",
] as const;

/** Returns day number since UTC epoch (days since 1970-01-01) */
export function utcDayIndex(): number {
  return Math.floor(Date.now() / 86_400_000);
}

/** Returns video-daily index (0-based) for today */
export function todayPuzzleIndex(): number {
  return utcDayIndex() % VIDEO_DAILY.length;
}

/** Returns the served daily puzzle filename for today (video-first). */
export function todayPuzzleFile(): string {
  return VIDEO_DAILY[todayPuzzleIndex()];
}

/** Returns puzzle number (1-based, for display) */
export function todayPuzzleNumber(): number {
  return todayPuzzleIndex() + 1;
}

/** Honest content runway in days before the video daily rotation repeats. */
export function videoRunwayDays(): number {
  return VIDEO_DAILY.length;
}

/** Returns #N daily number (days since epoch, unique each day) */
export function dailyNumber(): number {
  return utcDayIndex();
}

/** Returns seconds until next UTC midnight */
export function secondsUntilReset(): number {
  const now = Date.now();
  const nextMidnight = (Math.floor(now / 86_400_000) + 1) * 86_400_000;
  return Math.floor((nextMidnight - now) / 1000);
}

/** Format seconds as HH:MM:SS */
export function formatCountdown(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

// ---- Streak localStorage ----
const LS_STREAK_KEY = "dueliq_streak";
const LS_LAST_DAY_KEY = "dueliq_last_day";
const LS_BEST_KEY = "dueliq_best";
const LS_PLAYED_TODAY_KEY = "dueliq_played_today";

interface StreakData {
  streak: number;
  best: number;
  lastDay: number;
  playedToday: boolean;
}

export function getStreakData(): StreakData {
  try {
    const today = utcDayIndex();
    const lastDay = parseInt(localStorage.getItem(LS_LAST_DAY_KEY) ?? "0", 10);
    const streak = parseInt(localStorage.getItem(LS_STREAK_KEY) ?? "0", 10);
    const best = parseInt(localStorage.getItem(LS_BEST_KEY) ?? "0", 10);
    const playedToday = localStorage.getItem(LS_PLAYED_TODAY_KEY) === String(today);

    // If last played was 2+ days ago, streak is broken
    const activStreak = (today - lastDay <= 1) ? streak : 0;

    return { streak: activStreak, best, lastDay, playedToday };
  } catch {
    return { streak: 0, best: 0, lastDay: 0, playedToday: false };
  }
}

export function markDailyPlayed(): void {
  try {
    const today = utcDayIndex();
    const data = getStreakData();
    if (data.playedToday) return; // already counted

    const newStreak = data.streak + 1;
    const newBest = Math.max(data.best, newStreak);

    localStorage.setItem(LS_STREAK_KEY, String(newStreak));
    localStorage.setItem(LS_BEST_KEY, String(newBest));
    localStorage.setItem(LS_LAST_DAY_KEY, String(today));
    localStorage.setItem(LS_PLAYED_TODAY_KEY, String(today));
  } catch {
    // localStorage unavailable (private mode etc.) — silent fail
  }
}
