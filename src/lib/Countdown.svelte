<script lang="ts">
  // Countdown to next UTC midnight
  import { secondsUntilReset, formatCountdown } from "./daily.js";

  let seconds = $state(secondsUntilReset());

  $effect(() => {
    const id = setInterval(() => {
      seconds = secondsUntilReset();
    }, 1000);
    return () => clearInterval(id);
  });
</script>

<span class="countdown">Prochain puzzle dans <strong>{formatCountdown(seconds)}</strong></span>

<style>
  .countdown {
    font-family: ui-monospace, Consolas, monospace;
    font-size: 13px;
    color: #64748b;
  }
  strong {
    color: #94a3b8;
  }
</style>
