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

<span class="countdown"><strong>{formatCountdown(seconds)}</strong></span>

<style>
  .countdown {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 12px;
    color: #7B8FA1;
    letter-spacing: 0.04em;
  }
  strong {
    color: #ECE8E1;
    font-weight: 800;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
</style>
