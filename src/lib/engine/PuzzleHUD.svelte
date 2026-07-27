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

  function ecoColor(e: string): string {
    switch (e) {
      case "eco":       return "#ef4444";
      case "semi-eco":  return "#f97316";
      case "semi-buy":  return "#eab308";
      case "full-buy":  return "#22c55e";
      default:          return "#94a3b8";
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
    <svg class="hud-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="#60a5fa" stroke-width="1.2"/>
      <path d="M7 4v3.5l2 1.5" stroke="#60a5fa" stroke-width="1.2" stroke-linecap="round"/>
    </svg>
    <span class="timer">{formatTimer(state.timer_s)}</span>
    {#if state.spike_planted}
      <span class="spike-badge">
        <span class="spike-dot"></span>
        SPIKE
      </span>
    {/if}
  </div>

  <span class="hud-divider"></span>

  <!-- Alive counts -->
  <div class="hud-block alive-block">
    <span class="alive-atk" title="Attackers alive">
      <span class="alive-dot atk"></span>
      {state.alive_atk} ATK
    </span>
    <span class="vs">vs</span>
    <span class="alive-def" title="Defenders alive">
      <span class="alive-dot def"></span>
      {state.alive_def} DEF
    </span>
  </div>

  <span class="hud-divider"></span>

  <!-- Eco -->
  <div class="hud-block eco-block" title="Economy ATK / DEF">
    <span class="eco-label">ECO</span>
    <span class="eco" style="color: {ecoColor(state.eco_atk_approx)}">{ecoShort(state.eco_atk_approx)}</span>
    <span class="eco-sep">/</span>
    <span class="eco" style="color: {ecoColor(state.eco_def_approx)}">{ecoShort(state.eco_def_approx)}</span>
  </div>

  <span class="hud-divider"></span>

  <!-- Util joueur -->
  <div class="hud-block util-block" title="Utilitaires restants">
    <span class="agent-name">{state.util_joueur.agent.toUpperCase()}</span>
    {#if state.util_joueur.signature}
      <span class="util-chip sig" title="Signature">{state.util_joueur.signature}</span>
    {/if}
    {#if state.util_joueur.ultimate}
      <span class="util-chip ult" title="Ultimate">{state.util_joueur.ultimate}</span>
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
    gap: 6px 8px;
    align-items: center;
    background: linear-gradient(135deg, #0f1117 0%, #111520 100%);
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 9px 14px;
    font-family: 'Space Grotesk', ui-monospace, monospace;
    font-size: 11px;
    color: #94a3b8;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
  }
  .hud-block {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .hud-divider {
    width: 1px;
    height: 16px;
    background: #1e293b;
    flex-shrink: 0;
    display: none;
  }
  @media (min-width: 480px) { .hud-divider { display: block; } }

  .hud-icon { flex-shrink: 0; opacity: 0.7; }

  .timer {
    font-size: 14px;
    font-weight: 800;
    color: #e2e8f0;
    letter-spacing: 0.04em;
    font-family: 'Space Grotesk', monospace;
  }
  .spike-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #FF455520;
    border: 1px solid #FF455540;
    color: #FF4655;
    border-radius: 4px;
    padding: 1px 7px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
  }
  .spike-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #FF4655;
    animation: pulse-ring 1.5s ease-in-out infinite;
  }

  .alive-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .alive-dot.atk { background: #f87171; box-shadow: 0 0 4px #f87171; }
  .alive-dot.def { background: #4ade80; box-shadow: 0 0 4px #4ade80; }
  .alive-atk { color: #f87171; font-weight: 700; display: flex; align-items: center; gap: 4px; }
  .alive-def { color: #4ade80; font-weight: 700; display: flex; align-items: center; gap: 4px; }
  .vs { color: #334155; font-size: 10px; }

  .eco-label {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #334155;
    text-transform: uppercase;
  }
  .eco { font-weight: 700; font-size: 11px; }
  .eco-sep { color: #1e293b; }

  .agent-name { color: #cbd5e1; font-weight: 800; font-size: 11px; letter-spacing: 0.05em; }
  .util-chip {
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.04em;
    border: 1px solid;
  }
  .util-chip.sig  { background: #0f1b2d; color: #93c5fd; border-color: #1e3a5f; }
  .util-chip.ult  { background: #1a0d24; color: #c4b5fd; border-color: #4c1d95; }
  .util-chip.basic { background: #071510; color: #6ee7b7; border-color: #064e3b; }
</style>
