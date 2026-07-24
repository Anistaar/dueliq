<script lang="ts">
  // StreakBadge — shows current streak and best
  // Not endorsed by Riot Games.
  import { getStreakData } from "./daily.js";

  const { streak, best } = getStreakData();
</script>

{#if streak > 0}
  <div class="streak-wrap">
    <span class="flame">🔥</span>
    <span class="streak-val">{streak}</span>
    <span class="streak-label">jours d'affilee</span>
    {#if best > streak}
      <span class="best">record : {best}</span>
    {/if}
  </div>
{/if}

<style>
  .streak-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #1c1917;
    border: 1px solid #44403c;
    border-radius: 20px;
    padding: 4px 14px;
    font-size: 13px;
  }
  .flame { font-size: 15px; }
  .streak-val {
    font-family: ui-monospace, Consolas, monospace;
    font-weight: 800;
    color: #fb923c;
  }
  .streak-label { color: #78716c; font-size: 12px; }
  .best {
    font-size: 11px;
    color: #57534e;
    margin-left: 4px;
    font-family: ui-monospace, Consolas, monospace;
  }
</style>
