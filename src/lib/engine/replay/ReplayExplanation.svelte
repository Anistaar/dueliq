<script lang="ts">
  /**
   * ReplayExplanation — Shows the resolution_timeline (optimal line)
   * with animated SVG path draw and synchronized annotation text.
   * Not endorsed by Riot Games.
   */
  import type { TimelineEvent, Positions } from "../puzzle_types.js";
  import { onMount, onDestroy } from "svelte";

  const { resolutionTimeline, positions, explanation } = $props<{
    resolutionTimeline: TimelineEvent[];
    positions: Positions;
    explanation: string;
  }>();

  const vbParts = positions.viewBox.split(" ").map(Number);
  const VB_W = vbParts[2] ?? 1000;
  const VB_H = vbParts[3] ?? 1000;

  // Build path from move events in the resolution timeline
  interface PathSegment {
    tokenId: string;
    points: { x: number; y: number }[];
    color: string;
    label?: string;
  }

  function buildPaths(): PathSegment[] {
    const tokenPaths = new Map<string, { points: { x: number; y: number }[]; color: string; label?: string }>();

    // Determine if token is ally or enemy
    const allyIds = new Set(positions.allies.map((t: { id: string }) => t.id));

    for (const ev of resolutionTimeline) {
      if (ev.type === "move" && ev.token && ev.from && ev.to) {
        const isAlly = allyIds.has(ev.token);
        const isYou = positions.allies.find((t: { id: string; est_joueur_concerne?: boolean }) => t.id === ev.token)?.est_joueur_concerne === true;
        const color = isYou ? "#facc15" : (isAlly ? "#4ade80" : "#ef4444");

        if (!tokenPaths.has(ev.token)) {
          tokenPaths.set(ev.token, { points: [ev.from], color, label: ev.label });
        }
        tokenPaths.get(ev.token)!.points.push(ev.to);
      }
    }

    return Array.from(tokenPaths.entries()).map(([id, v]) => ({
      tokenId: id,
      ...v,
    }));
  }

  const paths = buildPaths();

  // Build util zones from resolution timeline
  interface ResUtil { x: number; y: number; r: number; color: string; label?: string; }
  const resUtils: ResUtil[] = resolutionTimeline
    .filter((ev: TimelineEvent) => ev.type === "util" && ev.zone)
    .map((ev: TimelineEvent) => ({
      x: ev.zone!.x,
      y: ev.zone!.y,
      r: ev.zone!.r,
      color: ev.zone!.color ?? "#00D4AA",
      label: ev.zone!.label,
    }));

  // Path draw animation state
  let drawProgress = $state(0);
  let annotationVisible = $state(false);
  let rafId: number | null = null;
  let startTime: number | null = null;
  const DRAW_DUR = 1800; // ms to draw all paths

  function animateDraw(now: number) {
    if (!startTime) startTime = now;
    const elapsed = now - startTime;
    drawProgress = Math.min(1, elapsed / DRAW_DUR);
    if (elapsed > DRAW_DUR * 0.5) annotationVisible = true;
    if (drawProgress < 1) {
      rafId = requestAnimationFrame(animateDraw);
    }
  }

  function buildPathD(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return "";
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }

  function getPathLength(pts: { x: number; y: number }[]): number {
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
  }

  onMount(() => {
    rafId = requestAnimationFrame(animateDraw);
  });

  onDestroy(() => {
    if (rafId) cancelAnimationFrame(rafId);
  });
</script>

<div class="explanation-wrap">
  <!-- Map with drawn optimal path -->
  <div class="map-container">
    <svg
      viewBox={positions.viewBox}
      class="expl-svg"
      aria-label="Optimal line visualization"
    >
      <defs>
        <!-- Arrow marker for path ends -->
        {#each paths as seg, i}
          <marker id="arrow-{i}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={seg.color} opacity="0.9" />
          </marker>
        {/each}
      </defs>

      <!-- Background -->
      <rect width={VB_W} height={VB_H} fill="#0d0f18" rx="4" />

      <!-- Subtle grid -->
      {#each Array.from({ length: 10 }) as _, i}
        <line
          x1={VB_W * (i + 1) / 11} y1="0"
          x2={VB_W * (i + 1) / 11} y2={VB_H}
          stroke="#1e2235" stroke-width="0.8" opacity="0.4"
        />
        <line
          x1="0" y1={VB_H * (i + 1) / 11}
          x2={VB_W} y2={VB_H * (i + 1) / 11}
          stroke="#1e2235" stroke-width="0.8" opacity="0.4"
        />
      {/each}

      <!-- Starting positions (static tokens from positions) -->
      {#each positions.allies as tok}
        {@const isYou = tok.est_joueur_concerne === true}
        <circle
          cx={tok.x} cy={tok.y} r="20"
          fill={isYou ? "#facc1540" : "#4ade8040"}
          stroke={isYou ? "#facc15" : "#4ade80"}
          stroke-width="2" opacity="0.7"
        />
        {#if tok.label}
          <text x={tok.x} y={tok.y + 5} text-anchor="middle"
            font-size="11" fill={isYou ? "#fde68a" : "#6ee7b7"}
            font-family="'Space Grotesk', monospace" font-weight="700"
          >{isYou ? "★" : tok.label.slice(0, 2)}</text>
        {/if}
      {/each}

      {#each positions.ennemis_connus as tok}
        <circle
          cx={tok.x} cy={tok.y} r="20"
          fill="#ef444440" stroke="#ef4444" stroke-width="2" opacity="0.7"
        />
        <text x={tok.x} y={tok.y + 5} text-anchor="middle"
          font-size="14" fill="#fca5a5"
          font-family="'Space Grotesk', monospace" font-weight="700"
        >×</text>
      {/each}

      <!-- Util zones from resolution -->
      {#each resUtils as uz}
        <circle cx={uz.x} cy={uz.y} r={uz.r}
          fill={uz.color} opacity="0.2"
          stroke={uz.color} stroke-width="1.5" stroke-dasharray="5 4"
        />
        {#if uz.label}
          <text x={uz.x} y={uz.y + 5} text-anchor="middle"
            font-size="11" fill={uz.color}
            font-family="'Space Grotesk', monospace" font-weight="700"
            opacity="0.85">{uz.label}</text>
        {/if}
      {/each}

      <!-- Optimal path lines (drawn progressively) -->
      {#each paths as seg, i}
        {@const d = buildPathD(seg.points)}
        {@const totalLen = getPathLength(seg.points)}
        <!-- Glow shadow -->
        <path
          {d}
          fill="none"
          stroke={seg.color}
          stroke-width="6"
          opacity="0.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- Main animated path -->
        <path
          {d}
          fill="none"
          stroke={seg.color}
          stroke-width="3"
          opacity="0.9"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-dasharray={totalLen}
          stroke-dashoffset={totalLen * (1 - drawProgress)}
          style="transition: stroke-dashoffset 0.05s linear;"
          marker-end="url(#arrow-{i})"
        />
        <!-- Destination waypoint dot -->
        {#if seg.points.length > 1 && drawProgress > 0.8}
          {@const endPt = seg.points[seg.points.length - 1]}
          <circle cx={endPt.x} cy={endPt.y} r="10"
            fill={seg.color} opacity="0.85"
            style="animation: appear 0.3s ease both;"
          />
        {/if}
      {/each}
    </svg>
  </div>

  <!-- Synchronized explanation text -->
  <div class="expl-text" class:visible={annotationVisible}>
    <div class="expl-tag">OPTIMAL LINE</div>
    <p class="expl-body">{explanation}</p>
  </div>
</div>

<style>
  .explanation-wrap {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }

  .map-container {
    position: relative;
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
  }

  .expl-svg {
    width: 100%;
    height: auto;
    border-radius: 10px;
    border: 1px solid #1e293b;
    display: block;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
    background: #0d0f18;
  }

  .expl-text {
    background: linear-gradient(135deg, #071510 0%, #091a0f 100%);
    border: 1px solid #14532d;
    border-radius: 10px;
    padding: 14px 18px;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.4s ease, transform 0.4s ease;
    position: relative;
    overflow: hidden;
  }
  .expl-text::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #00D4AA80, transparent);
  }
  .expl-text.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .expl-tag {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #00D4AA;
    margin-bottom: 8px;
  }

  .expl-body {
    font-size: 14px;
    line-height: 1.65;
    color: #cbd5e1;
  }

  @keyframes appear {
    from { opacity: 0; transform: scale(0.5); }
    to   { opacity: 0.85; transform: scale(1); }
  }
</style>
