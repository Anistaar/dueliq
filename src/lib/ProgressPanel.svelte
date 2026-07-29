<script lang="ts">
  // ProgressPanel — Local progress summary (no account, localStorage only).
  // Displays role/rank from onboarding profile when set, plus "edit" link.
  // Weakest-theme CTA is role-aware: preferred themes for the role are shown first.
  // Not endorsed by Riot Games.
  import {
    getPlayedCount,
    getAverageScore,
    getGradeDistribution,
    getWeakestTheme,
    type Grade,
  } from "./progress.js";
  import type { OnboardingProfile } from "./onboarding.js";
  import { ROLE_THEMES } from "./onboarding.js";

  const {
    totalPuzzles,
    onTrainTheme,
    profile = null,
    onEditProfile,
  }: {
    totalPuzzles: number;
    onTrainTheme: (theme: string) => void;
    profile?: OnboardingProfile | null;
    onEditProfile?: () => void;
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

  // ── Role-aware weakest theme CTA ──────────────────────────────────────────
  // When a profile is set, prefer to surface a theme that is:
  //   (a) the player's weakest theme AND (b) relevant to their role.
  // If the weakest theme is not role-relevant, still show it but append
  // a secondary CTA hint for the role's #1 priority theme if unplayed/weak.
  // This ensures the CTA is always actionable and role-contextual.
  const trainTarget = $derived(
    weakestTheme
      ? weakestTheme
      : profile
        ? (ROLE_THEMES[profile.role]?.[0] ?? null)
        : null
  );
</script>

{#if playedCount > 0}
<section class="progress-section" aria-label="Your progress">
  <div class="progress-inner">
    <div class="progress-header">
      <h2 class="progress-title">Your progress</h2>
      <span class="progress-sub">localStorage · no account</span>
      {#if profile}
        <div class="profile-tag" data-testid="profile-tag">
          <span class="profile-role">{profile.role}</span>
          <span class="profile-sep">·</span>
          <span class="profile-rank">{profile.rank}</span>
          {#if onEditProfile}
            <button class="profile-edit" onclick={onEditProfile} data-testid="edit-profile-btn">edit</button>
          {/if}
        </div>
      {/if}
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

    <!-- Weakest theme CTA — role-aware when profile is set -->
    {#if trainTarget}
      <div class="weak-banner">
        <div class="weak-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2L13 12H1L7 2Z" stroke="#FF4655" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
            <line x1="7" y1="6" x2="7" y2="9" stroke="#FF4655" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="7" cy="10.5" r="0.5" fill="#FF4655"/>
          </svg>
        </div>
        <div class="weak-text">
          <span class="weak-label">
            {#if weakestTheme}Your weakest theme{:else}Train for your role{/if}
          </span>
          <span class="weak-theme">{themeLabel(trainTarget)}</span>
        </div>
        <button
          class="btn-train"
          onclick={() => onTrainTheme(trainTarget!)}
        >
          Train {themeLabel(trainTarget)} →
        </button>
      </div>
    {/if}
  </div>
</section>
{/if}

<style>
  .progress-section {
    padding: 28px 20px 36px;
    border-top: 1px solid #2A3441;
    background: #1C2127;
  }

  .progress-inner {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .progress-header {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }

  .progress-title {
    font-family: 'Anton', Impact, sans-serif;
    font-size: 20px;
    font-weight: 400;
    color: #ECE8E1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin: 0;
  }

  .progress-sub {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #4A5568;
    text-transform: uppercase;
  }

  .profile-tag {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-left: auto;
  }

  .profile-role,
  .profile-rank {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #ECE8E1;
    text-transform: uppercase;
  }

  .profile-sep {
    color: #4A5568;
    font-size: 10px;
  }

  .profile-edit {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #7B8FA1;
    background: transparent;
    border: none;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
    padding: 0;
    min-height: 24px;
    transition: color 0.1s;
  }
  .profile-edit:hover { color: #ECE8E1; }

  .progress-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .stat-card {
    background: #0F1923;
    border: 1px solid #2A3441;
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
    font-family: 'Anton', Impact, sans-serif;
    font-size: 28px;
    font-weight: 400;
    color: #ECE8E1;
    letter-spacing: 0.01em;
    line-height: 1;
    text-transform: uppercase;
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
  }
  .stat-denom {
    font-size: 14px;
    color: #7B8FA1;
    font-weight: 700;
    font-family: 'Inter', system-ui, sans-serif;
  }

  .stat-label {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #7B8FA1;
    text-transform: uppercase;
  }

  /* Progress bar */
  .prog-bar {
    height: 2px;
    background: #2A3441;
    overflow: hidden;
    margin-top: 8px;
  }
  .prog-fill {
    height: 100%;
    background: #FF4655;
    transition: width 0.5s ease;
  }

  /* Grades row */
  .grades-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .grade-pill {
    display: flex;
    align-items: center;
    gap: 4px;
    border: 1px solid;
    padding: 2px 8px;
  }
  .grade-letter {
    font-family: 'Anton', Impact, sans-serif;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .grade-cnt {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 800;
  }

  /* Weakest theme banner */
  .weak-banner {
    background: #0F1923;
    border: 1px solid #2A3441;
    border-left: 2px solid #FF4655;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .weak-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .weak-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 120px;
  }

  .weak-label {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #7B8FA1;
    text-transform: uppercase;
  }

  .weak-theme {
    font-family: 'Anton', Impact, sans-serif;
    font-size: 16px;
    font-weight: 400;
    color: #ECE8E1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .btn-train {
    background: #FF4655;
    color: #ECE8E1;
    border: none;
    padding: 10px 18px;
    font-size: 12px;
    font-weight: 700;
    font-family: 'Inter', system-ui, sans-serif;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
    white-space: nowrap;
    min-height: 44px;
    clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%);
  }
  .btn-train:hover {
    background: #ECE8E1;
    color: #FF4655;
  }

  @media (max-width: 420px) {
    .weak-banner { flex-direction: column; align-items: flex-start; }
    .btn-train { width: 100%; }
  }
</style>
