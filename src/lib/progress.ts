// DuelIQ — Local progress tracking (localStorage, no account)
// Not endorsed by Riot Games.

// ── Types ──────────────────────────────────────────────────────────────────

export type Grade = "S" | "A" | "C" | "X";

export interface PuzzleResult {
  puzzle: string;   // puzzle id, e.g. "puzzle-video-001"
  tier: string;     // "optimal" | "acceptable" | "couteux" | "faute"
  grade: Grade;
  score: number;    // 0-1000
  theme: string;
  map: string;
  date: string;     // ISO date string
}

export interface ProgressData {
  results: PuzzleResult[];
}

// ── Constants ──────────────────────────────────────────────────────────────

const LS_KEY = "dueliq_progress_v1";

// ── Helpers ────────────────────────────────────────────────────────────────

function load(): ProgressData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { results: [] };
    return JSON.parse(raw) as ProgressData;
  } catch {
    return { results: [] };
  }
}

function save(data: ProgressData): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable (private mode) — silent fail
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Record a puzzle result. Each puzzle can be recorded multiple times (replays).
 *  For progress display we use the LATEST result per puzzle id. */
export function recordResult(result: PuzzleResult): void {
  const data = load();
  // Remove any previous entry for this puzzle (keep only latest)
  data.results = data.results.filter((r) => r.puzzle !== result.puzzle);
  data.results.push(result);
  save(data);
}

/** Returns the latest result for each unique puzzle id. */
export function getLatestResults(): PuzzleResult[] {
  const data = load();
  // Data is already deduplicated (recordResult removes old entry first)
  return data.results;
}

/** Returns set of played puzzle ids. */
export function getPlayedIds(): Set<string> {
  return new Set(getLatestResults().map((r) => r.puzzle));
}

/** Returns the result for a specific puzzle id, or null. */
export function getResultFor(puzzleId: string): PuzzleResult | null {
  return getLatestResults().find((r) => r.puzzle === puzzleId) ?? null;
}

/** Returns average score across all played puzzles (0-1000). */
export function getAverageScore(): number | null {
  const results = getLatestResults();
  if (results.length === 0) return null;
  return Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
}

/** Returns count of played puzzles. */
export function getPlayedCount(): number {
  return getLatestResults().length;
}

/** Returns distribution of grades { S, A, C, X }. */
export function getGradeDistribution(): Record<Grade, number> {
  const dist: Record<Grade, number> = { S: 0, A: 0, C: 0, X: 0 };
  for (const r of getLatestResults()) {
    dist[r.grade] = (dist[r.grade] ?? 0) + 1;
  }
  return dist;
}

/** Returns the theme with the lowest average score (min 2 puzzles played).
 *  Returns null if no theme has >= 2 results. */
export function getWeakestTheme(): string | null {
  const byTheme: Record<string, number[]> = {};
  for (const r of getLatestResults()) {
    if (!byTheme[r.theme]) byTheme[r.theme] = [];
    byTheme[r.theme].push(r.score);
  }
  let weakest: string | null = null;
  let weakestAvg = Infinity;
  for (const [theme, scores] of Object.entries(byTheme)) {
    if (scores.length < 2) continue;
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    if (avg < weakestAvg) {
      weakestAvg = avg;
      weakest = theme;
    }
  }
  return weakest;
}

/** Given the list of all video puzzle ids and the themes of puzzles user got wrong (C/X),
 *  picks the next unplayed puzzle. Priority:
 *  1. Unplayed, same theme as recently failed
 *  2. Any unplayed
 *  3. Oldest-played (least recent) if all played
 */
export function pickNextPuzzle(
  allPuzzles: { id: string; theme: string }[],
  currentId: string,
  recentFailedTheme?: string
): { id: string; theme: string } | null {
  const played = getPlayedIds();
  const candidates = allPuzzles.filter((p) => p.id !== currentId);

  // Priority 1: unplayed, same theme as failed
  if (recentFailedTheme) {
    const sameThemeUnplayed = candidates.filter(
      (p) => !played.has(p.id) && p.theme === recentFailedTheme
    );
    if (sameThemeUnplayed.length > 0) {
      return sameThemeUnplayed[Math.floor(Math.random() * sameThemeUnplayed.length)];
    }
  }

  // Priority 2: any unplayed
  const unplayed = candidates.filter((p) => !played.has(p.id));
  if (unplayed.length > 0) {
    return unplayed[Math.floor(Math.random() * unplayed.length)];
  }

  // Priority 3: oldest played (fallback — all done)
  const results = getLatestResults();
  const sorted = candidates.sort((a, b) => {
    const rA = results.find((r) => r.puzzle === a.id);
    const rB = results.find((r) => r.puzzle === b.id);
    if (!rA) return -1;
    if (!rB) return 1;
    return rA.date < rB.date ? -1 : 1;
  });
  return sorted[0] ?? null;
}
