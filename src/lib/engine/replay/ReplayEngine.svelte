<script lang="ts">
  /**
   * ReplayEngine — SVG animation layer on top of PuzzleBoard
   * Interprets timeline[] events and animates tokens at 60fps via CSS transforms.
   * Not endorsed by Riot Games.
   */
  import type { TimelineEvent, Positions } from "../puzzle_types.js";
  import { playSfxStep, playSfxUtil, playSfxKill, playSfxPlant, playSfxFreeze } from "./sfx.js";
  import { onMount, onDestroy } from "svelte";

  // ── Props ─────────────────────────────────────────────────────────────────
  const {
    timeline,
    freezeAtMs,
    positions,
    playing = false,
    onFreeze,
    onComplete,
  } = $props<{
    timeline: TimelineEvent[];
    freezeAtMs: number;
    positions: Positions;
    playing?: boolean;
    onFreeze?: () => void;
    onComplete?: () => void;
  }>();

  // ── Token state (live positions during replay) ────────────────────────────
  interface TokenState {
    id: string;
    x: number;
    y: number;
    orientation_deg: number | null;
    isAlly: boolean;
    isYou: boolean;
    label?: string;
    dead?: boolean;
  }

  interface TrailPoint { x: number; y: number; t: number; }
  interface UtilZone {
    x: number; y: number; r: number;
    color: string; label?: string;
    opacity: number;
    fadeStart?: number;
  }

  // Build initial state from positions
  function buildInitialTokens(): Map<string, TokenState> {
    const map = new Map<string, TokenState>();
    for (const t of positions.allies) {
      map.set(t.id, {
        id: t.id,
        x: t.x, y: t.y,
        orientation_deg: t.orientation_deg,
        isAlly: true,
        isYou: t.est_joueur_concerne === true,
        label: t.label,
      });
    }
    for (const t of positions.ennemis_connus) {
      map.set(t.id, {
        id: t.id,
        x: t.x, y: t.y,
        orientation_deg: t.orientation_deg,
        isAlly: false,
        isYou: false,
        label: t.label,
      });
    }
    return map;
  }

  // Parse viewBox
  const vbParts = positions.viewBox.split(" ").map(Number);
  const VB_X = vbParts[0] ?? 0;
  const VB_Y = vbParts[1] ?? 0;
  const VB_W = vbParts[2] ?? 1000;
  const VB_H = vbParts[3] ?? 1000;

  // ── Reactive state ────────────────────────────────────────────────────────
  let tokens = $state<Map<string, TokenState>>(buildInitialTokens());
  let trails = $state<Map<string, TrailPoint[]>>(new Map());
  let utilZones = $state<UtilZone[]>([]);
  let kills = $state<{ x: number; y: number; id: number }[]>([]);
  let killId = 0;

  // Camera pan/zoom (animated viewBox)
  let camX = $state(VB_X);
  let camY = $state(VB_Y);
  let camW = $state(VB_W);
  let camH = $state(VB_H);
  let camTransition = $state(false);

  // Screen shake state
  let shakeActive = $state(false);
  let shakeOffsetX = $state(0);
  let shakeOffsetY = $state(0);

  // Freeze flash
  let freezeFlash = $state(false);

  // ── Animation loop ────────────────────────────────────────────────────────
  let startTime: number | null = null;
  let rafId: number | null = null;
  let frozen = false;
  let eventIdx = 0;
  let trailCleanupT = 0;

  // Sort timeline by t_ms
  const sortedTimeline = [...timeline].sort((a, b) => a.t_ms - b.t_ms);

  function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  function easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  // Active move interpolations
  interface ActiveMove {
    tokenId: string;
    fromX: number; fromY: number;
    toX: number; toY: number;
    startMs: number; durMs: number;
  }
  let activeMoves: ActiveMove[] = [];

  function tick(now: number) {
    if (!startTime) startTime = now;
    const elapsed = now - startTime;

    if (frozen) return;

    // Process pending events
    while (eventIdx < sortedTimeline.length && sortedTimeline[eventIdx].t_ms <= elapsed) {
      processEvent(sortedTimeline[eventIdx], elapsed);
      eventIdx++;
    }

    // Interpolate active moves
    for (const mv of activeMoves) {
      const progress = Math.min(1, (elapsed - mv.startMs) / mv.durMs);
      const ep = easeInOut(progress);
      const tok = tokens.get(mv.tokenId);
      if (tok) {
        const newX = lerp(mv.fromX, mv.toX, ep);
        const newY = lerp(mv.fromY, mv.toY, ep);

        // Trail
        if (!trails.has(mv.tokenId)) trails.set(mv.tokenId, []);
        const trail = trails.get(mv.tokenId)!;
        trail.push({ x: newX, y: newY, t: elapsed });
        if (trail.length > 18) trail.shift();

        tokens.set(mv.tokenId, { ...tok, x: newX, y: newY });
        tokens = new Map(tokens); // trigger reactivity
        trails = new Map(trails);
      }
    }
    activeMoves = activeMoves.filter(mv => (elapsed - mv.startMs) < mv.durMs + 50);

    // Fade util zones
    let zonesDirty = false;
    for (const z of utilZones) {
      if (z.fadeStart !== undefined && elapsed > z.fadeStart) {
        const progress = Math.min(1, (elapsed - z.fadeStart) / 600);
        const newOp = 1 - easeInOut(progress);
        if (Math.abs(z.opacity - newOp) > 0.01) {
          z.opacity = newOp;
          zonesDirty = true;
        }
      }
    }
    if (zonesDirty) utilZones = [...utilZones.filter(z => z.opacity > 0.02)];

    // Screen shake decay
    if (shakeActive) {
      shakeOffsetX = (Math.random() - 0.5) * 8;
      shakeOffsetY = (Math.random() - 0.5) * 8;
    }

    // Check freeze
    if (elapsed >= freezeAtMs && !frozen) {
      frozen = true;
      triggerFreeze();
      return;
    }

    // Check completion
    if (eventIdx >= sortedTimeline.length && activeMoves.length === 0 && !frozen) {
      onComplete?.();
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  function processEvent(ev: TimelineEvent, elapsed: number) {
    switch (ev.type) {
      case "move": {
        if (!ev.token || !ev.from || !ev.to) break;
        const tok = tokens.get(ev.token);
        if (!tok) break;
        // Duration based on distance (min 300ms, max 1200ms)
        const dx = ev.to.x - ev.from.x;
        const dy = ev.to.y - ev.from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dur = Math.max(300, Math.min(1200, dist * 2.2));
        activeMoves.push({
          tokenId: ev.token,
          fromX: ev.from.x, fromY: ev.from.y,
          toX: ev.to.x, toY: ev.to.y,
          startMs: elapsed,
          durMs: dur,
        });
        playSfxStep();
        break;
      }
      case "util": {
        if (!ev.zone) break;
        utilZones = [...utilZones, {
          x: ev.zone.x, y: ev.zone.y, r: ev.zone.r,
          color: ev.zone.color ?? "#00D4AA",
          label: ev.zone.label,
          opacity: 0,
          fadeStart: undefined,
        }];
        // Animate opacity in
        const lastIdx = utilZones.length - 1;
        setTimeout(() => {
          if (utilZones[lastIdx]) utilZones[lastIdx].opacity = 1;
          utilZones = [...utilZones];
        }, 16);
        // Schedule fade
        const fadeDelay = 2200;
        setTimeout(() => {
          if (utilZones[lastIdx]) utilZones[lastIdx].fadeStart = elapsed + fadeDelay;
          utilZones = [...utilZones];
        }, fadeDelay - 50);
        playSfxUtil();
        break;
      }
      case "kill": {
        if (!ev.token) break;
        const tok = tokens.get(ev.token);
        if (tok) {
          // Mark dead for visual X
          kills = [...kills, { x: tok.x, y: tok.y, id: killId++ }];
          tokens.set(ev.token, { ...tok, dead: true });
          tokens = new Map(tokens);
        }
        // Screen shake
        shakeActive = true;
        setTimeout(() => {
          shakeActive = false;
          shakeOffsetX = 0;
          shakeOffsetY = 0;
        }, 300);
        playSfxKill();
        break;
      }
      case "plant": {
        playSfxPlant();
        break;
      }
      case "camera": {
        if (!ev.camera) break;
        camTransition = true;
        camX = ev.camera.x;
        camY = ev.camera.y;
        camW = ev.camera.w;
        camH = ev.camera.h;
        setTimeout(() => { camTransition = false; }, 700);
        break;
      }
    }
  }

  function triggerFreeze() {
    // Stop shake
    shakeActive = false;
    shakeOffsetX = 0;
    shakeOffsetY = 0;

    // Play freeze sfx
    playSfxFreeze();

    // Flash
    freezeFlash = true;
    setTimeout(() => { freezeFlash = false; }, 180);

    onFreeze?.();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  $effect(() => {
    if (playing && !rafId) {
      startTime = null;
      eventIdx = 0;
      frozen = false;
      activeMoves = [];
      tokens = buildInitialTokens();
      trails = new Map();
      utilZones = [];
      kills = [];
      camX = VB_X; camY = VB_Y; camW = VB_W; camH = VB_H;
      rafId = requestAnimationFrame(tick);
    }
    if (!playing && rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });

  onDestroy(() => {
    if (rafId) cancelAnimationFrame(rafId);
  });

  // ── Trail path builder ────────────────────────────────────────────────────
  function buildTrailPath(pts: TrailPoint[]): string {
    if (pts.length < 2) return "";
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }

  const R = 28;
</script>

<!-- Overlay SVG (placed on top of PuzzleBoard's SVG via slot mechanism) -->
<svg
  class="replay-overlay"
  class:freeze-flash={freezeFlash}
  viewBox="{camX} {camY} {camW} {camH}"
  style="transition: {camTransition ? 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'};
         transform: translate({shakeOffsetX}px, {shakeOffsetY}px);"
  aria-hidden="true"
>
  <!-- ── UTIL ZONES ── -->
  {#each utilZones as zone, i}
    <g opacity={zone.opacity} style="transition: opacity 0.3s ease;">
      <!-- Outer glow ring -->
      <circle cx={zone.x} cy={zone.y} r={zone.r + 10}
        fill={zone.color} opacity="0.08" />
      <!-- Main zone circle -->
      <circle cx={zone.x} cy={zone.y} r={zone.r}
        fill={zone.color} opacity="0.22"
        stroke={zone.color} stroke-width="2" stroke-dasharray="6 4" />
      <!-- Zone label -->
      {#if zone.label}
        <text x={zone.x} y={zone.y + 5} text-anchor="middle"
          font-size="12" fill={zone.color}
          font-family="'Space Grotesk', monospace" font-weight="700"
          opacity="0.9">{zone.label}</text>
      {/if}
    </g>
  {/each}

  <!-- ── TRAILS ── -->
  {#each tokens.entries() as [id, tok]}
    {#if trails.has(id)}
      {@const trail = trails.get(id)!}
      {#if trail.length >= 2}
        {@const isAlly = tok.isAlly}
        <path
          d={buildTrailPath(trail)}
          fill="none"
          stroke={isAlly ? (tok.isYou ? "#facc15" : "#4ade80") : "#ef4444"}
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.45"
          style="pointer-events:none;"
        >
          <!-- Dash animation for trail decay -->
          <animate attributeName="opacity"
            values="0.45;0.1" dur="0.8s"
            repeatCount="indefinite" />
        </path>
      {/if}
    {/if}
  {/each}

  <!-- ── KILL MARKERS ── -->
  {#each kills as k (k.id)}
    <g class="kill-marker">
      <!-- Red X -->
      <line x1={k.x - 16} y1={k.y - 16} x2={k.x + 16} y2={k.y + 16}
        stroke="#FF4655" stroke-width="4" stroke-linecap="round" />
      <line x1={k.x + 16} y1={k.y - 16} x2={k.x - 16} y2={k.y + 16}
        stroke="#FF4655" stroke-width="4" stroke-linecap="round" />
      <!-- Glow -->
      <circle cx={k.x} cy={k.y} r="22" fill="#FF4655" opacity="0.15">
        <animate attributeName="r" values="22;32;22" dur="0.4s" repeatCount="1" />
        <animate attributeName="opacity" values="0.15;0;0" dur="0.6s" repeatCount="1" />
      </circle>
    </g>
  {/each}

  <!-- ── LIVE TOKENS (moving versions on top) ── -->
  {#each tokens.values() as tok}
    {#if !tok.dead}
      <g style="pointer-events:none;">
        <!-- Moving token -->
        {#if tok.isYou}
          <!-- YOU moving token -->
          <circle cx={tok.x} cy={tok.y} r={R + 6}
            fill="#facc15" opacity="0.15" />
          <circle cx={tok.x} cy={tok.y} r={R}
            fill="none" stroke="#facc15" stroke-width="3" opacity="0.9" />
        {:else if tok.isAlly}
          <!-- Ally moving -->
          <circle cx={tok.x} cy={tok.y} r={R}
            fill="none" stroke="#4ade80" stroke-width="2.5" opacity="0.85" />
        {:else}
          <!-- Enemy moving -->
          <circle cx={tok.x} cy={tok.y} r={R}
            fill="none" stroke="#ef4444" stroke-width="2.5" opacity="0.85" />
        {/if}
      </g>
    {/if}
  {/each}
</svg>

<style>
  .replay-overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
    border-radius: 10px;
  }

  .freeze-flash {
    animation: freeze-flash 0.18s ease-out both;
  }

  @keyframes freeze-flash {
    0%   { filter: brightness(3) saturate(0); }
    100% { filter: brightness(1) saturate(1); }
  }

  .kill-marker {
    animation: kill-appear 0.2s ease-out both;
  }
  @keyframes kill-appear {
    from { opacity: 0; transform: scale(0.5); }
    to   { opacity: 1; transform: scale(1); }
  }
</style>
