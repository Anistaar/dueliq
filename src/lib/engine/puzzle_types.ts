// VALIQ - Puzzle types matching the JSON schema (version 1+, tache 002 + replay)
// Not endorsed by Riot Games.

// ── Timeline event types ─────────────────────────────────────────────────

export type TimelineEventType = "move" | "util" | "kill" | "plant" | "sound" | "camera";

export interface TimelineEvent {
  t_ms: number;
  type: TimelineEventType;
  /** Token id for move/kill */
  token?: string;
  /** Move: start position */
  from?: { x: number; y: number };
  /** Move: end position */
  to?: { x: number; y: number };
  /** Util zone: center + radius */
  zone?: { x: number; y: number; r: number; color?: string; label?: string };
  /** Generic label */
  label?: string;
  /** Camera pan/zoom target */
  camera?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface UtilJoueur {
  agent: string;
  signature: string | null;
  ultimate: string | null;
  basic_remaining: string[];
}

export interface RoundStatePuzzle {
  timer_s: number;
  spike_planted: boolean;
  alive_atk: number;
  alive_def: number;
  eco_atk_approx: "eco" | "semi-eco" | "semi-buy" | "full-buy";
  eco_def_approx: "eco" | "semi-eco" | "semi-buy" | "full-buy";
  util_joueur: UtilJoueur;
}

export interface PlayerToken {
  id: string;
  x: number;
  y: number;
  orientation_deg: number | null;
  label?: string;
  est_joueur_concerne?: boolean;
}

export interface Positions {
  viewBox: string;
  map_zone: string;
  allies: PlayerToken[];
  ennemis_connus: PlayerToken[];
  ennemis_inconnus_count: number;
}

export type OptionTier = "optimal" | "acceptable" | "couteux" | "faute";

export interface PuzzleOptionSchema {
  label: string;
  tier: OptionTier;
  ev_delta: string;
  freq_elite_estimee: number;
  explication_courte: string;
  sources_option: { url: string; citation: string }[];
}

// ── Video puzzle support ─────────────────────────────────────────────────────

export interface VideoPuzzle {
  /** URL to intro clip (plays up to freeze, muted autoplay) */
  intro_url: string;
  /** URL to resolution clip (plays in explanation phase) */
  resolution_url: string;
  /** URL to JPEG freeze frame (displayed while question is shown) */
  freeze_frame_url: string;
  /** Channel/creator credit for attribution */
  credit: string;
  /** License text (e.g. "Creative Commons Attribution") */
  license: string;
  /** Optional license URL */
  license_url?: string;
}

export interface PuzzleSchema {
  id: string;
  version: number;
  map: string;
  side: "ATK" | "DEF";
  theme: "retake" | "postplant" | "eco" | "entry" | "rotation" | "clutch" | "util";
  difficulty_est: number;
  round_state: RoundStatePuzzle;
  positions: Positions;
  question: string;
  options: PuzzleOptionSchema[];
  explication_longue: string;
  sources: { url: string; citation: string }[];
  validation: { status: "draft" | "judged"; juges: unknown[] };
  _gaps: { champ: string; incertitude: string }[];
  /** Optional replay timeline (enables animated intro) */
  timeline?: TimelineEvent[];
  /** ms at which intro freezes hard for the question */
  freeze_at_ms?: number;
  /** Continuation timeline shown in explanation phase (optimal line) */
  resolution_timeline?: TimelineEvent[];
  /** Optional video puzzle config — when present, VideoEngine replaces PuzzleBoard */
  video?: VideoPuzzle;
}

// Scoring grid (SOP 002)
export function computeScore(tier: OptionTier): number {
  switch (tier) {
    case "optimal":   return 1000;
    case "acceptable": return 700;
    case "couteux":   return 300;
    case "faute":     return 0;
  }
}

export function tierLabel(tier: OptionTier): string {
  switch (tier) {
    case "optimal":    return "Radiant Choice";
    case "acceptable": return "Acceptable";
    case "couteux":    return "Costly";
    case "faute":      return "Mistake";
  }
}

export function tierColor(tier: OptionTier): string {
  switch (tier) {
    case "optimal":    return "#22c55e";
    case "acceptable": return "#eab308";
    case "couteux":    return "#f97316";
    case "faute":      return "#ef4444";
  }
}
