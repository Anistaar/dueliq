// VALIQ - Puzzle types matching the JSON schema (version 1, tache 002)
// Not endorsed by Riot Games.

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
