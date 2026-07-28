<script lang="ts">
  // StreakBadge — shows current streak and best
  // Not endorsed by Riot Games.
  import { getStreakData } from "./daily.js";

  const { streak, best } = getStreakData();
</script>

{#if streak > 0}
  <div class="streak-wrap">
    <!-- SVG flame — no emoji -->
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
      <path d="M6 1C6 1 9 4 9 7C9 8.5 8 9.5 6.5 9.5C7.5 8.5 7.5 7 6.5 6C6.5 7 5.5 8 4.5 7.5C3 6.5 3 4.5 4 3.5C3.5 5 4 6 5 6C4 4 5 1 6 1Z" fill="#FF4655"/>
      <path d="M6 10C7.1 10 8 10.9 8 12C8 13.1 7.1 14 6 14C4.9 14 4 13.1 4 12C4 10.9 4.9 10 6 10Z" fill="#FF465580"/>
    </svg>
    <span class="streak-val">{streak}</span>
    <span class="streak-label">streak</span>
    {#if best > streak}
      <span class="best">best {best}</span>
    {/if}
  </div>
{/if}

<style>
  .streak-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #1C2127;
    border: 1px solid #2A3441;
    padding: 4px 12px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 12px;
  }
  .streak-val {
    font-weight: 800;
    color: #FF4655;
    font-size: 13px;
    letter-spacing: -0.01em;
  }
  .streak-label {
    color: #7B8FA1;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .best {
    font-size: 10px;
    color: #2A3441;
    margin-left: 4px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
</style>
