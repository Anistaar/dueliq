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
// SPLIT
// ============================================================
const splitZones: MapZone[] = [
  { id: "atk-spawn",   label: "ATK Spawn",  cx: 140,  cy: 857,  type: "spawn" },
  { id: "def-spawn",   label: "DEF Spawn",  cx: 820,  cy: 110,  type: "spawn" },
  { id: "a-main",      label: "A Main",     cx: 108,  cy: 560,  type: "corridor" },
  { id: "a-lobby",     label: "A Lobby",    cx: 260,  cy: 655,  type: "lobby" },
  { id: "a-ramp",      label: "A Ramp",     cx: 250,  cy: 760,  type: "corridor" },
  { id: "a-heaven",    label: "A Heaven",   cx: 150,  cy: 278,  type: "chokepoint" },
  { id: "a-site",      label: "A Site",     cx: 320,  cy: 430,  type: "site" },
  { id: "a-link",      label: "A Link",     cx: 280,  cy: 162,  type: "chokepoint" },
  { id: "screens",     label: "Screens",    cx: 390,  cy: 607,  type: "chokepoint" },
  { id: "mid-top",     label: "Mid Top",    cx: 530,  cy: 200,  type: "corridor" },
  { id: "vents",       label: "Vents",      cx: 490,  cy: 340,  type: "chokepoint" },
  { id: "mid-bot",     label: "Mid Bot",    cx: 510,  cy: 478,  type: "corridor" },
  { id: "sewer",       label: "Sewer",      cx: 500,  cy: 600,  type: "corridor" },
  { id: "b-main",      label: "B Main",     cx: 820,  cy: 260,  type: "corridor" },
  { id: "b-back",      label: "B Back",     cx: 630,  cy: 158,  type: "lobby" },
  { id: "b-site",      label: "B Site",     cx: 770,  cy: 380,  type: "site" },
  { id: "b-heaven",    label: "B Heaven",   cx: 880,  cy: 538,  type: "chokepoint" },
  { id: "b-short",     label: "B Short",    cx: 740,  cy: 538,  type: "chokepoint" },
  { id: "ct-area",     label: "CT",         cx: 630,  cy: 575,  type: "lobby" },
  { id: "b-lobby",     label: "B Lobby",    cx: 780,  cy: 730,  type: "lobby" },
];

// ============================================================
// LOTUS
// ============================================================
const lotusZones: MapZone[] = [
  { id: "atk-spawn",   label: "ATK Spawn",  cx: 500,  cy: 880,  type: "spawn" },
  { id: "def-spawn",   label: "DEF Spawn",  cx: 500,  cy: 100,  type: "spawn" },
  { id: "ct-corridor", label: "CT Corridor",cx: 500,  cy: 218,  type: "corridor" },
  // A Site area (left)
  { id: "a-site",      label: "A Site",     cx: 210,  cy: 360,  type: "site" },
  { id: "a-main",      label: "A Main",     cx: 108,  cy: 695,  type: "corridor" },
  { id: "a-tree",      label: "A Tree",     cx: 108,  cy: 497,  type: "lobby" },
  { id: "a-rubble",    label: "A Rubble",   cx: 280,  cy: 538,  type: "chokepoint" },
  { id: "a-heaven",    label: "A Heaven",   cx: 100,  cy: 217,  type: "chokepoint" },
  { id: "a-link",      label: "A Link",     cx: 300,  cy: 214,  type: "chokepoint" },
  { id: "a-lobby",     label: "A Lobby",    cx: 300,  cy: 720,  type: "lobby" },
  // B Site area (top center)
  { id: "b-main",      label: "B Main",     cx: 500,  cy: 222,  type: "corridor" },
  { id: "b-site",      label: "B Site",     cx: 500,  cy: 435,  type: "site" },
  { id: "b-elbow",     label: "B Elbow",    cx: 260,  cy: 430,  type: "chokepoint" },
  { id: "b-corner",    label: "B Corner",   cx: 740,  cy: 430,  type: "chokepoint" },
  // Rotating doors — type:utility (breakable mechanics, like Bind TPs)
  { id: "door-ab",     label: "Door A-B",   cx: 360,  cy: 500,  type: "utility" },
  { id: "door-bc",     label: "Door B-C",   cx: 640,  cy: 500,  type: "utility" },
  // C Site area (right)
  { id: "c-site",      label: "C Site",     cx: 790,  cy: 360,  type: "site" },
  { id: "c-main",      label: "C Main",     cx: 892,  cy: 695,  type: "corridor" },
  { id: "c-mound",     label: "C Mound",    cx: 892,  cy: 497,  type: "lobby" },
  { id: "c-rubble",    label: "C Rubble",   cx: 720,  cy: 538,  type: "chokepoint" },
  { id: "c-heaven",    label: "C Heaven",   cx: 900,  cy: 217,  type: "chokepoint" },
  { id: "c-link",      label: "C Link",     cx: 700,  cy: 214,  type: "chokepoint" },
  { id: "c-lobby",     label: "C Lobby",    cx: 700,  cy: 720,  type: "lobby" },
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
  split: {
    id: "split",
    displayName: "Split",
    sites: ["A", "B"],
    viewBox: "0 0 1000 1000",
    svgPath: "/src/lib/maps/split.svg",
    zones: splitZones,
  },
  lotus: {
    id: "lotus",
    displayName: "Lotus",
    sites: ["A", "B", "C"],
    viewBox: "0 0 1000 1000",
    svgPath: "/src/lib/maps/lotus.svg",
    zones: lotusZones,
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
