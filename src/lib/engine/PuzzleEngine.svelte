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
  let revealVisible = $state(false);

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

  // EV bar max for normalization (max abs EV value)
  function parseEV(str: string): number {
    const match = str.match(/[-+]?\d+\.?\d*/);
    return match ? parseFloat(match[0]) : 0;
  }
  const evValues = $derived(puzzle.options.map((o: PuzzleOptionSchema) => Math.abs(parseEV(o.ev_delta))));
  const evMax = $derived(Math.max(...evValues, 0.1));

  function evBarPercent(opt: PuzzleOptionSchema): number {
    return Math.min(100, (Math.abs(parseEV(opt.ev_delta)) / evMax) * 100);
  }

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
    // Trigger reveal animation after a tick
    setTimeout(() => { revealVisible = true; }, 50);
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
    revealVisible = false;
    stopTimer();
  }

  // Tier to label map for display
  function tierGrade(tier: OptionTier): string {
    switch (tier) {
      case "optimal":    return "S";
      case "acceptable": return "A";
      case "couteux":    return "C";
      case "faute":      return "X";
    }
  }
</script>

<div class="engine">

  <!-- ===== INTRO ===== -->
  {#if phase === "intro"}
    <div class="phase-intro fade-in">
      <div class="meta-row">
        <span class="badge map">{puzzle.map.toUpperCase()}</span>
        <span class="badge theme">{puzzle.theme.toUpperCase()}</span>
        <span class="badge side">{puzzle.side}</span>
        <span class="badge diff">
          {#each Array.from({ length: puzzle.difficulty_est }) as _}
            <span class="diff-star">★</span>
          {/each}
          {#each Array.from({ length: 5 - puzzle.difficulty_est }) as _}
            <span class="diff-star empty">★</span>
          {/each}
        </span>
        {#if puzzle.validation.status === "draft"}
          <span
            class="badge beta"
            title="Answers sourced from pro guides — Immortal+ judge review in progress"
          >Community beta</span>
        {/if}
      </div>
      <PuzzleHUD state={puzzle.round_state} side={puzzle.side} />
      <div class="board-section">
        <PuzzleBoard positions={puzzle.positions} mapId={puzzle.map} />
      </div>
      <div class="question-box">
        <div class="question-tag">SITUATION</div>
        <p class="question">{puzzle.question}</p>
      </div>
      <button class="btn-primary" tabindex="0" onclick={startPuzzle}>
        <span class="btn-icon">▶</span>
        <span>Start (30s timer)</span>
      </button>
    </div>

  <!-- ===== PLAYING ===== -->
  {:else if phase === "playing"}
    <div class="phase-playing fade-in">
      <div class="meta-row">
        <span class="badge map">{puzzle.map.toUpperCase()}</span>
        <span class="badge theme">{puzzle.theme.toUpperCase()}</span>
        <span class="badge side">{puzzle.side}</span>
        <div class="timer-wrap" class:urgent={timer <= 10}>
          <!-- Timer arc (SVG progress ring) -->
          <svg class="timer-svg" viewBox="0 0 40 40" width="40" height="40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="#1e293b" stroke-width="3" />
            <circle
              cx="20" cy="20" r="16"
              fill="none"
              stroke={timer <= 10 ? "#FF4655" : "#00D4AA"}
              stroke-width="3"
              stroke-dasharray={`${(timer / 30) * 100.5} 100.5`}
              stroke-dashoffset="0"
              stroke-linecap="round"
              transform="rotate(-90 20 20)"
              style="transition: stroke-dasharray 1s linear, stroke 0.3s;"
            />
            <text x="20" y="24" text-anchor="middle" font-size="11" fill={timer <= 10 ? "#FF4655" : "#e2e8f0"} font-family="monospace" font-weight="700">{timer}</text>
          </svg>
        </div>
      </div>
      <PuzzleHUD state={puzzle.round_state} side={puzzle.side} />
      <div class="board-section">
        <PuzzleBoard positions={puzzle.positions} mapId={puzzle.map} />
      </div>
      <div class="question-box">
        <div class="question-tag">WHAT DO YOU DO?</div>
        <p class="question">{puzzle.question}</p>
      </div>
      <div class="options-grid">
        {#each shuffledOrder as originalIdx, displayIdx}
          {@const opt = puzzle.options[originalIdx]}
          <button
            class="option-btn"
            style="animation-delay: {displayIdx * 60}ms"
            onclick={() => choose(originalIdx)}
          >
            <span class="opt-letter">{String.fromCharCode(65 + displayIdx)}</span>
            <span class="opt-label">{opt.label}</span>
            <span class="opt-arrow">→</span>
          </button>
        {/each}
      </div>
    </div>

  <!-- ===== REVEAL ===== -->
  {:else if phase === "reveal" && chosenOption}
    <div class="phase-reveal" class:reveal-visible={revealVisible}>
      <!-- Tier reveal header — IMPACT MOMENT -->
      <div class="tier-impact" style="--tier-c: {tierColor(chosenOption.tier)}">
        <div class="tier-grade-wrap">
          <div class="tier-grade" style="color: {tierColor(chosenOption.tier)}; border-color: {tierColor(chosenOption.tier)}40; box-shadow: 0 0 30px {tierColor(chosenOption.tier)}30">
            {tierGrade(chosenOption.tier)}
          </div>
        </div>
        <div class="tier-info">
          <div class="tier-name" style="color: {tierColor(chosenOption.tier)}">{tierLabel(chosenOption.tier)}</div>
          <div class="tier-score">{userScore}<span class="tier-score-max">/1000</span></div>
        </div>
        <div class="tier-freq">
          <div class="freq-label">Radiant pick rate</div>
          <div class="freq-value" style="color: {tierColor(chosenOption.tier)}">{chosenOption.freq_elite_estimee}%</div>
        </div>
      </div>

      <!-- Chosen option card -->
      <div class="reveal-card" style="--tier-color: {tierColor(chosenOption.tier)}">
        <div class="chosen-label-row">
          <span class="chosen-tag">YOUR PICK</span>
          <span class="ev-chip" class:ev-pos={parseEV(chosenOption.ev_delta) > 0} class:ev-neg={parseEV(chosenOption.ev_delta) < 0}>
            EV {chosenOption.ev_delta}
          </span>
        </div>
        <p class="chosen-label">"{chosenOption.label}"</p>
        <p class="short-expl">{chosenOption.explication_courte}</p>
      </div>

      <!-- Optimal (if different from chosen) -->
      {#if chosenOption.tier !== "optimal"}
        <div class="optimal-card">
          <div class="optimal-header">
            <span class="optimal-tag">RADIANT CHOICE</span>
            <span class="optimal-freq">{optimalOption.freq_elite_estimee}% of pros</span>
          </div>
          <p class="optimal-action">{optimalOption.label}</p>
          <p class="short-expl muted">{optimalOption.explication_courte}</p>
        </div>
      {/if}

      <!-- EV table with colored bars -->
      <div class="ev-table">
        <div class="ev-table-title">
          <span class="ev-table-icon">◈</span>
          EV par option
        </div>
        {#each puzzle.options as opt, i}
          {@const barW = evBarPercent(opt)}
          {@const color = tierColor(opt.tier)}
          {@const isChosen = opt === chosenOption}
          <div class="ev-bar-row" class:is-chosen={isChosen} style="animation-delay: {i * 80 + 200}ms">
            <div class="ev-bar-left">
              <span class="ev-tier-label" style="color: {color}; border-color: {color}40; background: {color}12">{tierGrade(opt.tier)}</span>
              <span class="ev-opt-label" class:ev-chosen-text={isChosen}>{opt.label.slice(0, 50)}{opt.label.length > 50 ? "…" : ""}</span>
            </div>
            <div class="ev-bar-track">
              <div
                class="ev-bar-fill"
                style="width: {barW}%; background: {color}; box-shadow: 0 0 8px {color}50; --bar-target: {barW}%"
              ></div>
            </div>
            <span class="ev-value" style="color: {color}">{opt.ev_delta}</span>
          </div>
        {/each}
      </div>

      <!-- Long explanation -->
      <details class="long-expl-details">
        <summary>
          <span class="summary-icon">▸</span>
          Full breakdown
        </summary>
        <p class="long-expl">{puzzle.explication_longue}</p>
      </details>

      <div class="reveal-actions">
        <button class="btn-primary" onclick={goEnd}>
          <span class="btn-icon">◆</span>
          Final score
        </button>
      </div>
    </div>

  <!-- ===== END ===== -->
  {:else if phase === "end"}
    <div class="phase-end fade-in">
      <!-- Score hero -->
      <div class="end-hero">
        <div class="end-score-wrap score-pop">
          <div class="end-score" style="color: {chosenOption ? tierColor(chosenOption.tier) : '#e2e8f0'}">{userScore}</div>
          <div class="end-score-max">/1000</div>
        </div>
        {#if chosenOption}
          <div class="end-tier-badge" style="color: {tierColor(chosenOption.tier)}; border-color: {tierColor(chosenOption.tier)}40; background: {tierColor(chosenOption.tier)}12; box-shadow: 0 0 20px {tierColor(chosenOption.tier)}20">
            {tierLabel(chosenOption.tier)}
          </div>
        {/if}
      </div>

      {#if chosenOption}
        {#if chosenOption.tier === "optimal"}
          <p class="end-msg end-msg--success">Radiant-level read. That's the call.</p>
        {:else if chosenOption.tier === "acceptable"}
          <p class="end-msg">Viable — but there was a sharper line. Check the Radiant pick.</p>
        {:else if chosenOption.tier === "couteux"}
          <p class="end-msg end-msg--warn">Costly read — {chosenOption.ev_delta} EV lost. Recheck the breakdown.</p>
        {:else}
          <p class="end-msg end-msg--error">Tactical mistake. Every rep sharpens the read.</p>
        {/if}
      {/if}

      <!-- Percentile widget -->
      {#if percentileFetching}
        <div class="percentile-loading">
          <span class="loading-dots">···</span>
          Calculating daily rank
        </div>
      {:else if percentileResult}
        <div class="percentile-badge">
          <span class="percentile-icon">◆</span>
          <span class="percentile-text">{formatPercentile(percentileResult)}</span>
        </div>
      {/if}

      <!-- Share preview -->
      <div class="share-preview">
        <div class="share-preview-label">SHARE RESULT</div>
        <pre class="share-text">{buildShareText()}</pre>
      </div>

      <div class="end-btns">
        <button class="btn-share" onclick={copyShare}>
          <span class="btn-icon">{copySuccess ? "✓" : "⎘"}</span>
          {copySuccess ? "Copied!" : "Copy result"}
        </button>
        <button class="btn-secondary" onclick={resetPuzzle}>
          ↩ Replay
        </button>
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
    gap: 16px;
    color: #e2e8f0;
    font-family: 'Inter', system-ui, sans-serif;
  }

  .fade-in {
    animation: fade-slide-up 0.3s ease both;
  }

  /* ---- SHARED ---- */
  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .badge {
    font-family: 'Space Grotesk', monospace;
    font-size: 11px;
    letter-spacing: 0.07em;
    border-radius: 5px;
    padding: 3px 9px;
    border: 1px solid;
    font-weight: 600;
  }
  .badge.map   { background: #0f1b2d; color: #60a5fa; border-color: #1e3a5f; }
  .badge.theme { background: #0d1f17; color: #34d399; border-color: #064e3b; }
  .badge.side  { background: #1a0d24; color: #c084fc; border-color: #4c1d95; }
  .badge.diff  {
    background: #1c1308;
    border-color: #713f12;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 3px 7px;
  }
  .diff-star      { color: #fbbf24; font-size: 10px; }
  .diff-star.empty { color: #2d2009; }
  .badge.beta  { background: #0f172a; color: #64748b; border-color: #1e293b; cursor: help; }

  /* ---- TIMER ---- */
  .timer-wrap {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .timer-svg { display: block; }
  .timer-wrap.urgent .timer-svg {
    filter: drop-shadow(0 0 8px rgba(255,70,85,0.5));
  }

  /* ---- BOARD ---- */
  .board-section { margin: 4px 0; }

  /* ---- QUESTION ---- */
  .question-box {
    background: linear-gradient(135deg, #0f172a 0%, #0d1520 100%);
    border: 1px solid #1e3a5f;
    border-radius: 10px;
    padding: 16px 18px;
    position: relative;
    overflow: hidden;
  }
  .question-box::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #00D4AA60, transparent);
  }
  .question-tag {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #00D4AA;
    margin-bottom: 10px;
    opacity: 0.9;
  }
  .question {
    margin: 0;
    font-size: 15px;
    line-height: 1.6;
    color: #e2e8f0;
    font-weight: 500;
  }

  /* ---- OPTIONS ---- */
  .options-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .option-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    background: linear-gradient(135deg, #0f1117 0%, #111520 100%);
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 14px 16px;
    color: #cbd5e1;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.45;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.15s, box-shadow 0.2s;
    width: 100%;
    animation: fade-slide-up 0.3s ease both;
    position: relative;
    overflow: hidden;
  }
  .option-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.02));
    pointer-events: none;
  }
  .option-btn:hover {
    border-color: #00D4AA60;
    background: linear-gradient(135deg, #101820 0%, #0f1a20 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(0,212,170,0.12);
    color: #e2e8f0;
  }
  .option-btn:active {
    transform: translateY(0);
  }
  .opt-letter {
    font-family: 'Space Grotesk', monospace;
    font-weight: 800;
    font-size: 16px;
    color: #00D4AA;
    min-width: 22px;
    text-align: center;
    flex-shrink: 0;
  }
  .opt-label { flex: 1; }
  .opt-arrow {
    color: #334155;
    font-size: 14px;
    flex-shrink: 0;
    transition: color 0.2s, transform 0.2s;
  }
  .option-btn:hover .opt-arrow {
    color: #00D4AA;
    transform: translateX(3px);
  }

  /* ---- REVEAL ---- */
  .phase-reveal {
    display: flex;
    flex-direction: column;
    gap: 14px;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .phase-reveal.reveal-visible {
    opacity: 1;
  }

  /* Tier impact header */
  .tier-impact {
    display: flex;
    align-items: center;
    gap: 16px;
    background: linear-gradient(135deg, #0d1015 0%, #111520 100%);
    border: 1px solid var(--tier-c, #334155);
    border-radius: 12px;
    padding: 16px 20px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04);
    animation: tier-reveal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  .tier-grade-wrap {
    flex-shrink: 0;
  }
  .tier-grade {
    width: 54px;
    height: 54px;
    border-radius: 12px;
    border: 2px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Space Grotesk', monospace;
    font-size: 28px;
    font-weight: 900;
    letter-spacing: -0.02em;
    animation: score-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
  }
  .tier-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .tier-name {
    font-family: 'Space Grotesk', monospace;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .tier-score {
    font-family: 'Space Grotesk', monospace;
    font-size: 28px;
    font-weight: 900;
    color: #e2e8f0;
    letter-spacing: -0.02em;
    line-height: 1;
    animation: score-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
  }
  .tier-score-max {
    font-size: 14px;
    color: #475569;
    font-weight: 500;
  }
  .tier-freq {
    flex-shrink: 0;
    text-align: right;
  }
  .freq-label {
    font-size: 10px;
    font-family: 'Space Grotesk', monospace;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: #475569;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .freq-value {
    font-family: 'Space Grotesk', monospace;
    font-size: 20px;
    font-weight: 900;
  }

  /* Chosen card */
  .reveal-card {
    background: linear-gradient(135deg, #0f1117 0%, #111520 100%);
    border: 1px solid var(--tier-color, #334155);
    border-radius: 10px;
    padding: 16px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.3);
  }
  .chosen-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .chosen-tag {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #475569;
  }
  .ev-chip {
    font-family: 'Space Grotesk', monospace;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 5px;
    border: 1px solid #1e293b;
    background: #0f1117;
    color: #94a3b8;
  }
  .ev-chip.ev-pos { color: #34d399; border-color: #064e3b; background: #022c20; }
  .ev-chip.ev-neg { color: #f87171; border-color: #7f1d1d; background: #1c0808; }
  .chosen-label {
    font-size: 14px;
    font-style: italic;
    color: #94a3b8;
    margin: 0 0 10px;
    line-height: 1.4;
  }
  .short-expl {
    font-size: 13px;
    line-height: 1.55;
    color: #cbd5e1;
    margin: 0;
  }
  .short-expl.muted { color: #94a3b8; }

  /* Optimal card */
  .optimal-card {
    background: linear-gradient(135deg, #071510 0%, #091a0f 100%);
    border: 1px solid #14532d;
    border-radius: 10px;
    padding: 14px 16px;
    position: relative;
    overflow: hidden;
  }
  .optimal-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #00D4AA80, transparent);
  }
  .optimal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .optimal-tag {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #00D4AA;
  }
  .optimal-freq {
    font-family: 'Space Grotesk', monospace;
    font-size: 11px;
    color: #34d399;
    font-weight: 600;
  }
  .optimal-action {
    font-size: 14px;
    color: #d1fae5;
    margin: 0 0 8px;
    font-weight: 600;
    line-height: 1.4;
  }

  /* EV table with bars */
  .ev-table {
    background: linear-gradient(135deg, #0f1117 0%, #111520 100%);
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ev-table-title {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #475569;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
  }
  .ev-table-icon {
    color: #00D4AA;
    opacity: 0.7;
  }
  .ev-bar-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    animation: fade-slide-up 0.3s ease both;
    padding: 8px 10px;
    border-radius: 7px;
    border: 1px solid transparent;
    transition: border-color 0.2s;
  }
  .ev-bar-row.is-chosen {
    background: rgba(255,255,255,0.02);
    border-color: #1e293b;
  }
  .ev-bar-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ev-tier-label {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 800;
    padding: 1px 6px;
    border-radius: 4px;
    border: 1px solid;
    min-width: 22px;
    text-align: center;
    flex-shrink: 0;
  }
  .ev-opt-label {
    font-size: 12px;
    color: #64748b;
    flex: 1;
    line-height: 1.3;
  }
  .ev-chosen-text { color: #cbd5e1; font-weight: 600; }
  .ev-bar-track {
    height: 4px;
    background: #1e293b;
    border-radius: 4px;
    overflow: hidden;
    margin: 0 0 0 30px;
  }
  .ev-bar-fill {
    height: 100%;
    border-radius: 4px;
    animation: bar-fill 0.6s cubic-bezier(0.4, 0, 0.2, 1) both;
    animation-delay: inherit;
  }
  .ev-value {
    font-family: 'Space Grotesk', monospace;
    font-size: 12px;
    font-weight: 700;
    text-align: right;
    flex-shrink: 0;
    margin-left: auto;
  }

  /* Long explanation */
  .long-expl-details {
    background: #0f1117;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 12px 16px;
  }
  .long-expl-details summary {
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    color: #60a5fa;
    font-family: 'Space Grotesk', monospace;
    letter-spacing: 0.04em;
    list-style: none;
    display: flex;
    align-items: center;
    gap: 8px;
    user-select: none;
  }
  .long-expl-details summary::-webkit-details-marker { display: none; }
  .long-expl-details[open] .summary-icon { transform: rotate(90deg); }
  .summary-icon { transition: transform 0.2s; }
  .long-expl {
    margin: 12px 0 0;
    font-size: 13px;
    line-height: 1.65;
    color: #94a3b8;
    white-space: pre-wrap;
  }

  .reveal-actions { display: flex; justify-content: flex-end; margin-top: 4px; }

  /* ---- END ---- */
  .phase-end {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 24px 0;
  }
  .end-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .end-score-wrap {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .score-pop {
    animation: score-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  .end-score {
    font-size: 80px;
    font-weight: 900;
    font-family: 'Space Grotesk', monospace;
    line-height: 1;
    letter-spacing: -0.03em;
    filter: drop-shadow(0 0 20px currentColor);
  }
  .end-score-max {
    font-size: 24px;
    color: #334155;
    font-family: 'Space Grotesk', monospace;
    font-weight: 700;
  }
  .end-tier-badge {
    font-family: 'Space Grotesk', monospace;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 6px 18px;
    border-radius: 8px;
    border: 1px solid;
    animation: tier-reveal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
  }
  .end-msg {
    font-size: 15px;
    color: #94a3b8;
    text-align: center;
    max-width: 380px;
    margin: 0;
    line-height: 1.55;
    font-weight: 500;
  }
  .end-msg--success { color: #34d399; }
  .end-msg--warn    { color: #f97316; }
  .end-msg--error   { color: #f87171; }

  /* ---- PERCENTILE ---- */
  .percentile-loading {
    font-size: 12px;
    color: #475569;
    font-family: 'Space Grotesk', monospace;
    letter-spacing: 0.04em;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .loading-dots {
    animation: pulse-ring 1s ease-in-out infinite;
    color: #00D4AA;
  }
  .percentile-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    background: linear-gradient(135deg, #0f172a 0%, #0d1520 100%);
    border: 1px solid #1e3a5f;
    border-radius: 10px;
    padding: 12px 20px;
    box-shadow: 0 4px 20px rgba(0,212,170,0.08);
  }
  .percentile-icon {
    font-size: 16px;
    color: #00D4AA;
    line-height: 1;
  }
  .percentile-text {
    font-family: 'Space Grotesk', monospace;
    font-size: 14px;
    font-weight: 700;
    color: #60a5fa;
    letter-spacing: 0.03em;
  }

  /* Share */
  .share-preview {
    background: linear-gradient(135deg, #0f1117 0%, #111520 100%);
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 14px 18px;
    width: 100%;
    max-width: 440px;
  }
  .share-preview-label {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #334155;
    margin-bottom: 10px;
  }
  .share-text {
    margin: 0;
    font-family: var(--mono);
    font-size: 12px;
    color: #94a3b8;
    white-space: pre-wrap;
    line-height: 1.6;
  }

  /* ---- BUTTONS ---- */
  .btn-primary {
    background: linear-gradient(135deg, #FF4655 0%, #cc2d3a 100%);
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 13px 24px;
    min-height: 48px;
    font-size: 14px;
    font-weight: 700;
    font-family: 'Space Grotesk', system-ui, sans-serif;
    letter-spacing: 0.03em;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 16px rgba(255,70,85,0.3);
  }
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(255,70,85,0.45);
    filter: brightness(1.08);
  }
  .btn-primary:active { transform: translateY(0); }

  .btn-share {
    background: linear-gradient(135deg, #00D4AA 0%, #009980 100%);
    color: #0b0d14;
    border: none;
    border-radius: 10px;
    padding: 13px 24px;
    min-height: 48px;
    font-size: 14px;
    font-weight: 700;
    font-family: 'Space Grotesk', system-ui, sans-serif;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 16px rgba(0,212,170,0.3);
  }
  .btn-share:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(0,212,170,0.45);
    filter: brightness(1.06);
  }

  .btn-secondary {
    background: transparent;
    color: #64748b;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 12px 20px;
    min-height: 48px;
    font-size: 14px;
    font-weight: 600;
    font-family: 'Space Grotesk', system-ui, sans-serif;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
  }
  .btn-secondary:hover {
    border-color: #334155;
    color: #94a3b8;
  }

  .btn-icon { font-size: 13px; }

  .end-btns {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: 100%;
    max-width: 320px;
  }
  .end-btns .btn-share,
  .end-btns .btn-secondary {
    width: 100%;
    justify-content: center;
  }

  @media (max-width: 480px) {
    .end-score { font-size: 60px; }
    .end-score-max { font-size: 20px; }
    .tier-impact { gap: 12px; padding: 14px 14px; }
    .tier-grade { width: 46px; height: 46px; font-size: 24px; }
    .tier-score { font-size: 24px; }
  }
</style>
