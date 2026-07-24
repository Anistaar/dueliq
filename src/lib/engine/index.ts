// Moteur puzzle VALIQ — exports
export type { PuzzleSchema, PuzzleOptionSchema, RoundStatePuzzle, Positions, PlayerToken, OptionTier } from "./puzzle_types.js";
export { computeScore, tierLabel, tierColor } from "./puzzle_types.js";
// Legacy types from 001 (kept for backward compat)
export type { Puzzle, PuzzleOption, RoundState } from "./types.js";
