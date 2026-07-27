<script lang="ts">
  // TheatreOverlay — Full-viewport theatre mode for video puzzles
  // Calqué MOBA Trainer : vidéo plein écran, tous les éléments en overlay sur la vidéo.
  // Not endorsed by Riot Games.
  import type { PuzzleSchema, PuzzleOptionSchema, OptionTier } from "./puzzle_types.js";
  import { computeScore, tierLabel, tierColor } from "./puzzle_types.js";
  import { initSfx, getMuted, setMuted, playSfxTick, playSfxGrade } from "./replay/sfx.js";
  import { onMount } from "svelte";

  const { puzzle, onComplete, onExit } = $props<{
    puzzle: PuzzleSchema;
    onComplete?: () => void;
    onExit: () => void;
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
    {videoMuted ? "🔇" : "🔊"}
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
      <span class="tap-unmute-icon">🔇</span>
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
        <button class="btn-share" onclick={copyShare}>
          {copySuccess ? "✓ Copied!" : "⎘ Copy result"}
        </button>
        <button class="btn-exit-end" onclick={handleExit}>
          ↩ Back to landing
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
      linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 45%),
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
    /* dark translucent glass card */
    background: rgba(8, 10, 18, 0.82);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 14px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.6);
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
      /* keep the same glass card style, just full-width */
      background: rgba(11,13,20,0.97);
      backdrop-filter: none;
      border: none;
      border-radius: 0;
      box-shadow: none;
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
      background: #0b0d14;
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
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(0,0,0,0.55);
    border: 1px solid rgba(255,255,255,0.15);
    color: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    backdrop-filter: blur(8px);
    transition: background 0.2s, border-color 0.2s;
  }
  .btn-exit:hover { background: rgba(255,70,85,0.35); border-color: #FF4655; }

  .btn-mute {
    position: absolute;
    top: 14px;
    right: 62px;
    z-index: 100;
    background: rgba(0,0,0,0.55);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    color: #e2e8f0;
    font-size: 14px;
    padding: 6px 10px;
    cursor: pointer;
    backdrop-filter: blur(8px);
  }
  .btn-mute:hover { background: rgba(0,0,0,0.75); }

  /* ── BADGES (top left) ── */
  .theatre-badges {
    position: absolute;
    top: 14px;
    left: 14px;
    z-index: 100;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .tbadge {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 3px 8px;
    border-radius: 5px;
    border: 1px solid;
    backdrop-filter: blur(8px);
  }
  .tbadge--map   { background: rgba(15,27,45,0.8);  color: #60a5fa; border-color: #1e3a5f; }
  .tbadge--theme { background: rgba(13,31,23,0.8);  color: #34d399; border-color: #064e3b; }
  .tbadge--side  { background: rgba(26,13,36,0.8);  color: #c084fc; border-color: #4c1d95; }
  .tbadge--video { background: rgba(26,10,15,0.8);  color: #FF4655; border-color: #7f1d1d; }

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
    font-family: 'Space Grotesk', monospace;
    font-size: 13px;
    font-weight: 600;
    color: rgba(255,255,255,0.75);
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.12);
    padding: 8px 16px;
    border-radius: 20px;
    white-space: nowrap;
  }
  .hint-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
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
    font-family: 'Space Grotesk', monospace;
    font-size: 13px;
    font-weight: 700;
    color: rgba(255,255,255,0.7);
    transition: color 0.3s;
  }
  .timer-label.urgent { color: #FF4655; }

  /* Question banner */
  .q-banner {
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 12px 16px;
  }
  .q-tag {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #00D4AA;
    margin-bottom: 6px;
  }
  .q-text {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #e2e8f0;
    line-height: 1.5;
    margin: 0;
  }
  @media (min-width: 800px) { .q-text { font-size: 16px; } }

  /* Choices — always 2×2 inside the centred card on desktop */
  .choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .choice-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(15,17,26,0.75);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    padding: 11px 14px;
    color: #e2e8f0;
    text-align: left;
    cursor: pointer;
    font-size: 13px;
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-weight: 500;
    line-height: 1.4;
    min-height: 48px;
    transition: border-color 0.2s, background 0.2s, transform 0.15s;
    animation: slide-up 0.3s ease both;
    width: 100%;
  }
  .choice-btn:hover:not(:disabled) {
    border-color: #00D4AA;
    background: rgba(0,212,170,0.15);
    transform: translateY(-2px);
  }
  .choice-btn:disabled { cursor: default; opacity: 0.55; }

  .choice-letter {
    font-family: 'Space Grotesk', monospace;
    font-size: 15px;
    font-weight: 800;
    color: #00D4AA;
    flex-shrink: 0;
    min-width: 20px;
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
    background: rgba(0,0,0,0.65);
    backdrop-filter: blur(4px);
  }
  .grade-splash {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    animation: grade-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes grade-pop {
    from { opacity: 0; transform: scale(0.5); }
    to   { opacity: 1; transform: scale(1); }
  }
  .grade-letter {
    font-family: 'Space Grotesk', monospace;
    font-size: clamp(80px, 18vw, 160px);
    font-weight: 900;
    line-height: 1;
    filter: drop-shadow(0 0 40px var(--gc));
  }
  .grade-tier {
    font-family: 'Space Grotesk', monospace;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .grade-score {
    font-family: 'Space Grotesk', monospace;
    font-size: 36px;
    font-weight: 900;
    color: #e2e8f0;
  }
  .grade-max { font-size: 20px; color: #64748b; font-weight: 500; }

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
    background: linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.88) 70%, transparent 100%);
  }
  @media (min-width: 800px) { .reveal-layer { padding: 20px 48px 32px; } }
  @media (min-width: 1200px) { .reveal-layer { padding: 24px 15% 40px; } }

  /* Custom scrollbar for the reveal panel */
  .reveal-layer::-webkit-scrollbar { width: 4px; }
  .reveal-layer::-webkit-scrollbar-track { background: transparent; }
  .reveal-layer::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }

  .reveal-header {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(0,0,0,0.5);
    border: 1px solid var(--tc, #334155);
    border-radius: 10px;
    padding: 12px 16px;
    backdrop-filter: blur(8px);
  }
  .reveal-grade {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    border: 2px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Space Grotesk', monospace;
    font-size: 26px;
    font-weight: 900;
    flex-shrink: 0;
  }
  .reveal-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .reveal-tier-name {
    font-family: 'Space Grotesk', monospace;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .reveal-score {
    font-family: 'Space Grotesk', monospace;
    font-size: 26px;
    font-weight: 900;
    color: #e2e8f0;
    line-height: 1;
  }
  .reveal-score-max { font-size: 14px; color: #475569; font-weight: 500; }
  .reveal-pick-label {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #475569;
    align-self: flex-start;
  }

  .reveal-short {
    font-size: 13px;
    color: #cbd5e1;
    line-height: 1.55;
    margin: 0;
    padding: 0 2px;
  }

  .reveal-optimal {
    background: rgba(7,21,16,0.8);
    border: 1px solid #14532d;
    border-radius: 8px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    backdrop-filter: blur(6px);
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
  .optimal-label {
    font-size: 13px;
    color: #d1fae5;
    margin: 0;
    font-weight: 600;
    line-height: 1.4;
  }

  /* EV table */
  .ev-table {
    background: rgba(15,17,26,0.75);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    backdrop-filter: blur(6px);
  }
  .ev-title {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #475569;
    margin-bottom: 2px;
  }
  .ev-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 6px;
    border-radius: 6px;
    border: 1px solid transparent;
    animation: slide-up 0.3s ease both;
    transition: border-color 0.2s;
  }
  .ev-row.is-chosen { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
  .ev-grade {
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
  .ev-label { font-size: 12px; color: #64748b; flex: 1; line-height: 1.3; }
  .ev-label.ev-chosen { color: #cbd5e1; font-weight: 600; }
  .ev-bar-track { width: 60px; height: 3px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; flex-shrink: 0; }
  .ev-bar-fill { height: 100%; border-radius: 3px; animation: bar-fill 0.6s ease both; animation-delay: inherit; }
  @keyframes bar-fill { from { width: 0% !important; } }
  .ev-val { font-family: 'Space Grotesk', monospace; font-size: 11px; font-weight: 700; flex-shrink: 0; min-width: 36px; text-align: right; }

  /* Full analysis */
  .full-analysis {
    background: rgba(15,17,26,0.7);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    padding: 10px 14px;
    backdrop-filter: blur(6px);
  }
  .full-analysis summary {
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: #60a5fa;
    font-family: 'Space Grotesk', monospace;
    letter-spacing: 0.04em;
    list-style: none;
    user-select: none;
  }
  .full-analysis summary::-webkit-details-marker { display: none; }
  .analysis-text {
    margin: 10px 0 0;
    font-size: 12px;
    line-height: 1.65;
    color: #94a3b8;
    white-space: pre-wrap;
  }

  /* Credit line */
  .credit-line {
    font-family: ui-monospace, Consolas, monospace;
    font-size: 10px;
    color: #334155;
    line-height: 1.5;
  }
  .credit-line a { color: #475569; text-decoration: underline; }
  .credit-line a:hover { color: #64748b; }

  /* Final CTA */
  .btn-final {
    align-self: flex-end;
    background: linear-gradient(135deg, #FF4655 0%, #cc2d3a 100%);
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 12px 24px;
    min-height: 48px;
    font-size: 14px;
    font-weight: 700;
    font-family: 'Space Grotesk', system-ui, sans-serif;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(255,70,85,0.3);
    transition: transform 0.15s, box-shadow 0.15s;
    margin-top: 4px;
  }
  .btn-final:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(255,70,85,0.45); }

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
    background: rgba(0,0,0,0.82);
    backdrop-filter: blur(8px);
    padding: 32px 24px;
  }
  .end-score-wrap {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .end-score {
    font-family: 'Space Grotesk', monospace;
    font-size: clamp(64px, 15vw, 100px);
    font-weight: 900;
    line-height: 1;
    filter: drop-shadow(0 0 20px currentColor);
    animation: grade-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  .end-score-max {
    font-family: 'Space Grotesk', monospace;
    font-size: 28px;
    color: #334155;
    font-weight: 700;
  }
  .end-tier {
    font-family: 'Space Grotesk', monospace;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 6px 18px;
    border-radius: 8px;
    border: 1px solid;
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

  .end-btns {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: 100%;
    max-width: 300px;
  }
  .btn-share {
    background: linear-gradient(135deg, #00D4AA 0%, #009980 100%);
    color: #0b0d14;
    border: none;
    border-radius: 10px;
    padding: 13px 24px;
    min-height: 48px;
    width: 100%;
    font-size: 14px;
    font-weight: 700;
    font-family: 'Space Grotesk', system-ui, sans-serif;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,212,170,0.3);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .btn-share:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,212,170,0.45); }
  .btn-exit-end {
    background: transparent;
    color: #64748b;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 12px 20px;
    min-height: 48px;
    width: 100%;
    font-size: 14px;
    font-weight: 600;
    font-family: 'Space Grotesk', system-ui, sans-serif;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
  }
  .btn-exit-end:hover { border-color: #334155; color: #94a3b8; }

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
    background: rgba(0,0,0,0.72);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 24px;
    padding: 9px 20px;
    color: #e2e8f0;
    font-size: 13px;
    font-family: 'Space Grotesk', monospace;
    font-weight: 600;
    cursor: pointer;
    backdrop-filter: blur(8px);
    white-space: nowrap;
    transition: background 0.2s, border-color 0.2s;
    animation: tap-bounce 2s ease-in-out infinite;
  }
  .tap-unmute:hover { background: rgba(0,212,170,0.25); border-color: #00D4AA; }
  .tap-unmute-icon { font-size: 16px; }
  .tap-unmute-text { letter-spacing: 0.04em; }
  @keyframes tap-bounce {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(-4px); }
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
    color: rgba(255,255,255,0.35);
    font-family: 'Space Grotesk', monospace;
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
