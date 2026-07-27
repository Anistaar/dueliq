<script lang="ts">
  // PuzzleEngine — state machine: intro -> choices -> reveal -> share
  // Not endorsed by Riot Games.
  import type { PuzzleSchema, OptionTier, PuzzleOptionSchema } from "./puzzle_types.js";
  import { computeScore, tierLabel, tierColor } from "./puzzle_types.js";
  import PuzzleBoard from "./PuzzleBoard.svelte";
  import PuzzleHUD from "./PuzzleHUD.svelte";
  import {
    trackDailyCompletion,
    fetchDailyPercentile,
    formatPercentile,
    type PercentileResult,
  } from "../analytics.js";

  const { puzzle, onComplete } = $props<{
    puzzle: PuzzleSchema;
    onComplete?: () => void;
  }>();

  // ---- State machine ----
  type Phase = "intro" | "playing" | "reveal" | "end";
  let phase = $state<Phase>("intro");
  let chosenIndex = $state<number | null>(null);
  let timer = $state<number>(30);
  let timerActive = $state(false);
  let copySuccess = $state(false);

  // Percentile state (fetched async after goEnd)
  let percentileResult = $state<PercentileResult | null>(null);
  let percentileFetching = $state(false);

  // Randomize option order once on mount
  const shuffledOrder = $derived.by(() => {
    const indices = puzzle.options.map((_: PuzzleOptionSchema, i: number) => i);
    // deterministic shuffle per puzzle id so share results are stable
    const seed = puzzle.id.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = (seed * (i + 1)) % (i + 1);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  });

  // The option the user selected (original index)
  const chosenOption = $derived<PuzzleOptionSchema | null>(
    chosenIndex !== null ? puzzle.options[chosenIndex] : null
  );

  const optimalOption = $derived<PuzzleOptionSchema>(
    puzzle.options.find((o: PuzzleOptionSchema) => o.tier === "optimal") ?? puzzle.options[0]
  );

  const userScore = $derived(chosenOption ? computeScore(chosenOption.tier) : 0);

  // ---- Timer ----
  let timerHandle: ReturnType<typeof setInterval> | null = null;

  function startTimer() {
    if (timerHandle) return;
    timerActive = true;
    timerHandle = setInterval(() => {
      if (timer <= 0) {
        stopTimer();
        return;
      }
      timer--;
    }, 1000);
  }

  function stopTimer() {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
    timerActive = false;
  }

  // ---- Actions ----
  function startPuzzle() {
    phase = "playing";
    timer = 30;
    startTimer();
  }

  function choose(originalIndex: number) {
    if (phase !== "playing") return;
    stopTimer();
    chosenIndex = originalIndex;
    phase = "reveal";
  }

  async function goEnd() {
    phase = "end";
    onComplete?.();

    // Fire-and-forget: track completion event (sync beacon, silent on error)
    if (chosenOption) {
      trackDailyCompletion(chosenOption.tier);
    }

    // Fetch percentile async — UI degrades gracefully if it fails
    if (chosenOption) {
      percentileFetching = true;
      percentileResult = await fetchDailyPercentile(chosenOption.tier);
      percentileFetching = false;
    }
  }

  // ---- Share ----
  function tierEmoji(tier: OptionTier): string {
    switch (tier) {
      case "optimal":    return "[R]";
      case "acceptable": return "[A]";
      case "couteux":    return "[C]";
      case "faute":      return "[X]";
    }
  }

  function buildShareText(): string {
    const score = userScore;
    const tier = chosenOption?.tier ?? "faute";
    const lines = [
      `DuelIQ — ${puzzle.id} | ${puzzle.map.toUpperCase()} ${puzzle.theme.toUpperCase()}`,
      `Score : ${score}/1000  ${tierEmoji(tier)} ${tierLabel(tier)}`,
      `Difficulte : ${"*".repeat(puzzle.difficulty_est)}${"_".repeat(5 - puzzle.difficulty_est)}`,
    ];
    if (percentileResult) {
      lines.push(formatPercentile(percentileResult));
    }
    lines.push("anistaar.github.io/dueliq");
    return lines.join("\n");
  }

  async function copyShare() {
    const text = buildShareText();
    try {
      await navigator.clipboard.writeText(text);
      copySuccess = true;
      setTimeout(() => { copySuccess = false; }, 2000);
    } catch {
      // fallback: textarea
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      copySuccess = true;
      setTimeout(() => { copySuccess = false; }, 2000);
    }
  }

  function resetPuzzle() {
    phase = "intro";
    chosenIndex = null;
    timer = 30;
    timerActive = false;
    percentileResult = null;
    percentileFetching = false;
    stopTimer();
  }
</script>

<div class="engine">

  <!-- ===== INTRO ===== -->
  {#if phase === "intro"}
    <div class="phase-intro">
      {#if puzzle.validation.status === "draft"}
        <div class="draft-banner">Status : DRAFT — non valide par juge Immortal+</div>
      {/if}
      <div class="meta-row">
        <span class="badge map">{puzzle.map.toUpperCase()}</span>
        <span class="badge theme">{puzzle.theme.toUpperCase()}</span>
        <span class="badge side">{puzzle.side}</span>
        <span class="badge diff">Difficulte {"*".repeat(puzzle.difficulty_est)}</span>
      </div>
      <PuzzleHUD state={puzzle.round_state} side={puzzle.side} />
      <div class="board-section">
        <PuzzleBoard positions={puzzle.positions} mapId={puzzle.map} />
      </div>
      <div class="question-box">
        <p class="question">{puzzle.question}</p>
      </div>
      <button class="btn-primary" onclick={startPuzzle}>Commencer (timer 30s optionnel)</button>
    </div>

  <!-- ===== PLAYING ===== -->
  {:else if phase === "playing"}
    <div class="phase-playing">
      {#if puzzle.validation.status === "draft"}
        <div class="draft-banner">Status : DRAFT</div>
      {/if}
      <div class="meta-row">
        <span class="badge map">{puzzle.map.toUpperCase()}</span>
        <span class="badge theme">{puzzle.theme.toUpperCase()}</span>
        <span class="badge side">{puzzle.side}</span>
        <span class="timer-badge" class:urgent={timer <= 10}>{timer}s</span>
      </div>
      <PuzzleHUD state={puzzle.round_state} side={puzzle.side} />
      <div class="board-section">
        <PuzzleBoard positions={puzzle.positions} mapId={puzzle.map} />
      </div>
      <div class="question-box">
        <p class="question">{puzzle.question}</p>
      </div>
      <div class="options-grid">
        {#each shuffledOrder as originalIdx, displayIdx}
          {@const opt = puzzle.options[originalIdx]}
          <button
            class="option-btn"
            onclick={() => choose(originalIdx)}
          >
            <span class="opt-letter">{String.fromCharCode(65 + displayIdx)}</span>
            <span class="opt-label">{opt.label}</span>
          </button>
        {/each}
      </div>
    </div>

  <!-- ===== REVEAL ===== -->
  {:else if phase === "reveal" && chosenOption}
    <div class="phase-reveal">
      <!-- Chosen option result -->
      <div class="reveal-card" style="--tier-color: {tierColor(chosenOption.tier)}">
        <div class="reveal-header">
          <span class="tier-badge" style="background: {tierColor(chosenOption.tier)}20; color: {tierColor(chosenOption.tier)}; border-color: {tierColor(chosenOption.tier)}40">
            {tierLabel(chosenOption.tier)}
          </span>
          <span class="score-display">{userScore}/1000</span>
        </div>
        <p class="chosen-label">"{chosenOption.label}"</p>
        <p class="short-expl">{chosenOption.explication_courte}</p>
        <div class="ev-row">
          <span class="ev-tag">{chosenOption.ev_delta}</span>
          <span class="freq-tag">Elites : {chosenOption.freq_elite_estimee}%</span>
        </div>
      </div>

      <!-- Optimal (if different from chosen) -->
      {#if chosenOption.tier !== "optimal"}
        <div class="optimal-card">
          <div class="optimal-label">Choix Radiant ({optimalOption.freq_elite_estimee}% des elites)</div>
          <p class="optimal-action">{optimalOption.label}</p>
          <p class="short-expl muted">{optimalOption.explication_courte}</p>
        </div>
      {/if}

      <!-- All options delta EV table -->
      <div class="ev-table">
        <div class="ev-table-title">Delta EV par option</div>
        {#each puzzle.options as opt}
          <div class="ev-row-item" class:is-chosen={opt === chosenOption}>
            <span class="ev-tier-dot" style="background: {tierColor(opt.tier)}"></span>
            <span class="ev-opt-label">{opt.label.slice(0, 55)}{opt.label.length > 55 ? "..." : ""}</span>
            <span class="ev-value">{opt.ev_delta}</span>
          </div>
        {/each}
      </div>

      <!-- Long explanation -->
      <details class="long-expl-details">
        <summary>Explication complete</summary>
        <p class="long-expl">{puzzle.explication_longue}</p>
      </details>

      <div class="reveal-actions">
        <button class="btn-primary" onclick={goEnd}>Voir le score final</button>
      </div>
    </div>

  <!-- ===== END ===== -->
  {:else if phase === "end"}
    <div class="phase-end">
      <div class="end-score-wrap">
        <div class="end-score">{userScore}</div>
        <div class="end-score-max">/1000</div>
      </div>
      {#if chosenOption}
        <div
          class="end-tier-label"
          style="color: {tierColor(chosenOption.tier)}"
        >
          {tierLabel(chosenOption.tier)}
        </div>
        {#if chosenOption.tier === "optimal"}
          <p class="end-msg">Choix Radiant confirme — excellente lecture de situation.</p>
        {:else if chosenOption.tier === "acceptable"}
          <p class="end-msg">Decision viable, mais le choix Radiant est plus efficace.</p>
        {:else if chosenOption.tier === "couteux"}
          <p class="end-msg">Decision couteuse — revisite l'explication pour consolider.</p>
        {:else}
          <p class="end-msg">Faute tactique — chaque situation est une lecon.</p>
        {/if}
      {/if}

      <!-- Percentile widget — degrades gracefully if fetch fails or adblocked -->
      {#if percentileFetching}
        <div class="percentile-loading">Calcul du classement du jour...</div>
      {:else if percentileResult}
        <div class="percentile-badge">
          <span class="percentile-icon">🏆</span>
          <span class="percentile-text">{formatPercentile(percentileResult)}</span>
        </div>
      {/if}

      <button class="btn-share" onclick={copyShare}>
        {copySuccess ? "Copie !" : "Copier le resultat"}
      </button>
      <div class="share-preview">
        <pre class="share-text">{buildShareText()}</pre>
      </div>
      <div class="end-actions">
        <button class="btn-secondary" onclick={resetPuzzle}>Recommencer ce puzzle</button>
      </div>
    </div>
  {/if}

</div>

<style>
  .engine {
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
    color: #e2e8f0;
    font-family: system-ui, sans-serif;
  }

  /* ---- SHARED ---- */
  .draft-banner {
    background: #1c1917;
    border: 1px solid #78350f;
    border-radius: 4px;
    color: #d97706;
    font-size: 11px;
    font-family: monospace;
    letter-spacing: 0.05em;
    padding: 4px 10px;
    text-align: center;
  }

  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .badge {
    font-family: monospace;
    font-size: 11px;
    letter-spacing: 0.07em;
    border-radius: 4px;
    padding: 2px 8px;
    border: 1px solid;
  }
  .badge.map   { background: #0f1b2d; color: #60a5fa; border-color: #1e3a5f; }
  .badge.theme { background: #0d1f17; color: #4ade80; border-color: #14532d; }
  .badge.side  { background: #1e1024; color: #c084fc; border-color: #3b0764; }
  .badge.diff  { background: #1c1917; color: #fcd34d; border-color: #78350f; }

  .timer-badge {
    font-family: monospace;
    font-size: 14px;
    font-weight: 700;
    padding: 2px 10px;
    border-radius: 4px;
    background: #1e293b;
    color: #94a3b8;
    border: 1px solid #334155;
    transition: background 0.3s, color 0.3s;
  }
  .timer-badge.urgent {
    background: #7f1d1d;
    color: #fca5a5;
    border-color: #b91c1c;
  }

  .board-section { margin: 4px 0; }

  .question-box {
    background: #0f172a;
    border: 1px solid #1e3a5f;
    border-radius: 6px;
    padding: 14px 16px;
  }
  .question {
    margin: 0;
    font-size: 15px;
    line-height: 1.55;
    color: #e2e8f0;
  }

  /* ---- OPTIONS ---- */
  .options-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .option-btn {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: #0f1117;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 12px 14px;
    color: #cbd5e1;
    font-size: 14px;
    line-height: 1.45;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    width: 100%;
  }
  .option-btn:hover {
    border-color: #334155;
    background: #151b26;
  }
  .opt-letter {
    font-family: monospace;
    font-weight: 700;
    color: #60a5fa;
    min-width: 18px;
    padding-top: 1px;
  }
  .opt-label { flex: 1; }

  /* ---- REVEAL ---- */
  .phase-reveal { display: flex; flex-direction: column; gap: 12px; }

  .reveal-card {
    background: #0f1117;
    border: 1px solid var(--tier-color, #334155);
    border-radius: 8px;
    padding: 16px;
  }
  .reveal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .tier-badge {
    font-family: monospace;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid;
  }
  .score-display {
    font-family: monospace;
    font-size: 20px;
    font-weight: 800;
    color: #e2e8f0;
  }
  .chosen-label {
    font-size: 14px;
    font-style: italic;
    color: #94a3b8;
    margin: 0 0 8px;
  }
  .short-expl {
    font-size: 13px;
    line-height: 1.5;
    color: #cbd5e1;
    margin: 0;
  }
  .short-expl.muted { color: #94a3b8; }
  .ev-row {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }
  .ev-tag {
    font-family: monospace;
    font-size: 12px;
    background: #1e293b;
    border-radius: 4px;
    padding: 2px 8px;
    color: #94a3b8;
  }
  .freq-tag {
    font-family: monospace;
    font-size: 12px;
    background: #1e293b;
    border-radius: 4px;
    padding: 2px 8px;
    color: #94a3b8;
  }

  .optimal-card {
    background: #0a1a10;
    border: 1px solid #14532d;
    border-radius: 8px;
    padding: 14px;
  }
  .optimal-label {
    font-size: 11px;
    font-family: monospace;
    letter-spacing: 0.07em;
    color: #4ade80;
    margin-bottom: 6px;
  }
  .optimal-action {
    font-size: 14px;
    color: #d1fae5;
    margin: 0 0 6px;
    font-weight: 600;
  }

  .ev-table {
    background: #0f1117;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ev-table-title {
    font-size: 11px;
    font-family: monospace;
    letter-spacing: 0.07em;
    color: #475569;
    margin-bottom: 4px;
  }
  .ev-row-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #94a3b8;
    padding: 3px 0;
  }
  .ev-row-item.is-chosen { color: #e2e8f0; font-weight: 600; }
  .ev-tier-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .ev-opt-label { flex: 1; font-size: 12px; }
  .ev-value { font-family: monospace; font-size: 12px; color: #60a5fa; }

  .long-expl-details {
    background: #0f1117;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 10px 14px;
  }
  .long-expl-details summary {
    cursor: pointer;
    font-size: 13px;
    color: #60a5fa;
    font-family: monospace;
    letter-spacing: 0.04em;
    list-style: none;
  }
  .long-expl-details summary::-webkit-details-marker { display: none; }
  .long-expl {
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 1.6;
    color: #94a3b8;
    white-space: pre-wrap;
  }

  .reveal-actions { display: flex; justify-content: flex-end; margin-top: 4px; }

  /* ---- END ---- */
  .phase-end {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 24px 16px;
  }
  .end-score-wrap {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  .end-score {
    font-size: 72px;
    font-weight: 900;
    font-family: monospace;
    color: #e2e8f0;
    line-height: 1;
  }
  .end-score-max {
    font-size: 24px;
    color: #475569;
    font-family: monospace;
  }
  .end-tier-label {
    font-size: 20px;
    font-weight: 700;
    font-family: monospace;
    letter-spacing: 0.06em;
  }
  .end-msg {
    font-size: 14px;
    color: #94a3b8;
    text-align: center;
    max-width: 380px;
    margin: 0;
    line-height: 1.5;
  }

  /* ---- PERCENTILE ---- */
  .percentile-loading {
    font-size: 12px;
    color: #475569;
    font-family: ui-monospace, Consolas, monospace;
    letter-spacing: 0.04em;
    padding: 4px 0;
  }
  .percentile-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #0f172a;
    border: 1px solid #1e3a5f;
    border-radius: 8px;
    padding: 10px 18px;
  }
  .percentile-icon {
    font-size: 16px;
    line-height: 1;
  }
  .percentile-text {
    font-family: ui-monospace, Consolas, monospace;
    font-size: 13px;
    font-weight: 600;
    color: #60a5fa;
    letter-spacing: 0.03em;
  }

  .share-preview {
    background: #0f1117;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 12px 16px;
    width: 100%;
    max-width: 440px;
  }
  .share-text {
    margin: 0;
    font-family: monospace;
    font-size: 12px;
    color: #94a3b8;
    white-space: pre-wrap;
    line-height: 1.55;
  }

  /* ---- BUTTONS ---- */
  .btn-primary {
    background: #1d4ed8;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 12px 20px;
    min-height: 44px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-primary:hover { background: #2563eb; }

  .btn-share {
    background: #065f46;
    color: #d1fae5;
    border: 1px solid #047857;
    border-radius: 6px;
    padding: 12px 22px;
    min-height: 44px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-share:hover { background: #047857; }

  .btn-secondary {
    background: transparent;
    color: #60a5fa;
    border: 1px solid #1e3a5f;
    border-radius: 6px;
    padding: 10px 18px;
    min-height: 44px;
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .btn-secondary:hover { border-color: #2563eb; }

  .end-actions { margin-top: 6px; }

  @media (max-width: 480px) {
    .end-score { font-size: 52px; }
    .end-score-max { font-size: 18px; }
  }
</style>
