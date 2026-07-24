// DuelIQ — Daily puzzle logic
// Not endorsed by Riot Games.

// Ordered list of daily puzzle filenames (p001-p010)
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
] as const;

/** Returns day number since UTC epoch (days since 1970-01-01) */
export function utcDayIndex(): number {
  return Math.floor(Date.now() / 86_400_000);
}

/** Returns puzzle index (0-based) for today */
export function todayPuzzleIndex(): number {
  return utcDayIndex() % DAILY_PUZZLES.length;
}

/** Returns puzzle filename for today */
export function todayPuzzleFile(): string {
  return DAILY_PUZZLES[todayPuzzleIndex()];
}

/** Returns puzzle number (1-based, for display) */
export function todayPuzzleNumber(): number {
  return todayPuzzleIndex() + 1;
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
