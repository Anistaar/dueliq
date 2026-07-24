// VALIQ - Map registry
// Maps are original top-down schematics (geometry only, no Riot assets).
// Not endorsed by Riot Games.

export interface MapZone {
  id: string;
  label: string;
  // Normalized coordinates in viewBox 0 0 1000 1000
  cx: number;
  cy: number;
  type: "site" | "corridor" | "lobby" | "spawn" | "chokepoint" | "utility";
}

export interface MapDefinition {
  id: string;
  displayName: string;
  sites: string[];          // site letters present on this map
  viewBox: string;          // always "0 0 1000 1000"
  svgPath: string;          // relative path to the SVG asset
  zones: MapZone[];
}

// ============================================================
// ASCENT
// ============================================================
const ascentZones: MapZone[] = [
  { id: "atk-spawn",  label: "ATK Spawn",  cx: 130,  cy: 120,  type: "spawn" },
  { id: "def-spawn",  label: "DEF Spawn",  cx: 870,  cy: 880,  type: "spawn" },
  { id: "a-main",     label: "A Main",     cx: 130,  cy: 265,  type: "corridor" },
  { id: "a-lobby",    label: "A Lobby",    cx: 195,  cy: 265,  type: "lobby" },
  { id: "a-site",     label: "A Site",     cx: 360,  cy: 435,  type: "site" },
  { id: "a-short",    label: "A Short",    cx: 175,  cy: 620,  type: "chokepoint" },
  { id: "mid-top",    label: "Mid Top",    cx: 500,  cy: 165,  type: "corridor" },
  { id: "catwalk",    label: "Catwalk",    cx: 638,  cy: 135,  type: "chokepoint" },
  { id: "mid-bot",    label: "Mid Bot",    cx: 426,  cy: 490,  type: "corridor" },
  { id: "b-main",     label: "B Main",     cx: 820,  cy: 130,  type: "corridor" },
  { id: "b-site",     label: "B Site",     cx: 640,  cy: 340,  type: "site" },
  { id: "ct-mid",     label: "CT Mid",     cx: 780,  cy: 522,  type: "lobby" },
  { id: "lower-road", label: "Lower Road", cx: 560,  cy: 767,  type: "corridor" },
];

// ============================================================
// BIND
// ============================================================
const bindZones: MapZone[] = [
  { id: "atk-spawn",  label: "ATK Spawn",  cx: 130,  cy: 500,  type: "spawn" },
  { id: "def-spawn",  label: "DEF Spawn",  cx: 870,  cy: 910,  type: "spawn" },
  { id: "b-main",     label: "B Long",     cx: 330,  cy: 112,  type: "corridor" },
  { id: "b-site",     label: "B Site",     cx: 190,  cy: 300,  type: "site" },
  { id: "showers",    label: "Showers",    cx: 420,  cy: 340,  type: "chokepoint" },
  { id: "hookah",     label: "Hookah",     cx: 320,  cy: 440,  type: "chokepoint" },
  { id: "tp-b",       label: "TP-B",       cx: 380,  cy: 240,  type: "utility" },
  { id: "tp-a",       label: "TP-A",       cx: 460,  cy: 440,  type: "utility" },
  { id: "a-short",    label: "A Short",    cx: 540,  cy: 298,  type: "corridor" },
  { id: "a-long",     label: "A Long",     cx: 810,  cy: 200,  type: "corridor" },
  { id: "a-site",     label: "A Site",     cx: 730,  cy: 530,  type: "site" },
  { id: "garden",     label: "Garden",     cx: 460,  cy: 545,  type: "lobby" },
  { id: "ct-area",    label: "CT",         cx: 830,  cy: 752,  type: "lobby" },
  { id: "lamps",      label: "Lamps",      cx: 600,  cy: 712,  type: "chokepoint" },
];

// ============================================================
// HAVEN
// ============================================================
const havenZones: MapZone[] = [
  { id: "atk-spawn",   label: "ATK Spawn",      cx: 500,  cy: 880,  type: "spawn" },
  { id: "def-spawn",   label: "DEF Spawn",       cx: 500,  cy: 88,   type: "spawn" },
  { id: "ct-corridor", label: "CT Corridor",     cx: 500,  cy: 218,  type: "corridor" },
  { id: "c-site",      label: "C Site",          cx: 180,  cy: 390,  type: "site" },
  { id: "c-long",      label: "C Long",          cx: 110,  cy: 695,  type: "corridor" },
  { id: "c-lobby",     label: "C Lobby",         cx: 100,  cy: 555,  type: "lobby" },
  { id: "c-garage",    label: "C Garage",        cx: 290,  cy: 545,  type: "chokepoint" },
  { id: "c-link",      label: "C Link",          cx: 260,  cy: 262,  type: "chokepoint" },
  { id: "mid-window",  label: "Mid / Window",    cx: 410,  cy: 375,  type: "chokepoint" },
  { id: "b-site",      label: "B Site",          cx: 500,  cy: 580,  type: "site" },
  { id: "b-entrance",  label: "B Entrance",      cx: 500,  cy: 748,  type: "chokepoint" },
  { id: "a-link",      label: "A Link",          cx: 740,  cy: 262,  type: "chokepoint" },
  { id: "a-short",     label: "A Short",         cx: 680,  cy: 545,  type: "corridor" },
  { id: "a-lobby",     label: "A Lobby",         cx: 900,  cy: 555,  type: "lobby" },
  { id: "a-long",      label: "A Long",          cx: 890,  cy: 695,  type: "corridor" },
  { id: "a-site",      label: "A Site",          cx: 820,  cy: 390,  type: "site" },
];

// ============================================================
// Registry
// ============================================================
export const MAPS: Record<string, MapDefinition> = {
  ascent: {
    id: "ascent",
    displayName: "Ascent",
    sites: ["A", "B"],
    viewBox: "0 0 1000 1000",
    svgPath: "/src/lib/maps/ascent.svg",
    zones: ascentZones,
  },
  bind: {
    id: "bind",
    displayName: "Bind",
    sites: ["A", "B"],
    viewBox: "0 0 1000 1000",
    svgPath: "/src/lib/maps/bind.svg",
    zones: bindZones,
  },
  haven: {
    id: "haven",
    displayName: "Haven",
    sites: ["A", "B", "C"],
    viewBox: "0 0 1000 1000",
    svgPath: "/src/lib/maps/haven.svg",
    zones: havenZones,
  },
};

export type MapId = keyof typeof MAPS;

/** Resolve a zone on a given map by its id. */
export function getZone(mapId: MapId, zoneId: string): MapZone | undefined {
  return MAPS[mapId]?.zones.find((z) => z.id === zoneId);
}

/** List all zone ids for a map. */
export function getZoneIds(mapId: MapId): string[] {
  return (MAPS[mapId]?.zones ?? []).map((z) => z.id);
}
