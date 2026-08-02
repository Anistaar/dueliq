<script lang="ts">
  // ConceptsMap — 47 training concepts in 8 families, with puzzle coverage badges.
  // Covered concepts link to Practice Library filter. Uncovered = "coming soon" (greyed).
  // Not endorsed by Riot Games.

  const { onFilterConcept }: {
    onFilterConcept?: (theme: string) => void;
  } = $props();

  // Puzzle theme counts per tag — derived from the 27 current video puzzles.
  // These are the tags used in puzzle JSON files.
  const THEME_COUNTS: Record<string, number> = {
    rotation: 7,
    entry: 6,
    eco: 4,
    clutch: 3,
    util: 3,
    postplant: 2,
    retake: 2,
    // New themes not yet in prod puzzles:
    zoning: 0,
    info: 0,
    timing: 0,
    "duel-selection": 0,
    anchor: 0,
    advantage: 0,
    lurk: 0,
  };

  type Concept = {
    name: string;
    def: string;
    theme: string; // puzzle tag — if 0 count in THEME_COUNTS, shown as coming soon
  };

  type Family = {
    id: string;
    label: string;
    concepts: Concept[];
  };

  const FAMILIES: Family[] = [
    {
      id: "eco",
      label: "A — Economy",
      concepts: [
        { name: "Eco levels", def: "Choose the buy that maximises equity over the match, not just the round", theme: "eco" },
        { name: "Break economy", def: "Play to break enemy eco — deny guns, force a third poor round", theme: "eco" },
        { name: "Bonus round", def: "Convert a won round into a second stolen round", theme: "eco" },
        { name: "Anti-eco punish", def: "Play against an eco: distance, grouping, no unnecessary peeks", theme: "eco" },
        { name: "Ult economy", def: "Ult points as a per-round resource — spend vs hold", theme: "util" },
      ],
    },
    {
      id: "combat",
      label: "B — Combat & Duels",
      concepts: [
        { name: "Trade capacity", def: "Stay within refrag range (~5 m), first contact by consent, crosshair ready", theme: "entry" },
        { name: "Crossfires", def: "Crossed angles that force the enemy to choose which death", theme: "postplant" },
        { name: "Duel isolation", def: "Only take chosen 1v1s — refuse unprepped 1vX", theme: "duel-selection" },
        { name: "Peek types", def: "Pick the peek (jiggle/wide/shoulder) based on the info wanted and risk accepted", theme: "duel-selection" },
        { name: "First contact", def: "Who takes first contact and why — never by accident", theme: "entry" },
        { name: "Refrag timing", def: "The swing window after a pick — immediate vs reset", theme: "entry" },
      ],
    },
    {
      id: "zoning",
      label: "C — Map Control",
      concepts: [
        { name: "Map control theory", def: "Safely traversable space is the true round resource", theme: "zoning" },
        { name: "Chokepoints", def: "Which zones decide the round 20 s before the fight", theme: "zoning" },
        { name: "Defaults (ATK)", def: "Standard space-taking without commit — info collection", theme: "zoning" },
        { name: "Util zoning", def: "Util to DENY space, not to kill", theme: "util" },
        { name: "Ceding space", def: "Voluntary retreat — an anchor that survives beats a hero anchor", theme: "rotation" },
        { name: "Vertical control", def: "Heaven/ropes/doors: the third dimension per map", theme: "zoning" },
      ],
    },
    {
      id: "info",
      label: "D — Information",
      concepts: [
        { name: "Info gathering", def: "Get information at minimum cost — utility over body", theme: "info" },
        { name: "Info denial", def: "Deny enemy info: one-way smokes, silent clears", theme: "info" },
        { name: "Sound discipline", def: "Walking/shooting emits info; listening is a sensor", theme: "info" },
        { name: "Minimap reading", def: "Extract decisions from the minimap — rotations visible, dead zones", theme: "info" },
        { name: "Killfeed reading", def: "Recount alive players and weapons from the feed, adapt", theme: "info" },
        { name: "Pattern reading", def: "Exploit enemy patterns at round N+1", theme: "info" },
        { name: "Fake / misdirection", def: "Sell a false execute — noise, util — to move the defense", theme: "rotation" },
      ],
    },
    {
      id: "timing",
      label: "E — Timing & Tempo",
      concepts: [
        { name: "Timing windows", def: "When an action is good THEN bad — rotate before the defensive reset", theme: "timing" },
        { name: "Round tempo", def: "Choose fast or slow round speed and know how to switch", theme: "timing" },
        { name: "Mid-round adaptation", def: "Re-decide mid-round on new info — the core of game sense", theme: "timing" },
        { name: "Rotations", def: "Leave neither too early (fake) nor too late (4v1 retake), and via which path", theme: "rotation" },
        { name: "Flank timing", def: "The lurk/flank that arrives DURING the engagement, not before or after", theme: "lurk" },
        { name: "Clock management", def: "Spike maths: 45 s detonation, 7 s defuse, what that allows", theme: "timing" },
      ],
    },
    {
      id: "roles",
      label: "F — Roles & Team Structure",
      concepts: [
        { name: "Entry protocol", def: "Entry order on site — util → duelist → trade → plant", theme: "entry" },
        { name: "Site anchoring", def: "The anchor lives and reports; delay > kill", theme: "anchor" },
        { name: "Lurk", def: "Cut rotations, punish repeeks — timing beats kills", theme: "lurk" },
        { name: "Util layering", def: "Stack utilities in the right order — flash AFTER smoke is set", theme: "util" },
        { name: "Execute structure", def: "Site execute as a sequence, not a rush", theme: "entry" },
        { name: "Post-plant setups", def: "Positions/crossfires after the spike plant — play time not kills", theme: "postplant" },
        { name: "Retake protocol", def: "Regroup, retake util, tight trade, coordinated defuse", theme: "retake" },
        { name: "Mid-round calls", def: "The call that re-aligns 5 players on one piece of information", theme: "timing" },
      ],
    },
    {
      id: "special",
      label: "G — Special Situations",
      concepts: [
        { name: "Clutch 1vX", def: "Isolate duels, use spike/time, never fight two at once", theme: "clutch" },
        { name: "Advantage conversion", def: "Press WITHOUT over-extending when player-up", theme: "advantage" },
        { name: "Man-down play", def: "Tighten when player-down — stack, cede space, play retake", theme: "advantage" },
        { name: "Save vs hero play", def: "Recognise the lost round, save guns — EV of the NEXT round", theme: "eco" },
        { name: "Spike decisions", def: "Where to plant (default/safe/open), fake defuse, tap timing", theme: "postplant" },
      ],
    },
    {
      id: "meta",
      label: "H — Meta-Decision",
      concepts: [
        { name: "EV thinking", def: "Every decision = delta win probability, not a duel to win", theme: "eco" },
        { name: "Win condition ID", def: "How does this round concretely get won, right now?", theme: "timing" },
        { name: "Score-adjusted risk", def: "12-3 vs 11-12: score changes EV of identical actions", theme: "advantage" },
        { name: "Anti-tilt discipline", def: "Never re-peek your own death, never revenge-peek, never ego-play", theme: "duel-selection" },
      ],
    },
  ];

  // Count total puzzles covering a given theme tag
  function puzzlesForTheme(theme: string): number {
    return THEME_COUNTS[theme] ?? 0;
  }

  // A concept is "covered" if its theme has at least 1 puzzle
  function isCovered(c: Concept): boolean {
    return puzzlesForTheme(c.theme) > 0;
  }

  // Total concept coverage
  const totalConcepts = FAMILIES.reduce((s, f) => s + f.concepts.length, 0);
  const coveredConcepts = FAMILIES.reduce((s, f) => s + f.concepts.filter(isCovered).length, 0);

  function handleConceptClick(c: Concept) {
    if (!isCovered(c)) return;
    onFilterConcept?.(c.theme);
  }
</script>

<section class="concepts-section" aria-label="Training concepts map">
  <div class="concepts-inner">
    <div class="concepts-header">
      <div class="concepts-title-row">
        <h2 class="concepts-title">Training Concepts</h2>
        <span class="concepts-coverage">{coveredConcepts}/{totalConcepts} active</span>
      </div>
      <p class="concepts-sub">Every puzzle trains a specific concept. Click a covered concept to filter the practice library.</p>
    </div>

    <div class="families-grid">
      {#each FAMILIES as family}
        <div class="family-block">
          <div class="family-label">{family.label}</div>
          <div class="concepts-list">
            {#each family.concepts as concept}
              {@const covered = isCovered(concept)}
              {@const count = puzzlesForTheme(concept.theme)}
              <button
                class="concept-card"
                class:concept-card--covered={covered}
                class:concept-card--soon={!covered}
                onclick={() => handleConceptClick(concept)}
                disabled={!covered}
                title={covered ? `Filter library by this concept (${count} puzzle${count !== 1 ? 's' : ''})` : 'Coming soon'}
                aria-label="{concept.name} — {covered ? count + ' puzzles' : 'coming soon'}"
              >
                <div class="concept-name">{concept.name}</div>
                <p class="concept-def">{concept.def}</p>
                <div class="concept-footer">
                  {#if covered}
                    <span class="concept-badge concept-badge--active">{count} puzzle{count !== 1 ? 's' : ''}</span>
                  {:else}
                    <span class="concept-badge concept-badge--soon">coming soon</span>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  .concepts-section {
    background: #0F1923;
    border-top: 1px solid #2A3441;
    border-bottom: 1px solid #2A3441;
    padding: 52px 20px;
  }

  .concepts-inner {
    max-width: 760px;
    margin: 0 auto;
  }

  .concepts-header {
    margin-bottom: 32px;
  }

  .concepts-title-row {
    display: flex;
    align-items: baseline;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }

  .concepts-title {
    font-family: 'Anton', Impact, sans-serif;
    font-size: 26px;
    font-weight: 400;
    color: #ECE8E1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin: 0;
  }
  @media (min-width: 600px) { .concepts-title { font-size: 32px; } }

  .concepts-coverage {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #ECE8E1;
    background: #FF4655;
    padding: 3px 8px;
    clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%);
  }

  .concepts-sub {
    font-size: 13px;
    color: #7B8FA1;
    line-height: 1.6;
    margin: 0;
    max-width: 520px;
  }

  /* ── Families grid ── */
  .families-grid {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .family-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .family-label {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #FF4655;
    padding-bottom: 6px;
    border-bottom: 1px solid #2A3441;
  }

  /* ── Concepts list (horizontal wrap) ── */
  .concepts-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  /* ── Concept card ── */
  .concept-card {
    background: #1C2127;
    border: 1px solid #2A3441;
    padding: 10px 12px;
    text-align: left;
    cursor: default;
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 160px;
    max-width: 220px;
    flex: 1 1 160px;
    transition: border-color 0.1s, background 0.1s;
    clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  }

  .concept-card--covered {
    cursor: pointer;
  }
  .concept-card--covered:hover {
    border-color: #FF4655;
    background: #FF465508;
  }

  .concept-card--soon {
    opacity: 0.42;
    cursor: default;
  }

  .concept-name {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: #ECE8E1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    line-height: 1.3;
  }

  .concept-card--soon .concept-name {
    color: #7B8FA1;
  }

  .concept-def {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 11px;
    color: #7B8FA1;
    line-height: 1.55;
    margin: 0;
    text-transform: none;
    font-weight: 400;
  }

  .concept-footer {
    margin-top: 2px;
  }

  .concept-badge {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 2px 6px;
    clip-path: polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 0 100%);
  }

  .concept-badge--active {
    background: #FF4655;
    color: #0F1923;
  }

  .concept-badge--soon {
    background: #2A3441;
    color: #4A5568;
  }
</style>
