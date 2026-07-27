<script lang="ts">
  // VideoEngine — Video-based puzzle experience
  // Plays intro clip → freeze frame + question → answer → resolution clip + explanation
  // Not endorsed by Riot Games.
  import type { VideoPuzzle, PuzzleOptionSchema } from "./puzzle_types.js";
  import { computeScore, tierLabel, tierColor } from "./puzzle_types.js";

  const {
    video,
    question,
    options,
    explication_longue,
    onChoose,
    chosenIndex,
    phase,
    onIntroEnded,
  } = $props<{
    video: VideoPuzzle;
    question: string;
    options: PuzzleOptionSchema[];
    explication_longue: string;
    onChoose: (idx: number) => void;
    chosenIndex: number | null;
    /** "intro" | "question" | "grade_flash" | "reveal" */
    phase: "intro" | "question" | "grade_flash" | "reveal";
    onIntroEnded: () => void;
  }>();

  const BASE = import.meta.env.BASE_URL;

  // Resolve URLs — support both absolute and BASE-relative paths
  function resolveUrl(url: string): string {
    if (url.startsWith("http") || url.startsWith("/")) return url;
    return `${BASE}${url}`;
  }

  const introSrc = $derived(resolveUrl(video.intro_url));
  const resolutionSrc = $derived(resolveUrl(video.resolution_url));
  const freezeSrc = $derived(resolveUrl(video.freeze_frame_url));

  let introVideoEl = $state<HTMLVideoElement | null>(null);
  let resolutionVideoEl = $state<HTMLVideoElement | null>(null);
  let gradeFlashDone = $state(false);

  // Video audio: default unmuted at 0.8, localStorage-backed
  const VIDEO_MUTE_KEY = "dueliq_video_muted";
  let videoMuted = $state<boolean>(false);
  let videoBlocked = $state(false);

  function initVideoMute() {
    try {
      const s = localStorage.getItem(VIDEO_MUTE_KEY);
      videoMuted = s === "true";
    } catch { videoMuted = false; }
  }
  // Run on mount via $effect
  $effect(() => { initVideoMute(); });

  function toggleVideoMute() {
    videoMuted = !videoMuted;
    videoBlocked = false;
    try { localStorage.setItem(VIDEO_MUTE_KEY, String(videoMuted)); } catch {}
    [introVideoEl, resolutionVideoEl].forEach(v => {
      if (v) { v.muted = videoMuted; v.volume = videoMuted ? 0 : 0.8; }
    });
  }

  function handleVideoBlocked(v: HTMLVideoElement) {
    v.muted = true;
    v.play().catch(() => {});
    videoBlocked = true;
  }

  function userUnblock() {
    videoMuted = false;
    videoBlocked = false;
    try { localStorage.setItem(VIDEO_MUTE_KEY, "false"); } catch {}
    [introVideoEl, resolutionVideoEl].forEach(v => {
      if (v) { v.muted = false; v.volume = 0.8; }
    });
  }

  const chosenOption = $derived<PuzzleOptionSchema | null>(
    chosenIndex !== null ? options[chosenIndex] : null
  );

  function handleIntroEnded() {
    onIntroEnded();
  }

  // Auto-play resolution video when phase switches to reveal
  $effect(() => {
    if (phase === "reveal" && resolutionVideoEl) {
      resolutionVideoEl.currentTime = 0;
      resolutionVideoEl.volume = videoMuted ? 0 : 0.8;
      resolutionVideoEl.muted = videoMuted;
      resolutionVideoEl.play().catch(() => {});
    }
  });
</script>

<div class="ve-root">

  <!-- ===== INTRO VIDEO (phase: intro) ===== -->
  {#if phase === "intro"}
    <div class="ve-intro fade-in">
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        bind:this={introVideoEl}
        class="ve-video"
        src={introSrc}
        autoplay
        playsinline
        onended={handleIntroEnded}
        oncanplay={(e) => {
          const v = e.currentTarget as HTMLVideoElement;
          if (!v) return;
          v.volume = videoMuted ? 0 : 0.8;
          v.muted = videoMuted;
          v.play().catch((err: DOMException) => {
            if (err?.name === 'NotAllowedError') handleVideoBlocked(v);
          });
        }}
      ></video>
      <div class="ve-intro-hint">
        <span class="ve-hint-dot"></span>
        Watch the situation — what would you do?
        <button class="ve-vol-btn" onclick={toggleVideoMute} title={videoMuted ? "Unmute" : "Mute"}>
          {videoMuted ? "🔇" : "🔊"}
        </button>
      </div>
      {#if videoBlocked}
        <button class="ve-tap-unmute" onclick={userUnblock}>🔇 Tap for sound</button>
      {/if}
    </div>

  <!-- ===== FREEZE FRAME + QUESTION (phase: question) ===== -->
  {:else if phase === "question"}
    <div class="ve-question fade-in">
      <div class="ve-freeze-wrapper">
        <img class="ve-freeze" src={freezeSrc} alt="Game situation freeze frame" />
        <div class="ve-freeze-badge">PAUSE — Make your call</div>
      </div>
      <div class="ve-options-panel">
        <p class="ve-question-text">{question}</p>
        <div class="ve-options">
          {#each options as opt, i}
            <button
              class="ve-option {chosenIndex === i ? 'chosen' : ''}"
              onclick={() => onChoose(i)}
              disabled={chosenIndex !== null}
            >
              <span class="ve-opt-label">{opt.label}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>

  <!-- ===== GRADE FLASH (phase: grade_flash) ===== -->
  {:else if phase === "grade_flash"}
    <div class="ve-grade-flash fade-in">
      <img class="ve-freeze ve-freeze--dimmed" src={freezeSrc} alt="Freeze frame" />
      {#if chosenOption}
        <div class="ve-grade-overlay" style="--grade-color: {tierColor(chosenOption.tier)}">
          <div class="ve-grade-label">{tierLabel(chosenOption.tier)}</div>
          <div class="ve-grade-sub">{chosenOption.explication_courte}</div>
        </div>
      {/if}
    </div>

  <!-- ===== RESOLUTION VIDEO + EXPLANATION (phase: reveal) ===== -->
  {:else if phase === "reveal"}
    <div class="ve-reveal fade-in">
      <div class="ve-resolution-wrapper">
        <!-- svelte-ignore a11y_media_has_caption -->
        <video
          bind:this={resolutionVideoEl}
          class="ve-video"
          src={resolutionSrc}
          loop
          playsinline
        ></video>
        <div class="ve-resolution-badge">What actually happened</div>
      </div>

      {#if chosenOption}
        <div class="ve-result-panel">
          <div class="ve-result-tier" style="color: {tierColor(chosenOption.tier)}">
            {tierLabel(chosenOption.tier)} — {chosenOption.ev_delta}
          </div>
          <p class="ve-result-expl">{chosenOption.explication_courte}</p>
        </div>
      {/if}

      <div class="ve-explanation">
        <h4 class="ve-expl-title">Full analysis</h4>
        <p class="ve-expl-text">{explication_longue}</p>
      </div>

      <!-- Credit attribution — mandatory per CC-BY license -->
      <div class="ve-credit">
        <span class="ve-credit-icon">©</span>
        <span class="ve-credit-text">
          Footage: <a href={video.license_url ?? '#'} target="_blank" rel="noopener">{video.credit}</a>
          — {video.license}
        </span>
      </div>
    </div>
  {/if}

</div>

<style>
  .ve-root {
    width: 100%;
  }

  .fade-in {
    animation: fadeIn 0.25s ease;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ---- Shared video element ---- */
  .ve-video {
    width: 100%;
    border-radius: 10px;
    display: block;
    background: #000;
    max-height: 400px;
    object-fit: contain;
  }

  /* ---- INTRO ---- */
  .ve-intro {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ve-intro-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Space Grotesk', monospace;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    letter-spacing: 0.04em;
    padding: 4px 0;
  }
  .ve-hint-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #FF4655;
    animation: pulse 1.5s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .ve-vol-btn {
    margin-left: auto;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    padding: 2px 4px;
    border-radius: 4px;
    color: #64748b;
    transition: color 0.15s;
  }
  .ve-vol-btn:hover { color: #e2e8f0; }
  .ve-tap-unmute {
    align-self: center;
    background: rgba(0,0,0,0.6);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 20px;
    padding: 6px 16px;
    font-size: 12px;
    font-weight: 600;
    font-family: 'Space Grotesk', monospace;
    color: #e2e8f0;
    cursor: pointer;
    animation: pulse 2s ease-in-out infinite;
  }

  /* ---- QUESTION ---- */
  .ve-question {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  @media (min-width: 700px) {
    .ve-question {
      flex-direction: row;
      align-items: flex-start;
      gap: 20px;
    }
  }

  .ve-freeze-wrapper {
    position: relative;
    flex: 1;
    min-width: 0;
  }
  .ve-freeze {
    width: 100%;
    border-radius: 10px;
    display: block;
    max-height: 380px;
    object-fit: cover;
  }
  .ve-freeze--dimmed {
    filter: brightness(0.45);
  }
  .ve-freeze-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    background: #FF4655;
    color: #fff;
    font-family: 'Space Grotesk', monospace;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 5px;
    box-shadow: 0 2px 8px rgba(255,70,85,0.4);
  }

  .ve-options-panel {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .ve-question-text {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: #e2e8f0;
    line-height: 1.5;
    margin: 0;
  }
  .ve-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ve-option {
    background: #0f111a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 12px 16px;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, transform 0.1s;
    min-height: 48px;
  }
  .ve-option:hover:not(:disabled) {
    border-color: #00D4AA;
    background: #00D4AA0a;
    transform: translateX(2px);
  }
  .ve-option:disabled {
    cursor: default;
    opacity: 0.6;
  }
  .ve-option.chosen {
    border-color: #00D4AA;
    background: #00D4AA14;
    opacity: 1;
  }
  .ve-opt-label {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: #e2e8f0;
    line-height: 1.4;
  }

  /* ---- GRADE FLASH ---- */
  .ve-grade-flash {
    position: relative;
  }
  .ve-grade-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border-radius: 10px;
    animation: gradePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes gradePop {
    from { opacity: 0; transform: scale(0.7); }
    to   { opacity: 1; transform: scale(1); }
  }
  .ve-grade-label {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 36px;
    font-weight: 900;
    color: var(--grade-color);
    text-shadow: 0 0 24px var(--grade-color);
    letter-spacing: -0.02em;
  }
  .ve-grade-sub {
    font-size: 14px;
    font-weight: 600;
    color: #e2e8f0;
    text-align: center;
    max-width: 340px;
    padding: 0 16px;
    line-height: 1.4;
  }

  /* ---- REVEAL ---- */
  .ve-reveal {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .ve-resolution-wrapper {
    position: relative;
  }
  .ve-resolution-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    background: #00D4AA;
    color: #0b0d14;
    font-family: 'Space Grotesk', monospace;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 5px;
  }
  .ve-result-panel {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 16px;
    background: #0f111a;
    border: 1px solid #1e293b;
    border-radius: 10px;
  }
  .ve-result-tier {
    font-family: 'Space Grotesk', monospace;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.04em;
  }
  .ve-result-expl {
    font-size: 13px;
    color: #94a3b8;
    margin: 0;
    line-height: 1.6;
  }
  .ve-explanation {
    padding: 14px 16px;
    background: #0f111a;
    border: 1px solid #1e293b;
    border-radius: 10px;
  }
  .ve-expl-title {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin: 0 0 8px;
  }
  .ve-expl-text {
    font-size: 13px;
    color: #94a3b8;
    line-height: 1.7;
    margin: 0;
  }

  /* ---- CREDIT ---- */
  .ve-credit {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: #0f111a;
    border: 1px solid #1e293b;
    border-radius: 8px;
  }
  .ve-credit-icon {
    color: #475569;
    font-size: 12px;
  }
  .ve-credit-text {
    font-family: ui-monospace, Consolas, monospace;
    font-size: 11px;
    color: #475569;
    line-height: 1.4;
  }
  .ve-credit-text a {
    color: #64748b;
    text-decoration: underline;
  }
  .ve-credit-text a:hover {
    color: #94a3b8;
  }
</style>
