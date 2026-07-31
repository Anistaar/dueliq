// DuelIQ — Daily puzzle logic
// Not endorsed by Riot Games.

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO-FIRST DAILY (DESIGN_SPEC v2.1 — real Valorant footage is the product)
// The daily now serves a video puzzle (clip → freeze → choose → real resolution).
// The 30 static 2D puzzles are demoted to an internal library, still reachable
// via ?p=001..030 (deep-links / playtest) but never the served daily.
//
// Runway: 27 video puzzles = 27-day rotation.
//   Batch #1 video-001..006 (Haven, Dope Gameplays CC-BY).
//   Batch #2 video-007..015 (Ascent+Bind Spike Rush, No Copyright Gameplay CC-BY).
//   Batch #4 (2026-07-31) video-016..027 — NEW: 1080p60 RANKED player-POV, game audio,
//     from 3 CC-BY compilation VODs (No Copyright Gameplay: LEpGr12MYjM, _gbfEXhJjz0,
//     rPFcvli4m7s). Adds Split, Pearl, Icebox in video for the first time; covers the new
//     taxonomy tags (zoning/info/timing/duel-selection/anchor/advantage).
//   Batch #4 ALSO replaced the 3 weakest muted Spike Rush clips with ranked+audio footage:
//     video-008 (now Split eco), video-012 (Bind entry Op+spike), video-013 (Bind rotation).
//   Maps in video now: Haven, Ascent, Bind, Split, Pearl, Icebox. See footage/SOURCES.md.
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
  "puzzle-video-016.json",
  "puzzle-video-017.json",
  "puzzle-video-018.json",
  "puzzle-video-019.json",
  "puzzle-video-020.json",
  "puzzle-video-021.json",
  "puzzle-video-022.json",
  "puzzle-video-023.json",
  "puzzle-video-024.json",
  "puzzle-video-025.json",
  "puzzle-video-026.json",
  "puzzle-video-027.json",
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
const LS_FREEZE_WEEK_KEY = "dueliq_freeze_used_week";
const LS_FIRST_VISIT_KEY = "dueliq_first_visit";

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

    // Grace window: 48h (2 days) — streak survives if last played yesterday or today
    const activStreak = (today - lastDay <= 2) ? streak : 0;

    return { streak: activStreak, best, lastDay, playedToday };
  } catch {
    return { streak: 0, best: 0, lastDay: 0, playedToday: false };
  }
}

/** Returns the ISO week number (Mon-based) for a UTC day index */
function isoWeekOfDay(dayIndex: number): number {
  // dayIndex 0 = Thu 1970-01-01 (Thu = day 4 of week). Shift to Mon-based.
  return Math.floor((dayIndex + 3) / 7);
}

/**
 * Use one freeze this week. Returns true if the freeze was applied (streak saved),
 * false if already used this week or no freeze available.
 */
export function useStreakFreeze(): boolean {
  try {
    const week = isoWeekOfDay(utcDayIndex());
    const usedWeek = parseInt(localStorage.getItem(LS_FREEZE_WEEK_KEY) ?? "-1", 10);
    if (usedWeek === week) return false; // already used this week
    localStorage.setItem(LS_FREEZE_WEEK_KEY, String(week));
    return true;
  } catch {
    return false;
  }
}

/** True if freeze has already been used this calendar week */
export function freezeUsedThisWeek(): boolean {
  try {
    const week = isoWeekOfDay(utcDayIndex());
    return parseInt(localStorage.getItem(LS_FREEZE_WEEK_KEY) ?? "-1", 10) === week;
  } catch {
    return false;
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

/**
 * Starter puzzle logic:
 * - First visit → serve video-009 (diff 2, Ascent eco) with badge "starter"
 * - Subsequent visits → normal rotation
 * Returns { file, isStarter }
 */
export function getStarterOrDaily(): { file: string; isStarter: boolean } {
  try {
    const visited = localStorage.getItem(LS_FIRST_VISIT_KEY);
    if (!visited) {
      // Mark first visit immediately so a hard reload doesn't re-trigger
      localStorage.setItem(LS_FIRST_VISIT_KEY, "1");
      return { file: "puzzle-video-009.json", isStarter: true };
    }
  } catch {
    // localStorage unavailable — fall through to normal daily
  }
  return { file: todayPuzzleFile(), isStarter: false };
}
