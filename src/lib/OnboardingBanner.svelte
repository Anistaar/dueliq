<script lang="ts">
  // OnboardingBanner — inline card above the library (NOT a blocking modal).
  // 2 steps: pick role → pick rank → save → done.
  // Skippable via "Later" (sets dismissed flag, won't re-show this session).
  // Not endorsed by Riot Games.
  import type { Role, RankBand } from "./onboarding.js";
  import {
    saveProfile,
    dismissBanner,
  } from "./onboarding.js";

  const {
    onComplete,
    onSkip,
  }: {
    onComplete: (role: Role, rank: RankBand) => void;
    onSkip: () => void;
  } = $props();

  const ROLES: Role[] = ["Duelist", "Initiator", "Controller", "Sentinel", "Flex"];
  const RANKS: { label: string; value: RankBand }[] = [
    { label: "Iron – Silver",       value: "Iron-Silver" },
    { label: "Gold – Plat",         value: "Gold-Plat" },
    { label: "Diamond – Ascendant", value: "Diamond-Ascendant" },
    { label: "Immortal+",           value: "Immortal+" },
  ];

  let selectedRole = $state<Role | null>(null);
  let selectedRank = $state<RankBand | null>(null);

  function confirm() {
    if (!selectedRole || !selectedRank) return;
    saveProfile({ role: selectedRole, rank: selectedRank });
    onComplete(selectedRole, selectedRank);
  }

  function skip() {
    dismissBanner();
    onSkip();
  }

  const canConfirm = $derived(selectedRole !== null && selectedRank !== null);
</script>

<div class="ob-banner" data-testid="onboarding-banner" aria-label="Personalize your training">
  <div class="ob-header">
    <div class="ob-title-row">
      <span class="ob-title">Personalize your training</span>
      <button class="ob-skip" onclick={skip} aria-label="Skip personalization">Later</button>
    </div>
    <p class="ob-sub">Get puzzles matched to your role and rank.</p>
  </div>

  <!-- Step 1: Role -->
  <div class="ob-group">
    <span class="ob-label">Your main role</span>
    <div class="ob-pills" role="group" aria-label="Select your main role">
      {#each ROLES as role}
        <button
          class="ob-pill"
          class:ob-pill--active={selectedRole === role}
          onclick={() => (selectedRole = role)}
          aria-pressed={selectedRole === role}
          data-testid="role-pill-{role}"
        >{role}</button>
      {/each}
    </div>
  </div>

  <!-- Step 2: Rank -->
  <div class="ob-group">
    <span class="ob-label">Your rank</span>
    <div class="ob-pills" role="group" aria-label="Select your rank band">
      {#each RANKS as r}
        <button
          class="ob-pill"
          class:ob-pill--active={selectedRank === r.value}
          onclick={() => (selectedRank = r.value)}
          aria-pressed={selectedRank === r.value}
          data-testid="rank-pill-{r.value}"
        >{r.label}</button>
      {/each}
    </div>
  </div>

  <!-- Actions -->
  <div class="ob-actions">
    <button
      class="ob-confirm"
      class:ob-confirm--ready={canConfirm}
      onclick={confirm}
      disabled={!canConfirm}
      data-testid="onboarding-confirm"
    >
      Apply →
    </button>
  </div>
</div>

<style>
  /* ── Banner container ───────────────────────────────────────────────────── */
  .ob-banner {
    background: #1C2127;
    border: 1px solid #2A3441;
    border-left: 2px solid #FF4655;
    padding: 20px 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    /* No border-radius — DA v3 esport */
    clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
  }

  /* ── Header ─────────────────────────────────────────────────────────────── */
  .ob-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .ob-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .ob-title {
    font-family: 'Anton', Impact, sans-serif;
    font-size: 16px;
    font-weight: 400;
    color: #ECE8E1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .ob-skip {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #4A5568;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px 0;
    transition: color 0.1s;
    text-decoration: underline;
    text-underline-offset: 2px;
    min-height: 44px;
    display: flex;
    align-items: center;
  }
  .ob-skip:hover { color: #7B8FA1; }

  .ob-sub {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 12px;
    color: #7B8FA1;
    margin: 0;
    line-height: 1.5;
  }

  /* ── Pill group ──────────────────────────────────────────────────────────── */
  .ob-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ob-label {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #7B8FA1;
    text-transform: uppercase;
  }

  .ob-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  /* Pill: rectangular — DA v3 rule (pills rectangulaires, zéro nouveau pattern décoratif) */
  .ob-pill {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0 14px;
    height: 32px;
    border: 1px solid #2A3441;
    background: transparent;
    color: #7B8FA1;
    cursor: pointer;
    transition: border-color 0.1s, color 0.1s, background 0.1s;
    min-height: 44px; /* mobile touch target */
    display: flex;
    align-items: center;
    /* clip-path: small corner cut, esport language */
    clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%);
  }
  .ob-pill:hover {
    border-color: #FF4655;
    color: #ECE8E1;
  }
  .ob-pill--active {
    border-color: #FF4655;
    background: #FF465514;
    color: #ECE8E1;
  }

  /* ── Confirm button ──────────────────────────────────────────────────────── */
  .ob-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .ob-confirm {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 10px 20px;
    min-height: 44px;
    background: #2A3441;
    color: #7B8FA1;
    border: 1px solid #2A3441;
    cursor: not-allowed;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
    clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  }
  .ob-confirm--ready {
    background: #FF4655;
    color: #ECE8E1;
    border-color: #FF4655;
    cursor: pointer;
  }
  .ob-confirm--ready:hover {
    background: #ECE8E1;
    color: #FF4655;
    border-color: #ECE8E1;
  }

  /* ── Mobile adjustments ─────────────────────────────────────────────────── */
  @media (max-width: 599px) {
    .ob-pill {
      font-size: 12px;
      padding: 0 12px;
    }
  }
</style>
