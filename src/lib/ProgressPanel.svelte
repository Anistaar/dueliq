<script lang="ts">
  // ProgressPanel — Local progress summary (no account, localStorage only).
  // Not endorsed by Riot Games.
  import {
    getPlayedCount,
    getAverageScore,
    getGradeDistribution,
    getWeakestTheme,
    type Grade,
  } from "./progress.js";

  const {
    totalPuzzles,
    onTrainTheme,
  }: {
    totalPuzzles: number;
    onTrainTheme: (theme: string) => void;
  } = $props();

  // Read from localStorage reactively — rebuild on each mount/update
  let playedCount = $state(getPlayedCount());
  let avgScore = $state(getAverageScore());
  let gradeDist = $state(getGradeDistribution());
  let weakestTheme = $state(getWeakestTheme());

  export function refresh() {
    playedCount = getPlayedCount();
    avgScore = getAverageScore();
    gradeDist = getGradeDistribution();
    weakestTheme = getWeakestTheme();
  }

  const gradeColor: Record<Grade, string> = {
    S: "#22c55e",
    A: "#eab308",
    C: "#f97316",
    X: "#ef4444",
  };
  const gradeLabel: Record<Grade, string> = {
    S: "Radiant",
    A: "Acceptable",
    C: "Costly",
    X: "Mistake",
  };

  function themeLabel(theme: string): string {
    return theme.charAt(0).toUpperCase() + theme.slice(1);
  }

  const progressPct = $derived(
    totalPuzzles > 0 ? Math.round((playedCount / totalPuzzles) * 100) : 0
  );
</script>

{#if playedCount > 0}
<section class="progress-section" aria-label="Your progress">
  <div class="progress-inner">
    <div class="progress-header">
      <h2 class="progress-title">Your progress</h2>
      <span class="progress-sub">localStorage · no account</span>
    </div>

    <div class="progress-stats">
      <!-- Played / Total -->
      <div class="stat-card">
        <div class="stat-value">{playedCount}<span class="stat-denom">/{totalPuzzles}</span></div>
        <div class="stat-label">Puzzles played</div>
        <!-- progress bar -->
        <div class="prog-bar">
          <div class="prog-fill" style="width: {progressPct}%"></div>
        </div>
      </div>

      <!-- Avg score -->
      {#if avgScore !== null}
        <div class="stat-card">
          <div class="stat-value">{avgScore}<span class="stat-denom">/1000</span></div>
          <div class="stat-label">Avg score</div>
        </div>
      {/if}

      <!-- Grade distribution -->
      <div class="stat-card stat-card--grades">
        <div class="grades-row">
          {#each (["S", "A", "C", "X"] as Grade[]) as g}
            {#if gradeDist[g] > 0}
              <div class="grade-pill" style="color: {gradeColor[g]}; border-color: {gradeColor[g]}40; background: {gradeColor[g]}12">
                <span class="grade-letter">{g}</span>
                <span class="grade-cnt">{gradeDist[g]}</span>
              </div>
            {/if}
          {/each}
        </div>
        <div class="stat-label">Grade split</div>
      </div>
    </div>

    <!-- Weakest theme CTA -->
    {#if weakestTheme}
      <div class="weak-banner">
        <div class="weak-icon" aria-hidden="true">⚠</div>
        <div class="weak-text">
          <span class="weak-label">Your weakest theme</span>
          <span class="weak-theme">{themeLabel(weakestTheme)}</span>
        </div>
        <button
          class="btn-train"
          onclick={() => onTrainTheme(weakestTheme!)}
        >
          Train {themeLabel(weakestTheme)} →
        </button>
      </div>
    {/if}
  </div>
</section>
{/if}

<style>
  .progress-section {
    padding: 28px 20px 36px;
    border-top: 1px solid #1e293b;
    background: #0d0f1a;
  }

  .progress-inner {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .progress-header {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }

  .progress-title {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 20px;
    font-weight: 800;
    color: #e2e8f0;
    letter-spacing: -0.01em;
    margin: 0;
  }

  .progress-sub {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: #334155;
    text-transform: uppercase;
  }

  .progress-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .stat-card {
    background: #0f111a;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 14px 18px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 110px;
  }

  .stat-card--grades {
    flex-direction: column;
    gap: 8px;
  }

  .stat-value {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 26px;
    font-weight: 900;
    color: #e2e8f0;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  .stat-denom {
    font-size: 14px;
    color: #475569;
    font-weight: 600;
  }

  .stat-label {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #334155;
    text-transform: uppercase;
  }

  /* Progress bar */
  .prog-bar {
    height: 3px;
    background: #1e293b;
    border-radius: 2px;
    overflow: hidden;
    margin-top: 6px;
  }
  .prog-fill {
    height: 100%;
    background: linear-gradient(90deg, #00D4AA, #009980);
    border-radius: 2px;
    transition: width 0.5s ease;
  }

  /* Grades row */
  .grades-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .grade-pill {
    display: flex;
    align-items: center;
    gap: 4px;
    border: 1px solid;
    border-radius: 5px;
    padding: 3px 8px;
  }
  .grade-letter {
    font-family: 'Space Grotesk', monospace;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.05em;
  }
  .grade-cnt {
    font-family: 'Space Grotesk', monospace;
    font-size: 11px;
    font-weight: 700;
    opacity: 0.85;
  }

  /* Weakest theme banner */
  .weak-banner {
    background: linear-gradient(135deg, #1a1008, #180e04);
    border: 1px solid #713f1240;
    border-radius: 10px;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .weak-icon {
    font-size: 18px;
    opacity: 0.8;
    flex-shrink: 0;
  }

  .weak-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 120px;
  }

  .weak-label {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #334155;
    text-transform: uppercase;
  }

  .weak-theme {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 16px;
    font-weight: 800;
    color: #fbbf24;
    letter-spacing: -0.01em;
  }

  .btn-train {
    background: linear-gradient(135deg, #f97316, #ea6000);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 18px;
    font-size: 13px;
    font-weight: 700;
    font-family: 'Space Grotesk', system-ui, sans-serif;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
    white-space: nowrap;
    min-height: 44px;
  }
  .btn-train:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(249, 115, 22, 0.35);
  }

  @media (max-width: 420px) {
    .weak-banner { flex-direction: column; align-items: flex-start; }
    .btn-train { width: 100%; }
  }
</style>
