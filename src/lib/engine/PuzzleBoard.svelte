<script lang="ts">
  // PuzzleBoard — renders a map zone with player tokens (allies, known enemies, unknown count)
  // Maps are original top-down schematics. Not endorsed by Riot Games.
  import type { Positions } from "./puzzle_types.js";

  const { positions, mapId } = $props<{
    positions: Positions;
    mapId: string;
  }>();

  // Parse viewBox dimensions for token scaling (derived so reactive to prop)
  const VB_W = $derived((() => {
    const parts = positions.viewBox.split(" ").map(Number);
    return parts[2] ?? 1000;
  })());
  const VB_H = $derived((() => {
    const parts = positions.viewBox.split(" ").map(Number);
    return parts[3] ?? 750;
  })());

  // Token radius in viewBox units
  const R = 28;
  const R_SMALL = 22;

  // Build "?" unknown positions distributed along top edge
  const unknowns = $derived(
    Array.from({ length: positions.ennemis_inconnus_count }, (_, i) => ({
      x: 60 + i * 60,
      y: 60
    }))
  );
</script>

<div class="board-wrap">
  <div class="zone-label">{positions.map_zone.replace(/-/g, " ").toUpperCase()}</div>
  <svg
    viewBox={positions.viewBox}
    class="board-svg"
    role="img"
    aria-label="Carte de la situation tactique — {positions.map_zone}"
  >
    <!-- Background grid -->
    <rect width={VB_W} height={VB_H} fill="#12131a" rx="4" />
    <!-- Subtle grid lines -->
    {#each Array.from({ length: 10 }) as _, i}
      <line
        x1={VB_W * (i + 1) / 11}
        y1="0"
        x2={VB_W * (i + 1) / 11}
        y2={VB_H}
        stroke="#1e1f2b"
        stroke-width="1"
      />
      <line
        x1="0"
        y1={VB_H * (i + 1) / 11}
        x2={VB_W}
        y2={VB_H * (i + 1) / 11}
        stroke="#1e1f2b"
        stroke-width="1"
      />
    {/each}

    <!-- Spike indicator if planted (center-ish) -->
    <circle cx={VB_W * 0.5} cy={VB_H * 0.5} r="14" fill="#ff4444" opacity="0.25" />
    <circle cx={VB_W * 0.5} cy={VB_H * 0.5} r="8" fill="#ff4444" opacity="0.55" />
    <text
      x={VB_W * 0.5}
      y={VB_H * 0.5 + 22}
      text-anchor="middle"
      font-size="11"
      fill="#ff8888"
      font-family="monospace"
    >SPIKE</text>

    <!-- Unknown enemy markers (top-left zone) -->
    {#each unknowns as pt}
      <g>
        <circle cx={pt.x} cy={pt.y} r={R_SMALL} fill="#7f1d1d" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 2" />
        <text x={pt.x} y={pt.y + 5} text-anchor="middle" font-size="16" fill="#fca5a5" font-family="monospace">?</text>
      </g>
    {/each}

    <!-- Known enemies -->
    {#each positions.ennemis_connus as token}
      <g class="token enemy">
        <!-- Direction indicator -->
        {#if token.orientation_deg !== null}
          {@const rad = ((token.orientation_deg ?? 0) * Math.PI) / 180}
          <line
            x1={token.x}
            y1={token.y}
            x2={token.x + Math.cos(rad) * (R + 10)}
            y2={token.y + Math.sin(rad) * (R + 10)}
            stroke="#ef4444"
            stroke-width="3"
            stroke-linecap="round"
          />
        {/if}
        <circle cx={token.x} cy={token.y} r={R} fill="#991b1b" stroke="#ef4444" stroke-width="2.5" />
        <text x={token.x} y={token.y + 5} text-anchor="middle" font-size="13" fill="#fecaca" font-family="monospace" font-weight="bold">
          {token.label ?? token.id}
        </text>
      </g>
    {/each}

    <!-- Ally tokens -->
    {#each positions.allies as token}
      {@const isYou = token.est_joueur_concerne === true}
      <g class="token ally">
        {#if token.orientation_deg !== null}
          {@const rad = ((token.orientation_deg ?? 0) * Math.PI) / 180}
          <line
            x1={token.x}
            y1={token.y}
            x2={token.x + Math.cos(rad) * (R + 10)}
            y2={token.y + Math.sin(rad) * (R + 10)}
            stroke={isYou ? "#facc15" : "#4ade80"}
            stroke-width="3"
            stroke-linecap="round"
          />
        {/if}
        <!-- Highlight ring for the player -->
        {#if isYou}
          <circle cx={token.x} cy={token.y} r={R + 7} fill="none" stroke="#facc15" stroke-width="2" stroke-dasharray="6 3" />
        {/if}
        <circle
          cx={token.x}
          cy={token.y}
          r={R}
          fill={isYou ? "#854d0e" : "#14532d"}
          stroke={isYou ? "#facc15" : "#4ade80"}
          stroke-width="2.5"
        />
        <text
          x={token.x}
          y={token.y + 5}
          text-anchor="middle"
          font-size={isYou ? "11" : "12"}
          fill={isYou ? "#fde68a" : "#bbf7d0"}
          font-family="monospace"
          font-weight="bold"
        >
          {token.label ?? token.id}
        </text>
      </g>
    {/each}

    <!-- Legend -->
    <g transform="translate(8, {VB_H - 60})">
      <circle cx="10" cy="10" r="7" fill="#14532d" stroke="#4ade80" stroke-width="1.5" />
      <text x="22" y="14" font-size="10" fill="#9ca3af" font-family="monospace">Allie</text>
      <circle cx="10" cy="26" r="7" fill="#854d0e" stroke="#facc15" stroke-width="1.5" />
      <text x="22" y="30" font-size="10" fill="#9ca3af" font-family="monospace">TOI</text>
      <circle cx="10" cy="42" r="7" fill="#991b1b" stroke="#ef4444" stroke-width="1.5" />
      <text x="22" y="46" font-size="10" fill="#9ca3af" font-family="monospace">Ennemi</text>
    </g>
  </svg>
</div>

<style>
  .board-wrap {
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
  }
  .zone-label {
    font-family: monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    color: #6b7280;
    text-align: center;
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  .board-svg {
    width: 100%;
    height: auto;
    border-radius: 6px;
    border: 1px solid #1e293b;
    display: block;
  }
</style>
