<script lang="ts">
  // PuzzleHUD — compact round state bar (timer, alive counts, eco, util)
  import type { RoundStatePuzzle } from "./puzzle_types.js";

  const { state, side } = $props<{
    state: RoundStatePuzzle;
    side: "ATK" | "DEF";
  }>();

  function ecoShort(e: string): string {
    switch (e) {
      case "eco":       return "ECO";
      case "semi-eco":  return "S-ECO";
      case "semi-buy":  return "S-BUY";
      case "full-buy":  return "BUY";
      default:          return e.toUpperCase();
    }
  }

  function formatTimer(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${sec}s`;
  }
</script>

<div class="hud">
  <!-- Timer + spike -->
  <div class="hud-block timer-block">
    <span class="timer">{formatTimer(state.timer_s)}</span>
    {#if state.spike_planted}
      <span class="spike-badge">SPIKE PLANTE</span>
    {/if}
  </div>

  <!-- Alive counts -->
  <div class="hud-block alive-block">
    <span class="alive-atk" title="Attackers alive">{state.alive_atk} ATK</span>
    <span class="vs">vs</span>
    <span class="alive-def" title="Defenders alive">{state.alive_def} DEF</span>
  </div>

  <!-- Eco -->
  <div class="hud-block eco-block">
    <span class="eco" title="ATK economy">{ecoShort(state.eco_atk_approx)}</span>
    <span class="eco-sep">/</span>
    <span class="eco" title="DEF economy">{ecoShort(state.eco_def_approx)}</span>
  </div>

  <!-- Util joueur -->
  <div class="hud-block util-block" title="Utilitaires restants">
    <span class="agent-name">{state.util_joueur.agent.toUpperCase()}</span>
    {#if state.util_joueur.signature}
      <span class="util-chip sig">{state.util_joueur.signature}</span>
    {/if}
    {#if state.util_joueur.ultimate}
      <span class="util-chip ult">{state.util_joueur.ultimate}</span>
    {/if}
    {#each state.util_joueur.basic_remaining as b}
      <span class="util-chip basic">{b}</span>
    {/each}
  </div>
</div>

<style>
  .hud {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    align-items: center;
    background: #0f1117;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 8px 12px;
    font-family: monospace;
    font-size: 12px;
    color: #94a3b8;
  }
  .hud-block {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .timer {
    font-size: 15px;
    font-weight: 700;
    color: #e2e8f0;
    letter-spacing: 0.05em;
  }
  .spike-badge {
    background: #7f1d1d;
    color: #fca5a5;
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 10px;
    letter-spacing: 0.08em;
  }
  .alive-atk { color: #f87171; font-weight: 600; }
  .alive-def { color: #4ade80; font-weight: 600; }
  .vs { color: #475569; font-size: 10px; }
  .eco { color: #a78bfa; }
  .eco-sep { color: #334155; }
  .agent-name { color: #cbd5e1; font-weight: 700; }
  .util-chip {
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 10px;
  }
  .util-chip.sig  { background: #1e3a5f; color: #93c5fd; }
  .util-chip.ult  { background: #3b1f6b; color: #c4b5fd; }
  .util-chip.basic { background: #1c3221; color: #6ee7b7; }
</style>
