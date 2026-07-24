// Types de base VALIQ — Decision Engine
// provisoire — schema final = tache 002

/** Etat d'un round au moment du puzzle (snapshot) */
export interface RoundState {
  // provisoire — schema final = tache 002
  roundNumber: number;
  phase: 'buy' | 'pre-plant' | 'post-plant' | 'retake';
  timeRemaining: number; // secondes
  attackerCredits: number;
  defenderCredits: number;
  aliveAttackers: number;
  aliveDefenders: number;
  spikeCarrier?: string; // id du joueur
}

/** Une option de reponse dans un puzzle de decision */
export interface PuzzleOption {
  // provisoire — schema final = tache 002
  id: string;
  label: string;
  tier: 'radiant' | 'elite' | 'average' | 'low';
  /** Frequence d'execution par les joueurs de rang eleve (0-1) */
  eliteFrequency: number;
  /** Delta esperance de valeur par rapport a l'option neutre */
  deltaEV: number;
  explanation: string;
  /** Sources pro documentees (obligation V1) */
  sources: string[];
}

/** Un puzzle de decision complet */
export interface Puzzle {
  // provisoire — schema final = tache 002
  id: string;
  /** Identifiant de map (geometrie proprietary, zero asset Riot) */
  mapId: string;
  title: string;
  theme: 'retake' | 'post-plant' | 'eco' | 'rotation' | 'clutch';
  roles: string[];
  roundState: RoundState;
  options: PuzzleOption[];
  /** Status de validation : draft jusqu'a jugement Immortal+ */
  status: 'draft' | 'validated';
}
