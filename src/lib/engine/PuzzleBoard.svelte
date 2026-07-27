<script lang="ts">
  // PuzzleBoard — renders a map zone with player tokens (allies, known enemies, unknown count)
  // Maps are original top-down schematics. Not endorsed by Riot Games.
  import type { Positions } from "./puzzle_types.js";

  const { positions, mapId, hideTokens = false } = $props<{
    positions: Positions;
    mapId: string;
    hideTokens?: boolean;
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
      x: 70 + i * 70,
      y: 70
    }))
  );

  // Zone gradient stops based on map
  const zoneGradient = $derived((() => {
    // Each map gets a subtle accent tint for its zone
    const map = mapId.toLowerCase();
    if (map.includes('bind'))   return { c1: '#1a0d14', c2: '#0d1520' };
    if (map.includes('haven'))  return { c1: '#0d1a0d', c2: '#0d0d1a' };
    if (map.includes('split'))  return { c1: '#1a1a0d', c2: '#0d1520' };
    if (map.includes('ascent')) return { c1: '#0d1a18', c2: '#0d1020' };
    return { c1: '#121520', c2: '#0d1015' };
  })());
</script>

<div class="board-wrap">
  <div class="zone-label">
    <span class="zone-map">{mapId.toUpperCase()}</span>
    <span class="zone-sep">·</span>
    <span class="zone-name">{positions.map_zone.replace(/-/g, " ").toUpperCase()}</span>
  </div>
  <svg
    viewBox={positions.viewBox}
    class="board-svg"
    role="img"
    aria-label="Tactical map — {positions.map_zone}"
  >
    <title>Tactical map — {positions.map_zone.replace(/-/g, " ")}</title>

    <!-- ===== DEFS: Filters & Gradients ===== -->
    <defs>
      <!-- Background gradient -->
      <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
        <stop offset="0%" stop-color={zoneGradient.c1} />
        <stop offset="100%" stop-color={zoneGradient.c2} />
      </linearGradient>

      <!-- Radial vignette overlay -->
      <radialGradient id="vignette" cx="50%" cy="50%" r="70%" gradientUnits="objectBoundingBox">
        <stop offset="40%" stop-color="transparent" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0.35" />
      </radialGradient>

      <!-- Glow filters -->
      <filter id="glow-teal" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0  0 0.83 0.67 0 0  0 0 0.67 0 0  0 0 0 0.8 0" />
        <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 0.27 0.33 0 0  0 0 0.33 0 0  0 0 0 0.8 0" />
        <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="glow-yellow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 0.8 0 0 0  0 0 0 0 0  0 0 0 0.9 0" />
        <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="glow-soft" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
        <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>

      <!-- Spike animated pulse -->
      <radialGradient id="spike-grad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FF4655" stop-opacity="0.9" />
        <stop offset="60%" stop-color="#FF4655" stop-opacity="0.5" />
        <stop offset="100%" stop-color="#FF4655" stop-opacity="0" />
      </radialGradient>

      <!-- YOU token gradient -->
      <radialGradient id="you-grad" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stop-color="#fde68a" />
        <stop offset="100%" stop-color="#b45309" />
      </radialGradient>

      <!-- Ally token gradient -->
      <radialGradient id="ally-grad" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stop-color="#6ee7b7" />
        <stop offset="100%" stop-color="#065f46" />
      </radialGradient>

      <!-- Enemy token gradient -->
      <radialGradient id="enemy-grad" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stop-color="#fca5a5" />
        <stop offset="100%" stop-color="#991b1b" />
      </radialGradient>

      <!-- Noise texture filter for map surface -->
      <filter id="noise" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise" />
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.04 0" in="noise" result="noiseAlpha" />
        <feBlend in="SourceGraphic" in2="noiseAlpha" mode="overlay" />
      </filter>

      <!-- Wall gradient for depth -->
      <linearGradient id="wall-grad-h" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2a3050" stop-opacity="0.8" />
        <stop offset="100%" stop-color="#0d0f18" stop-opacity="0.8" />
      </linearGradient>
      <linearGradient id="wall-grad-v" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#2a3050" stop-opacity="0.8" />
        <stop offset="100%" stop-color="#0d0f18" stop-opacity="0.8" />
      </linearGradient>

      <!-- Site zone gradient -->
      <radialGradient id="site-a-grad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FF4655" stop-opacity="0.12" />
        <stop offset="100%" stop-color="#FF4655" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="site-b-grad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#00D4AA" stop-opacity="0.10" />
        <stop offset="100%" stop-color="#00D4AA" stop-opacity="0" />
      </radialGradient>

      <!-- Clip path for board -->
      <clipPath id="board-clip">
        <rect width={VB_W} height={VB_H} rx="4" />
      </clipPath>
    </defs>

    <!-- ===== BACKGROUND ===== -->
    <g clip-path="url(#board-clip)">
      <!-- Base fill -->
      <rect width={VB_W} height={VB_H} fill="url(#bg-grad)" />

      <!-- Grid lines — subtle tactical grid -->
      {#each Array.from({ length: 14 }) as _, i}
        <line
          x1={VB_W * (i + 1) / 15}
          y1="0"
          x2={VB_W * (i + 1) / 15}
          y2={VB_H}
          stroke="#1e2235"
          stroke-width="0.8"
          opacity="0.6"
        />
        <line
          x1="0"
          y1={VB_H * (i + 1) / 15}
          x2={VB_W}
          y2={VB_H * (i + 1) / 15}
          stroke="#1e2235"
          stroke-width="0.8"
          opacity="0.6"
        />
      {/each}

      <!-- Outer wall with thickness/depth effect -->
      <!-- Top wall shadow -->
      <rect x="0" y="0" width={VB_W} height="12" fill="url(#wall-grad-h)" opacity="0.9" />
      <!-- Bottom wall shadow -->
      <rect x="0" y={VB_H - 12} width={VB_W} height="12" fill="url(#wall-grad-h)" opacity="0.9" />
      <!-- Left wall shadow -->
      <rect x="0" y="0" width="12" height={VB_H} fill="url(#wall-grad-v)" opacity="0.9" />
      <!-- Right wall shadow -->
      <rect x={VB_W - 12} y="0" width="12" height={VB_H} fill="url(#wall-grad-v)" opacity="0.9" />

      <!-- Border lines (inner wall edge) -->
      <rect x="12" y="12" width={VB_W - 24} height={VB_H - 24}
        fill="none"
        stroke="#2a3555"
        stroke-width="1.5"
        rx="2"
        opacity="0.8"
      />

      <!-- Corner accent dots -->
      <circle cx="12" cy="12" r="3" fill="#334155" opacity="0.8" />
      <circle cx={VB_W - 12} cy="12" r="3" fill="#334155" opacity="0.8" />
      <circle cx="12" cy={VB_H - 12} r="3" fill="#334155" opacity="0.8" />
      <circle cx={VB_W - 12} cy={VB_H - 12} r="3" fill="#334155" opacity="0.8" />

      <!-- Site zone A (upper area) with gradient -->
      <rect x={VB_W * 0.55} y={VB_H * 0.05} width={VB_W * 0.38} height={VB_H * 0.4}
        fill="url(#site-a-grad)"
        rx="6"
      />
      <!-- Site label A -->
      <text
        x={VB_W * 0.88}
        y={VB_H * 0.12}
        text-anchor="end"
        font-size="10"
        fill="#FF4655"
        font-family="'Space Grotesk', monospace"
        font-weight="700"
        letter-spacing="0.1em"
        opacity="0.6"
      >SITE A</text>

      <!-- Site zone B (lower area) with gradient -->
      <rect x={VB_W * 0.07} y={VB_H * 0.55} width={VB_W * 0.38} height={VB_H * 0.38}
        fill="url(#site-b-grad)"
        rx="6"
      />
      <!-- Site label B -->
      <text
        x={VB_W * 0.12}
        y={VB_H * 0.6}
        text-anchor="start"
        font-size="10"
        fill="#00D4AA"
        font-family="'Space Grotesk', monospace"
        font-weight="700"
        letter-spacing="0.1em"
        opacity="0.6"
      >SITE B</text>

      <!-- Mid divider line (decorative) -->
      <line
        x1={VB_W * 0.5}
        y1="20"
        x2={VB_W * 0.5}
        y2={VB_H - 20}
        stroke="#1e2a3a"
        stroke-width="1"
        stroke-dasharray="6 8"
        opacity="0.4"
      />

      <!-- Vignette overlay -->
      <rect width={VB_W} height={VB_H} fill="url(#vignette)" />

      <!-- Noise texture -->
      <rect width={VB_W} height={VB_H} fill="transparent" filter="url(#noise)" />
    </g>

    <!-- ===== SPIKE ===== -->
    <!-- Spike pulse halo (animated via CSS) -->
    <circle
      class="spike-halo"
      cx={VB_W * 0.5}
      cy={VB_H * 0.5}
      r="28"
      fill="#FF4655"
      opacity="0.15"
    />
    <!-- Spike icon: outer ring -->
    <circle
      cx={VB_W * 0.5}
      cy={VB_H * 0.5}
      r="16"
      fill="none"
      stroke="#FF4655"
      stroke-width="2"
      opacity="0.7"
      filter="url(#glow-red)"
    />
    <!-- Spike inner dot -->
    <circle cx={VB_W * 0.5} cy={VB_H * 0.5} r="7" fill="#FF4655" opacity="0.9" filter="url(#glow-red)" />
    <!-- Spike crosshair lines -->
    <line x1={VB_W * 0.5 - 22} y1={VB_H * 0.5} x2={VB_W * 0.5 - 17} y2={VB_H * 0.5} stroke="#FF4655" stroke-width="1.5" opacity="0.5" />
    <line x1={VB_W * 0.5 + 17} y1={VB_H * 0.5} x2={VB_W * 0.5 + 22} y2={VB_H * 0.5} stroke="#FF4655" stroke-width="1.5" opacity="0.5" />
    <line x1={VB_W * 0.5} y1={VB_H * 0.5 - 22} x2={VB_W * 0.5} y2={VB_H * 0.5 - 17} stroke="#FF4655" stroke-width="1.5" opacity="0.5" />
    <line x1={VB_W * 0.5} y1={VB_H * 0.5 + 17} x2={VB_W * 0.5} y2={VB_H * 0.5 + 22} stroke="#FF4655" stroke-width="1.5" opacity="0.5" />
    <!-- SPIKE label -->
    <text
      x={VB_W * 0.5}
      y={VB_H * 0.5 + 28}
      text-anchor="middle"
      font-size="9"
      fill="#FF4655"
      font-family="'Space Grotesk', monospace"
      font-weight="700"
      letter-spacing="0.12em"
      opacity="0.8"
    >SPIKE</text>

    <!-- ===== TOKENS (hidden during replay — animated layer takes over) ===== -->
    <g class="token-layer" class:tokens-hidden={hideTokens}>

    <!-- ===== UNKNOWN ENEMIES ===== -->
    {#each unknowns as pt, i}
      <g class="token-appear" style="animation-delay: {i * 80}ms">
        <!-- Glow halo -->
        <circle cx={pt.x} cy={pt.y} r={R_SMALL + 8} fill="#ef4444" opacity="0.08" />
        <!-- Dashed outline -->
        <circle
          cx={pt.x}
          cy={pt.y}
          r={R_SMALL}
          fill="#1a0808"
          stroke="#ef4444"
          stroke-width="2"
          stroke-dasharray="5 3"
          opacity="0.9"
        />
        <!-- ? label -->
        <text
          x={pt.x}
          y={pt.y + 6}
          text-anchor="middle"
          font-size="18"
          fill="#fca5a5"
          font-family="'Space Grotesk', monospace"
          font-weight="700"
        >?</text>
      </g>
    {/each}

    <!-- ===== KNOWN ENEMIES ===== -->
    {#each positions.ennemis_connus as token, i}
      <g class="token-appear" style="animation-delay: {(i + unknowns.length) * 80 + 60}ms">
        <!-- Direction indicator -->
        {#if token.orientation_deg !== null}
          {@const rad = ((token.orientation_deg ?? 0) * Math.PI) / 180}
          <!-- Direction cone (fill) -->
          <path
            d={`M ${token.x} ${token.y}
                L ${token.x + Math.cos(rad - 0.35) * (R + 28)} ${token.y + Math.sin(rad - 0.35) * (R + 28)}
                L ${token.x + Math.cos(rad + 0.35) * (R + 28)} ${token.y + Math.sin(rad + 0.35) * (R + 28)} Z`}
            fill="#ef4444"
            opacity="0.12"
          />
          <line
            x1={token.x}
            y1={token.y}
            x2={token.x + Math.cos(rad) * (R + 18)}
            y2={token.y + Math.sin(rad) * (R + 18)}
            stroke="#ef4444"
            stroke-width="2.5"
            stroke-linecap="round"
            opacity="0.9"
          />
        {/if}
        <!-- Outer glow ring -->
        <circle cx={token.x} cy={token.y} r={R + 6} fill="#ef4444" opacity="0.08" />
        <!-- Token body -->
        <circle
          cx={token.x}
          cy={token.y}
          r={R}
          fill="url(#enemy-grad)"
          stroke="#ef4444"
          stroke-width="2.5"
          filter="url(#glow-red)"
        />
        <!-- Enemy icon: X crosshair -->
        <line
          x1={token.x - 10} y1={token.y - 10}
          x2={token.x + 10} y2={token.y + 10}
          stroke="#fca5a5" stroke-width="2.5" stroke-linecap="round"
        />
        <line
          x1={token.x + 10} y1={token.y - 10}
          x2={token.x - 10} y2={token.y + 10}
          stroke="#fca5a5" stroke-width="2.5" stroke-linecap="round"
        />
        <!-- Label -->
        {#if token.label}
          <text
            x={token.x}
            y={token.y + R + 14}
            text-anchor="middle"
            font-size="10"
            fill="#fca5a5"
            font-family="'Space Grotesk', monospace"
            font-weight="600"
            opacity="0.9"
          >{token.label}</text>
        {/if}
      </g>
    {/each}

    <!-- ===== ALLY TOKENS ===== -->
    {#each positions.allies as token, i}
      {@const isYou = token.est_joueur_concerne === true}
      <g class="token-appear" style="animation-delay: {i * 80}ms">
        <!-- Direction cone -->
        {#if token.orientation_deg !== null}
          {@const rad = ((token.orientation_deg ?? 0) * Math.PI) / 180}
          <path
            d={`M ${token.x} ${token.y}
                L ${token.x + Math.cos(rad - 0.35) * (R + 28)} ${token.y + Math.sin(rad - 0.35) * (R + 28)}
                L ${token.x + Math.cos(rad + 0.35) * (R + 28)} ${token.y + Math.sin(rad + 0.35) * (R + 28)} Z`}
            fill={isYou ? "#facc15" : "#4ade80"}
            opacity={isYou ? "0.18" : "0.12"}
          />
          <line
            x1={token.x}
            y1={token.y}
            x2={token.x + Math.cos(rad) * (R + 18)}
            y2={token.y + Math.sin(rad) * (R + 18)}
            stroke={isYou ? "#facc15" : "#4ade80"}
            stroke-width="2.5"
            stroke-linecap="round"
            opacity="0.9"
          />
        {/if}

        {#if isYou}
          <!-- YOU: Pulsing outer ring (animation via CSS class) -->
          <circle
            cx={token.x}
            cy={token.y}
            r={R + 14}
            fill="none"
            stroke="#facc15"
            stroke-width="1.5"
            opacity="0.5"
            class="pulse-ring"
          />
          <!-- YOU: Secondary ring -->
          <circle
            cx={token.x}
            cy={token.y}
            r={R + 8}
            fill="none"
            stroke="#facc15"
            stroke-width="1"
            stroke-dasharray="4 3"
            opacity="0.7"
          />
          <!-- YOU: Outer glow -->
          <circle cx={token.x} cy={token.y} r={R + 4} fill="#facc15" opacity="0.12" />
          <!-- YOU: Token body -->
          <circle
            cx={token.x}
            cy={token.y}
            r={R}
            fill="url(#you-grad)"
            stroke="#facc15"
            stroke-width="3"
            filter="url(#glow-yellow)"
          />
          <!-- YOU: Star icon -->
          <text
            x={token.x}
            y={token.y + 5}
            text-anchor="middle"
            font-size="16"
            fill="#fde68a"
            font-family="'Space Grotesk', monospace"
            font-weight="900"
          >★</text>
          <!-- YOU: "YOU" label above -->
          <text
            x={token.x}
            y={token.y - R - 8}
            text-anchor="middle"
            font-size="10"
            fill="#facc15"
            font-family="'Space Grotesk', monospace"
            font-weight="700"
            letter-spacing="0.1em"
          >YOU</text>
        {:else}
          <!-- Ally: Outer glow -->
          <circle cx={token.x} cy={token.y} r={R + 4} fill="#4ade80" opacity="0.08" />
          <!-- Ally: Token body -->
          <circle
            cx={token.x}
            cy={token.y}
            r={R}
            fill="url(#ally-grad)"
            stroke="#4ade80"
            stroke-width="2.5"
            filter="url(#glow-teal)"
          />
          <!-- Ally: Shield icon (two vertical bars) -->
          <rect x={token.x - 8} y={token.y - 10} width="5" height="16" rx="2" fill="#bbf7d0" opacity="0.9" />
          <rect x={token.x + 3} y={token.y - 10} width="5" height="16" rx="2" fill="#bbf7d0" opacity="0.9" />
          <!-- Ally label -->
          {#if token.label}
            <text
              x={token.x}
              y={token.y + R + 14}
              text-anchor="middle"
              font-size="10"
              fill="#6ee7b7"
              font-family="'Space Grotesk', monospace"
              font-weight="600"
              opacity="0.9"
            >{token.label}</text>
          {/if}
        {/if}
      </g>
    {/each}

    </g><!-- /token-layer -->

    <!-- ===== LEGEND ===== -->
    <g transform="translate(14, {VB_H - 68})">
      <!-- Legend background pill -->
      <rect x="-6" y="-6" width="90" height="66" rx="6" fill="#0a0c14" opacity="0.85" />
      <rect x="-6" y="-6" width="90" height="66" rx="6" fill="none" stroke="#1e293b" stroke-width="1" />

      <!-- YOU -->
      <circle cx="12" cy="10" r="8" fill="url(#you-grad)" stroke="#facc15" stroke-width="1.5" />
      <text x="26" y="14" font-size="10" fill="#fde68a" font-family="'Space Grotesk', monospace" font-weight="600">YOU</text>

      <!-- Ally -->
      <circle cx="12" cy="28" r="8" fill="url(#ally-grad)" stroke="#4ade80" stroke-width="1.5" />
      <text x="26" y="32" font-size="10" fill="#6ee7b7" font-family="'Space Grotesk', monospace" font-weight="600">Ally</text>

      <!-- Enemy -->
      <circle cx="12" cy="46" r="8" fill="url(#enemy-grad)" stroke="#ef4444" stroke-width="1.5" />
      <text x="26" y="50" font-size="10" fill="#fca5a5" font-family="'Space Grotesk', monospace" font-weight="600">Enemy</text>
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
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: 'Space Grotesk', monospace;
    font-size: 11px;
    letter-spacing: 0.12em;
    color: #475569;
    margin-bottom: 6px;
    text-transform: uppercase;
  }
  .zone-map {
    color: #60a5fa;
    font-weight: 700;
  }
  .zone-sep {
    color: #334155;
  }
  .zone-name {
    color: #64748b;
    font-weight: 600;
  }
  .board-svg {
    width: 100%;
    height: auto;
    border-radius: 10px;
    border: 1px solid #1e293b;
    display: block;
    box-shadow: 0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04);
    background: #0d0f18;
  }
  @media (max-width: 600px) {
    .board-svg { max-height: 200px; }
  }

  /* Hide static tokens during replay — animated layer takes over */
  :global(.token-layer) {
    transition: opacity 0.15s ease;
  }
  :global(.tokens-hidden) {
    opacity: 0;
    pointer-events: none;
  }

  /* Token stagger appearance animation */
  :global(.token-appear) {
    animation: token-appear 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    transform-origin: center;
  }

  /* Pulsing ring for YOU token */
  :global(.pulse-ring) {
    animation: pulse-ring 2s ease-in-out infinite;
    transform-origin: center;
  }

  /* Spike halo pulse */
  :global(.spike-halo) {
    animation: spike-pulse 2.5s ease-in-out infinite;
  }
</style>
