<script lang="ts">
  // TheatreOverlay — Full-viewport theatre mode for video puzzles
  // Calqué MOBA Trainer : vidéo plein écran, tous les éléments en overlay sur la vidéo.
  // Not endorsed by Riot Games.
  import type { PuzzleSchema, PuzzleOptionSchema, OptionTier } from "./puzzle_types.js";
  import { computeScore, tierLabel, tierColor } from "./puzzle_types.js";
  import { initSfx, getMuted, setMuted, playSfxTick, playSfxGrade } from "./replay/sfx.js";
  import { recordResult } from "../progress.js";
  import { onMount } from "svelte";

  const { puzzle, onComplete, onExit, onNext } = $props<{
    puzzle: PuzzleSchema;
    onComplete?: () => void;
    onExit: () => void;
    onNext?: () => void;
  }>();

  // ── Types ─────────────────────────────────────────────────────────────────
  type TPhase = "intro" | "question" | "grade_flash" | "reveal" | "end";

  // ── State ────────────────────────────────────────────────────────────────
  let phase = $state<TPhase>("intro");
  let chosenIndex = $state<number | null>(null);
  let timer = $state<number>(15);
  let timerActive = $state(false);
  let sfxMuted = $state(false);
  let copySuccess = $state(false);
  let gradeGrade = $state<"S" | "A" | "C" | "X">("S");

  // Video audio — separate from SFX mute
  // Default: unmuted at 0.8 (game audio is the experience)
  // Persisted in localStorage so user preference survives sessions
  const VIDEO_MUTE_KEY = "dueliq_video_muted";
  let videoMuted = $state<boolean>(false);
  let videoBlocked = $state(false); // true when browser autoplay blocked audio

  // Video elements
  let introVideoEl = $state<HTMLVideoElement | null>(null);
  let resolutionVideoEl = $state<HTMLVideoElement | null>(null);

  const BASE = import.meta.env.BASE_URL;

  function resolveUrl(url: string): string {
    if (url.startsWith("http") || url.startsWith("/")) return url;
    return `${BASE}${url}`;
  }

  const video = puzzle.video!;
  const introSrc = resolveUrl(video.intro_url);
  const resolutionSrc = resolveUrl(video.resolution_url);
  const freezeSrc = resolveUrl(video.freeze_frame_url);

  const chosenOption = $derived<PuzzleOptionSchema | null>(
    chosenIndex !== null ? puzzle.options[chosenIndex] : null
  );

  const optimalOption = $derived<PuzzleOptionSchema>(
    puzzle.options.find((o: PuzzleOptionSchema) => o.tier === "optimal") ?? puzzle.options[0]
  );

  const userScore = $derived(chosenOption ? computeScore(chosenOption.tier) : 0);

  // ── Timer ────────────────────────────────────────────────────────────────
  let timerHandle: ReturnType<typeof setInterval> | null = null;

  function startTimer() {
    if (timerHandle) return;
    timerActive = true;
    timerHandle = setInterval(() => {
      if (timer <= 0) { stopTimer(); return; }
      timer--;
      if (timer <= 5) playSfxTick();
    }, 1000);
  }

  function stopTimer() {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
    timerActive = false;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  onMount(() => {
    initSfx();
    sfxMuted = getMuted();
    // Restore video mute preference
    try {
      const stored = localStorage.getItem(VIDEO_MUTE_KEY);
      videoMuted = stored === "true";
    } catch { videoMuted = false; }
    // Lock scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      stopTimer();
    };
  });

  // ESC to exit
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") handleExit();
  }

  // Sync video volume/mute whenever state changes or element appears
  $effect(() => {
    const vol = videoMuted ? 0 : 0.8;
    if (introVideoEl) {
      introVideoEl.volume = vol;
      introVideoEl.muted = videoMuted;
    }
    if (resolutionVideoEl) {
      resolutionVideoEl.volume = vol;
      resolutionVideoEl.muted = videoMuted;
    }
  });

  // Auto-play resolution video when phase switches to reveal
  $effect(() => {
    if (phase === "reveal" && resolutionVideoEl) {
      resolutionVideoEl.currentTime = 0;
      resolutionVideoEl.volume = videoMuted ? 0 : 0.8;
      resolutionVideoEl.muted = videoMuted;
      resolutionVideoEl.play().catch(() => {});
    }
  });

  // ── Actions ──────────────────────────────────────────────────────────────

  function handleIntroEnded() {
    phase = "question";
    timer = 15;
    startTimer();
  }

  function choose(idx: number) {
    if (phase !== "question") return;
    stopTimer();
    chosenIndex = idx;
    const tier = puzzle.options[idx].tier;
    gradeGrade = tierToGrade(tier);
    phase = "grade_flash";
    playSfxGrade(gradeGrade);
    setTimeout(() => {
      phase = "reveal";
    }, 1400);
  }

  function tierToGrade(tier: OptionTier): "S" | "A" | "C" | "X" {
    switch (tier) {
      case "optimal":    return "S";
      case "acceptable": return "A";
      case "couteux":    return "C";
      case "faute":      return "X";
    }
  }

  function goEnd() {
    phase = "end";
    // Persist result to localStorage progress
    if (chosenOption) {
      const tier = chosenOption.tier;
      const grade = (() => {
        switch (tier) {
          case "optimal": return "S" as const;
          case "acceptable": return "A" as const;
          case "couteux": return "C" as const;
          default: return "X" as const;
        }
      })();
      recordResult({
        puzzle: puzzle.id,
        tier,
        grade,
        score: userScore,
        theme: puzzle.theme,
        map: puzzle.map,
        date: new Date().toISOString(),
      });
    }
    onComplete?.();
  }

  function handleExit() {
    stopTimer();
    onExit();
  }

  function toggleMute() {
    sfxMuted = !sfxMuted;
    setMuted(sfxMuted);
  }

  function toggleVideoMute() {
    videoMuted = !videoMuted;
    videoBlocked = false;
    try { localStorage.setItem(VIDEO_MUTE_KEY, String(videoMuted)); } catch {}
  }

  // Called from video onplay — clear blocked state once audio actually starts
  function onVideoPlay() {
    videoBlocked = false;
  }

  // Called when autoplay is blocked by browser (DOMException name: NotAllowedError)
  function onIntroPlayError(err: unknown) {
    const domErr = err as DOMException;
    if (domErr?.name === "NotAllowedError") {
      // Mute and retry so video still plays visually; show tap-to-unmute hint
      if (introVideoEl) {
        introVideoEl.muted = true;
        introVideoEl.play().catch(() => {});
        videoBlocked = true;
      }
    }
  }

  function userUnblock() {
    videoMuted = false;
    videoBlocked = false;
    try { localStorage.setItem(VIDEO_MUTE_KEY, "false"); } catch {}
    if (introVideoEl) {
      introVideoEl.muted = false;
      introVideoEl.volume = 0.8;
    }
    if (resolutionVideoEl) {
      resolutionVideoEl.muted = false;
      resolutionVideoEl.volume = 0.8;
    }
  }

  function parseEV(str: string): number {
    const match = str.match(/[-+]?\d+\.?\d*/);
    return match ? parseFloat(match[0]) : 0;
  }

  const evValues = $derived(puzzle.options.map((o: PuzzleOptionSchema) => Math.abs(parseEV(o.ev_delta))));
  const evMax = $derived(Math.max(...evValues, 0.1));

  function evBarPercent(opt: PuzzleOptionSchema): number {
    return Math.min(100, (Math.abs(parseEV(opt.ev_delta)) / evMax) * 100);
  }

  const gradeColors: Record<string, string> = {
    S: "#22c55e", A: "#eab308", C: "#f97316", X: "#ef4444",
  };

  // Randomize options (same seed as PuzzleEngine)
  const shuffledOrder = $derived.by(() => {
    const indices = puzzle.options.map((_: PuzzleOptionSchema, i: number) => i);
    const seed = puzzle.id.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = (seed * (i + 1)) % (i + 1);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  });

  async function copyShare() {
    const lines = [
      `DuelIQ — ${puzzle.id} | ${puzzle.map.toUpperCase()} VIDEO PUZZLE`,
      `Score: ${userScore}/1000  ${chosenOption ? tierLabel(chosenOption.tier) : ""}`,
      "anistaar.github.io/dueliq",
    ];
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      copySuccess = true;
      setTimeout(() => { copySuccess = false; }, 2000);
    } catch {
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
</script>

<!-- Trap keyboard events for ESC -->
<svelte:window onkeydown={handleKeydown} />

<div class="theatre" role="dialog" aria-modal="true" aria-label="Video puzzle theatre mode">

  <!-- ── VIDEO LAYER (always present as background) ── -->
  <div class="video-layer">

    <!-- INTRO VIDEO -->
    {#if phase === "intro"}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        bind:this={introVideoEl}
        class="theatre-video fade-in"
        src={introSrc}
        autoplay
        playsinline
        onended={handleIntroEnded}
        onplay={onVideoPlay}
        oncanplay={(e) => {
          const v = e.currentTarget as HTMLVideoElement;
          if (!v) return;
          v.volume = videoMuted ? 0 : 0.8;
          v.muted = videoMuted;
          v.play().catch((err: DOMException) => {
            if (err?.name === 'NotAllowedError') {
              v.muted = true;
              v.play().catch(() => {});
              videoBlocked = true;
            }
          });
        }}
      ></video>

    <!-- QUESTION — freeze frame as bg -->
    {:else if phase === "question" || phase === "grade_flash"}
      <img class="theatre-video fade-in" src={freezeSrc} alt="Game situation freeze frame" />

    <!-- REVEAL — resolution video loops -->
    {:else if phase === "reveal" || phase === "end"}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        bind:this={resolutionVideoEl}
        class="theatre-video fade-in"
        src={resolutionSrc}
        loop
        playsinline
        onplay={onVideoPlay}
      ></video>
    {/if}

    <!-- Vignette to ensure readability of overlays on any frame -->
    <div class="vignette" class:vignette--heavy={phase === "question" || phase === "reveal" || phase === "end"}></div>
  </div>

  <!-- ── CONTROLS (always visible) ── -->
  <button class="btn-exit" onclick={handleExit} title="Exit theatre (Esc)" aria-label="Exit">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
    </svg>
  </button>

  <!-- Video audio toggle (game sound) -->
  <button class="btn-mute" onclick={toggleVideoMute} title={videoMuted ? "Unmute game audio" : "Mute game audio"} aria-label="toggle game audio">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      {#if videoMuted}
        <path d="M2 4.5h3l4-3v11l-4-3H2V4.5Z" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linejoin="round"/>
        <line x1="10" y1="5" x2="13" y2="9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <line x1="13" y1="5" x2="10" y2="9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      {:else}
        <path d="M2 4.5h3l4-3v11l-4-3H2V4.5Z" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linejoin="round"/>
        <path d="M11 4.5c.9.7 1.5 1.8 1.5 3s-.6 2.3-1.5 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>
      {/if}
    </svg>
  </button>

  <!-- Map + mode badges (top left) -->
  <div class="theatre-badges">
    <span class="tbadge tbadge--map">{puzzle.map.toUpperCase()}</span>
    <span class="tbadge tbadge--theme">{puzzle.theme.toUpperCase()}</span>
    <span class="tbadge tbadge--side">{puzzle.side}</span>
    <span class="tbadge tbadge--video">VIDEO</span>
  </div>

  <!-- Tap-to-unmute fallback (browser blocked autoplay with audio) -->
  {#if videoBlocked}
    <button class="tap-unmute fade-in" onclick={userUnblock} aria-label="Tap to enable game audio">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M2 4.5h3l4-3v11l-4-3H2V4.5Z" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linejoin="round"/><line x1="10" y1="5" x2="13" y2="9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="13" y1="5" x2="10" y2="9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      <span class="tap-unmute-text">Tap for sound</span>
    </button>
  {/if}

  <!-- ── PHASE OVERLAYS ── -->

  <!-- INTRO hint (bottom of screen) -->
  {#if phase === "intro"}
    <div class="intro-hint fade-in">
      <span class="hint-dot"></span>
      Watch the situation — what would you do?
    </div>
  {/if}

  <!-- QUESTION overlay — centered on desktop, stacked on portrait mobile -->
  {#if phase === "question"}
    <div class="question-layer fade-in">
      <!-- Question banner (top of the centred block) -->
      <div class="q-banner">
        <div class="q-tag">WHAT DO YOU DO?</div>
        <p class="q-text">{puzzle.question}</p>
      </div>

      <!-- Timer row (sits just above the cards grid) -->
      <div class="timer-row">
        <svg class="timer-svg" viewBox="0 0 40 40" width="40" height="40">
          <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="3" />
          <circle
            cx="20" cy="20" r="16"
            fill="none"
            stroke={timer <= 5 ? "#FF4655" : "#00D4AA"}
            stroke-width="3"
            stroke-dasharray="{(timer / 15) * 100.5} 100.5"
            stroke-dashoffset="0"
            stroke-linecap="round"
            transform="rotate(-90 20 20)"
            style="transition: stroke-dasharray 1s linear, stroke 0.3s;"
          />
          <text x="20" y="24" text-anchor="middle" font-size="11"
            fill={timer <= 5 && timerActive ? "#FF4655" : "#e2e8f0"}
            font-family="monospace" font-weight="700">{timer > 0 ? timer : "—"}</text>
        </svg>
        <span class="timer-label" class:urgent={timer <= 5 && timerActive}>
          {timer > 0 ? `${timer}s` : "Make your call"}
        </span>
      </div>

      <!-- Choices -->
      <div class="choices">
        {#each shuffledOrder as originalIdx, displayIdx}
          {@const opt = puzzle.options[originalIdx]}
          <button
            class="choice-btn"
            style="animation-delay: {displayIdx * 60}ms"
            onclick={() => choose(originalIdx)}
            disabled={chosenIndex !== null}
          >
            <span class="choice-letter">{String.fromCharCode(65 + displayIdx)}</span>
            <span class="choice-label">{opt.label}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- GRADE FLASH (full overlay) -->
  {#if phase === "grade_flash" && chosenOption}
    <div class="grade-flash-overlay fade-in">
      <div class="grade-splash" style="--gc: {gradeColors[gradeGrade]}">
        <div class="grade-letter" style="color: {gradeColors[gradeGrade]}">{gradeGrade}</div>
        <div class="grade-tier" style="color: {gradeColors[gradeGrade]}">{tierLabel(chosenOption.tier)}</div>
        <div class="grade-score">{userScore}<span class="grade-max">/1000</span></div>
      </div>
    </div>
  {/if}

  <!-- REVEAL — resolution panel overlay (bottom + scrollable) -->
  {#if phase === "reveal" && chosenOption}
    <div class="reveal-layer fade-in">
      <!-- Tier badge -->
      <div class="reveal-header" style="--tc: {tierColor(chosenOption.tier)}">
        <div class="reveal-grade" style="color:{tierColor(chosenOption.tier)}; border-color:{tierColor(chosenOption.tier)}40">
          {tierToGrade(chosenOption.tier)}
        </div>
        <div class="reveal-info">
          <div class="reveal-tier-name" style="color:{tierColor(chosenOption.tier)}">{tierLabel(chosenOption.tier)}</div>
          <div class="reveal-score">{userScore}<span class="reveal-score-max">/1000</span></div>
        </div>
        <div class="reveal-pick-label">YOUR PICK</div>
      </div>

      <!-- Short explanation -->
      <p class="reveal-short">{chosenOption.explication_courte}</p>

      <!-- Optimal (if missed) -->
      {#if chosenOption.tier !== "optimal"}
        <div class="reveal-optimal">
          <span class="optimal-tag">RADIANT CHOICE</span>
          <span class="optimal-freq">{optimalOption.freq_elite_estimee}% of pros</span>
          <p class="optimal-label">{optimalOption.label}</p>
        </div>
      {/if}

      <!-- EV table -->
      <div class="ev-table">
        <div class="ev-title">EV BREAKDOWN</div>
        {#each puzzle.options as opt, i}
          {@const color = tierColor(opt.tier)}
          {@const barW = evBarPercent(opt)}
          {@const isChosen = opt === chosenOption}
          <div class="ev-row" class:is-chosen={isChosen} style="animation-delay:{i*80}ms">
            <span class="ev-grade" style="color:{color};border-color:{color}40;background:{color}12">{tierToGrade(opt.tier)}</span>
            <span class="ev-label" class:ev-chosen={isChosen}>{opt.label.slice(0,45)}{opt.label.length>45?"…":""}</span>
            <div class="ev-bar-track">
              <div class="ev-bar-fill" style="width:{barW}%;background:{color}"></div>
            </div>
            <span class="ev-val" style="color:{color}">{opt.ev_delta}</span>
          </div>
        {/each}
      </div>

      <!-- Full analysis (collapsible) -->
      <details class="full-analysis">
        <summary>Full analysis ▸</summary>
        <p class="analysis-text">{puzzle.explication_longue}</p>
      </details>

      <!-- Credit (mandatory CC-BY) -->
      <div class="credit-line">
        © Footage: <a href={video.license_url ?? "#"} target="_blank" rel="noopener">{video.credit}</a> — {video.license}
      </div>

      <!-- CTA -->
      <button class="btn-final" onclick={goEnd}>
        Final score →
      </button>
    </div>
  {/if}

  <!-- END (score + share) -->
  {#if phase === "end"}
    <div class="end-overlay fade-in">
      <div class="end-score-wrap">
        <div class="end-score" style="color:{chosenOption ? tierColor(chosenOption.tier) : '#e2e8f0'}">{userScore}</div>
        <div class="end-score-max">/1000</div>
      </div>
      {#if chosenOption}
        <div class="end-tier" style="color:{tierColor(chosenOption.tier)};border-color:{tierColor(chosenOption.tier)}40;background:{tierColor(chosenOption.tier)}12">
          {tierLabel(chosenOption.tier)}
        </div>
        {#if chosenOption.tier === "optimal"}
          <p class="end-msg end-msg--success">Radiant-level read. That's the call.</p>
        {:else if chosenOption.tier === "acceptable"}
          <p class="end-msg">Viable — but there was a sharper line.</p>
        {:else if chosenOption.tier === "couteux"}
          <p class="end-msg end-msg--warn">Costly read — {chosenOption.ev_delta} EV lost.</p>
        {:else}
          <p class="end-msg end-msg--error">Tactical mistake. Every rep sharpens the read.</p>
        {/if}
      {/if}
      <div class="end-btns">
        {#if onNext}
          <button class="btn-next-puzzle" onclick={onNext} data-testid="btn-next-puzzle">
            Next puzzle →
          </button>
        {/if}
        <button class="btn-share" onclick={copyShare}>
          {copySuccess ? "Copied!" : "Copy result"}
        </button>
        <button class="btn-exit-end" onclick={handleExit}>
          ↩ Back
        </button>
      </div>
    </div>
  {/if}

  <!-- Mobile rotation hint (portrait only, non-blocking) -->
  <div class="rotate-hint" aria-hidden="true">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M4 4v16h16V4H4zm0 0l4-4m12 4l4-4" stroke-linecap="round"/>
    </svg>
    Rotate for best view
  </div>

</div>

<style>
  /* ── THEATRE SHELL ── */
  .theatre {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: #000;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* ── VIDEO LAYER ── */
  .video-layer {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .theatre-video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #000;
    display: block;
  }

  /* Vignette — helps text readability on any frame */
  .vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, rgba(0,0,0,0.45) 100%),
      linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 35%);
    transition: opacity 0.3s;
  }
  .vignette--heavy {
    background:
      radial-gradient(ellipse 80% 60% at 50% 50%, transparent 20%, rgba(0,0,0,0.55) 100%),
      linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 50%),
      linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 20%);
  }

  /* ── QUESTION LAYER — centred over the video on desktop/landscape ── */
  .question-layer {
    /* Desktop default: absolute, dead-centre of the theatre */
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 60;
    width: min(720px, 80vw);
    padding: 20px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    /* Opaque panel — no glassmorphism */
    background: rgba(11,16,22,0.92);
    border: 1px solid #2A3441;
    border-top: 2px solid #FF4655;
    clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     PORTRAIT MOBILE — stacked layout (video top, panel below, no overlap)
     Only active on narrow portrait screens (phones).
     Desktop / landscape: untouched (absolute overlay layout preserved).
  ───────────────────────────────────────────────────────────────────────── */
  @media (max-width: 700px) {
    /* Switch the theatre root to a normal column flow */
    .theatre {
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    /* Video layer becomes a static block at the top, 16:9 width-locked */
    .video-layer {
      position: relative;
      inset: unset;
      width: 100%;
      /* 16:9 ratio = 56.25% of width, plus safe-area top */
      padding-top: max(env(safe-area-inset-top, 0px), 0px);
      flex-shrink: 0;
      aspect-ratio: 16 / 9;
      background: #000;
    }

    /* The <video> / <img> fills its container naturally */
    .theatre-video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* Vignette: no bottom gradient in stacked mode (panel is below, not on top) */
    .vignette,
    .vignette--heavy {
      background:
        radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, rgba(0,0,0,0.35) 100%),
        linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 25%);
    }

    /* Question layer: back in normal flow, stacked below video */
    .question-layer {
      position: relative;
      top: unset;
      left: unset;
      right: unset;
      transform: none;
      width: 100%;
      max-height: none;
      overflow-y: auto;
      overscroll-behavior: contain;
      background: rgba(11,16,22,0.98);
      border: none;
      border-top: 2px solid #FF4655;
      clip-path: none;
      flex: 1;
      padding: 16px 16px max(env(safe-area-inset-bottom, 16px), 16px);
    }

    /* Choices single-column in portrait */
    .choices {
      grid-template-columns: 1fr;
    }

    /* Reveal layer: out of absolute flow, stacked below video */
    .reveal-layer {
      position: relative;
      bottom: unset;
      left: unset;
      right: unset;
      max-height: none;
      overflow-y: auto;
      overscroll-behavior: contain;
      background: rgba(11,16,22,0.98);
      flex: 1;
      padding-bottom: max(env(safe-area-inset-bottom, 16px), 16px);
    }

    /* Grade flash: keep centered over full screen (brief, no content shift) */
    .grade-flash-overlay {
      position: fixed;
    }

    /* End overlay: keep centered full-screen */
    .end-overlay {
      position: fixed;
    }

    /* Intro hint: in portrait stacked layout, render as a normal flow block
       centered below the video, not absolute */
    .intro-hint {
      position: relative;
      bottom: unset;
      left: unset;
      transform: none;
      align-self: center;
      margin-top: 12px;
    }

    /* Controls: keep top-right absolute on-screen */
    .btn-exit,
    .btn-mute {
      position: fixed;
    }

    .theatre-badges {
      position: fixed;
    }

    /* Hide rotate hint — layout is already optimised for portrait */
    .rotate-hint {
      display: none !important;
    }
  }

  /* ── GLOBAL CONTROLS ── */
  .btn-exit {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 100;
    width: 36px;
    height: 36px;
    background: rgba(11,16,22,0.9);
    border: 1px solid #2A3441;
    color: #ECE8E1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
  }
  .btn-exit:hover { background: #FF4655; border-color: #FF4655; }

  .btn-mute {
    position: absolute;
    top: 14px;
    right: 58px;
    z-index: 100;
    background: rgba(11,16,22,0.9);
    border: 1px solid #2A3441;
    color: #ECE8E1;
    padding: 6px 10px;
    cursor: pointer;
    transition: background 0.1s;
    height: 36px;
    display: flex;
    align-items: center;
  }
  .btn-mute:hover { background: rgba(42,52,65,0.9); }

  /* ── BADGES (top left) ── */
  .theatre-badges {
    position: absolute;
    top: 14px;
    left: 14px;
    z-index: 100;
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .tbadge {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 2px 8px;
    border: 1px solid #2A3441;
    background: rgba(11,16,22,0.92);
    color: #7B8FA1;
  }
  .tbadge--video { background: #FF4655; color: #ECE8E1; border-color: #FF4655; }

  /* ── INTRO HINT ── */
  .intro-hint {
    position: absolute;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(236,232,225,0.8);
    background: rgba(11,16,22,0.9);
    border: 1px solid #2A3441;
    padding: 8px 16px;
    white-space: nowrap;
  }
  .hint-dot {
    width: 6px;
    height: 6px;
    background: #FF4655;
    flex-shrink: 0;
    animation: pulse-dot 1.5s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  /* Timer row */
  .timer-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .timer-svg { display: block; flex-shrink: 0; }
  .timer-label {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(236,232,225,0.7);
    transition: color 0.3s;
  }
  .timer-label.urgent { color: #FF4655; }

  /* Question banner */
  .q-banner {
    background: #0F1923;
    border: 1px solid #2A3441;
    padding: 12px 16px;
  }
  .q-tag {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #7B8FA1;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .q-text {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #ECE8E1;
    line-height: 1.5;
    margin: 0;
  }
  @media (min-width: 800px) { .q-text { font-size: 16px; } }

  /* Choices — always 2×2 inside the centred card on desktop */
  .choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .choice-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #1C2127;
    border: 1px solid #2A3441;
    padding: 11px 14px;
    color: #ECE8E1;
    text-align: left;
    cursor: pointer;
    font-size: 13px;
    font-family: 'Inter', system-ui, sans-serif;
    font-weight: 500;
    line-height: 1.4;
    min-height: 48px;
    transition: border-color 0.1s, background 0.1s;
    animation: slide-up 0.3s ease both;
    width: 100%;
  }
  .choice-btn:hover:not(:disabled) {
    border-color: #FF4655;
    background: #FF465510;
  }
  .choice-btn:disabled { cursor: default; opacity: 0.55; }

  .choice-letter {
    font-family: 'Anton', Impact, sans-serif;
    font-size: 16px;
    font-weight: 400;
    color: #FF4655;
    flex-shrink: 0;
    min-width: 20px;
    text-transform: uppercase;
  }
  .choice-label { flex: 1; }

  /* ── GRADE FLASH ── */
  .grade-flash-overlay {
    position: absolute;
    inset: 0;
    z-index: 80;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.82);
  }
  .grade-splash {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    animation: grade-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes grade-pop {
    from { opacity: 0; transform: scale(0.5); }
    to   { opacity: 1; transform: scale(1); }
  }
  .grade-letter {
    font-family: 'Anton', Impact, sans-serif;
    font-size: clamp(80px, 18vw, 160px);
    font-weight: 400;
    line-height: 1;
    text-transform: uppercase;
    /* No glow — the colour is sufficient */
  }
  .grade-tier {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .grade-score {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 32px;
    font-weight: 800;
    color: #ECE8E1;
    letter-spacing: -0.02em;
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
  }
  .grade-max { font-size: 18px; color: #7B8FA1; font-weight: 600; font-feature-settings: "tnum"; font-variant-numeric: tabular-nums; }

  /* ── REVEAL LAYER ── */
  .reveal-layer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 70;
    max-height: 65vh;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 16px 16px 28px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: rgba(11,16,22,0.98);
    border-top: 2px solid #FF4655;
  }
  @media (min-width: 800px) { .reveal-layer { padding: 20px 48px 32px; } }
  @media (min-width: 1200px) { .reveal-layer { padding: 24px 15% 40px; } }

  /* Custom scrollbar for the reveal panel */
  .reveal-layer::-webkit-scrollbar { width: 3px; }
  .reveal-layer::-webkit-scrollbar-track { background: transparent; }
  .reveal-layer::-webkit-scrollbar-thumb { background: #2A3441; }

  .reveal-header {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #1C2127;
    border: 1px solid var(--tc, #2A3441);
    padding: 12px 16px;
    clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
  }
  .reveal-grade {
    width: 48px;
    height: 48px;
    border: 2px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Anton', Impact, sans-serif;
    font-size: 26px;
    font-weight: 400;
    flex-shrink: 0;
    text-transform: uppercase;
  }
  .reveal-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .reveal-tier-name {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .reveal-score {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: #ECE8E1;
    line-height: 1;
    letter-spacing: -0.02em;
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
  }
  .reveal-score-max { font-size: 14px; color: #7B8FA1; font-weight: 600; font-feature-settings: "tnum"; font-variant-numeric: tabular-nums; }
  .reveal-pick-label {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #7B8FA1;
    align-self: flex-start;
    text-transform: uppercase;
  }

  .reveal-short {
    font-size: 14px;
    color: #ECE8E1;
    line-height: 1.55;
    margin: 0;
    padding: 0 2px;
  }

  .reveal-optimal {
    background: #1C2127;
    border: 1px solid #2A3441;
    border-left: 2px solid #00D4AA;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .optimal-tag {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #00D4AA;
    text-transform: uppercase;
  }
  .optimal-freq {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 11px;
    color: #00D4AA;
    font-weight: 600;
  }
  .optimal-label {
    font-size: 14px;
    color: #ECE8E1;
    margin: 0;
    font-weight: 600;
    line-height: 1.4;
  }

  /* EV table */
  .ev-table {
    background: #1C2127;
    border: 1px solid #2A3441;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ev-title {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #7B8FA1;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .ev-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 6px;
    border: 1px solid transparent;
    animation: slide-up 0.3s ease both;
    transition: border-color 0.1s;
  }
  .ev-row.is-chosen { background: #0F1923; border-color: #2A3441; }
  .ev-grade {
    font-family: 'Anton', Impact, sans-serif;
    font-size: 11px;
    font-weight: 400;
    text-transform: uppercase;
    padding: 1px 6px;
    border: 1px solid;
    min-width: 22px;
    text-align: center;
    flex-shrink: 0;
  }
  .ev-label { font-size: 12px; color: #7B8FA1; flex: 1; line-height: 1.3; }
  .ev-label.ev-chosen { color: #ECE8E1; font-weight: 600; }
  .ev-bar-track { width: 60px; height: 2px; background: #2A3441; overflow: hidden; flex-shrink: 0; }
  .ev-bar-fill { height: 100%; animation: bar-fill 0.6s ease both; animation-delay: inherit; }
  @keyframes bar-fill { from { width: 0% !important; } }
  .ev-val { font-family: 'Inter', system-ui, sans-serif; font-size: 11px; font-weight: 800; flex-shrink: 0; min-width: 36px; text-align: right; font-feature-settings: "tnum"; font-variant-numeric: tabular-nums; }

  /* Full analysis */
  .full-analysis {
    background: #1C2127;
    border: 1px solid #2A3441;
    padding: 10px 14px;
  }
  .full-analysis summary {
    cursor: pointer;
    font-size: 11px;
    font-weight: 700;
    color: #7B8FA1;
    font-family: 'Inter', system-ui, sans-serif;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    list-style: none;
    user-select: none;
  }
  .full-analysis summary::-webkit-details-marker { display: none; }
  .analysis-text {
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 1.65;
    color: #7B8FA1;
    white-space: pre-wrap;
  }

  /* Credit line */
  .credit-line {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    color: #4A5568;
    line-height: 1.5;
    letter-spacing: 0.04em;
  }
  .credit-line a { color: #7B8FA1; text-decoration: underline; }
  .credit-line a:hover { color: #ECE8E1; }

  /* Final CTA */
  .btn-final {
    align-self: flex-end;
    background: #FF4655;
    color: #ECE8E1;
    border: none;
    padding: 12px 24px;
    min-height: 48px;
    font-size: 12px;
    font-weight: 700;
    font-family: 'Inter', system-ui, sans-serif;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
    margin-top: 4px;
    clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  }
  .btn-final:hover { background: #ECE8E1; color: #FF4655; }

  /* ── END OVERLAY ── */
  .end-overlay {
    position: absolute;
    inset: 0;
    z-index: 80;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: rgba(11,16,22,0.96);
    padding: 32px 24px;
  }
  .end-score-wrap {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .end-score {
    font-family: 'Anton', Impact, sans-serif;
    font-size: clamp(64px, 15vw, 100px);
    font-weight: 400;
    line-height: 1;
    animation: grade-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
    text-transform: uppercase;
    /* No drop-shadow — raw colour is stronger */
  }
  .end-score-max {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 24px;
    color: #4A5568;
    font-weight: 800;
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
  }
  .end-tier {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 5px 16px;
    border: 1px solid;
  }
  .end-msg {
    font-size: 14px;
    color: #7B8FA1;
    text-align: center;
    max-width: 380px;
    margin: 0;
    line-height: 1.55;
    font-weight: 500;
  }
  .end-msg--success { color: #00D4AA; }
  .end-msg--warn    { color: #f97316; }
  .end-msg--error   { color: #f87171; }

  .end-btns {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
    max-width: 300px;
  }
  .btn-share {
    background: transparent;
    color: #ECE8E1;
    border: 1px solid #2A3441;
    padding: 13px 24px;
    min-height: 48px;
    width: 100%;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-family: 'Inter', system-ui, sans-serif;
    cursor: pointer;
    transition: border-color 0.1s, color 0.1s;
  }
  .btn-share:hover { border-color: #FF4655; color: #FF4655; }
  .btn-next-puzzle {
    background: #FF4655;
    color: #ECE8E1;
    border: none;
    padding: 14px 24px;
    min-height: 52px;
    width: 100%;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-family: 'Inter', system-ui, sans-serif;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
    clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  }
  .btn-next-puzzle:hover {
    background: #ECE8E1;
    color: #FF4655;
  }
  .btn-exit-end {
    background: transparent;
    color: #7B8FA1;
    border: 1px solid #2A3441;
    padding: 12px 20px;
    min-height: 48px;
    width: 100%;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-family: 'Inter', system-ui, sans-serif;
    cursor: pointer;
    transition: border-color 0.1s, color 0.1s;
  }
  .btn-exit-end:hover { border-color: #2A3441; color: #ECE8E1; }

  /* ── TAP-TO-UNMUTE ── */
  .tap-unmute {
    position: absolute;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(11,16,22,0.95);
    border: 1px solid #2A3441;
    padding: 9px 20px;
    color: #ECE8E1;
    font-size: 12px;
    font-family: 'Inter', system-ui, sans-serif;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.1s, border-color 0.1s;
    animation: tap-bounce 2s ease-in-out infinite;
  }
  .tap-unmute:hover { border-color: #FF4655; }
  .tap-unmute-text { letter-spacing: 0.1em; }
  /* tap-bounce replaced by opacity pulse — bounce on interactive element banned (S14) */
  @keyframes tap-bounce {
    0%, 100% { opacity: 1; transform: translateX(-50%); }
    50% { opacity: 0.7; transform: translateX(-50%); }
  }

  /* ── MOBILE ROTATION HINT ── */
  .rotate-hint {
    position: absolute;
    bottom: 8px;
    right: 12px;
    z-index: 30;
    display: none;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: rgba(236,232,225,0.3);
    font-family: 'Inter', system-ui, sans-serif;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    pointer-events: none;
  }
  /* Only show in portrait on narrow screens */
  @media (max-width: 500px) and (orientation: portrait) {
    .rotate-hint { display: flex; }
  }

  /* ── FADE IN ── */
  .fade-in {
    animation: fade-in 0.25s ease both;
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @keyframes slide-up {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
