<script lang="ts">
  // DuelIQ — Main App
  // Not endorsed by Riot Games.
  import type { PuzzleSchema } from "./lib/engine/puzzle_types.js";
  import PuzzleEngine from "./lib/engine/PuzzleEngine.svelte";
  import TheatreOverlay from "./lib/engine/TheatreOverlay.svelte";
  import PracticeLibrary from "./lib/PracticeLibrary.svelte";
  import ProgressPanel from "./lib/ProgressPanel.svelte";
  import Countdown from "./lib/Countdown.svelte";
  import StreakBadge from "./lib/StreakBadge.svelte";
  import {
    DAILY_PUZZLES,
    VIDEO_DAILY,
    todayPuzzleFile,
    dailyNumber,
    markDailyPlayed,
    getStreakData,
  } from "./lib/daily.js";
  import { pickNextPuzzle } from "./lib/progress.js";
  import OnboardingBanner from "./lib/OnboardingBanner.svelte";
  import type { OnboardingProfile, Role, RankBand } from "./lib/onboarding.js";
  import {
    loadProfile,
    shouldShowBanner,
  } from "./lib/onboarding.js";

  // ── Video puzzle metadata catalog (used by PracticeLibrary + next-puzzle chain) ──
  // Maps puzzle filenames → { id, map, theme, difficulty } (static, matches JSON schema)
  const VIDEO_METAS = [
    { id: "puzzle-video-001", file: "puzzle-video-001.json", map: "haven",  theme: "rotation",  difficulty: 3 },
    { id: "puzzle-video-002", file: "puzzle-video-002.json", map: "haven",  theme: "util",      difficulty: 3 },
    { id: "puzzle-video-003", file: "puzzle-video-003.json", map: "haven",  theme: "postplant", difficulty: 3 },
    { id: "puzzle-video-004", file: "puzzle-video-004.json", map: "haven",  theme: "rotation",  difficulty: 3 },
    { id: "puzzle-video-005", file: "puzzle-video-005.json", map: "haven",  theme: "retake",    difficulty: 4 },
    { id: "puzzle-video-006", file: "puzzle-video-006.json", map: "haven",  theme: "rotation",  difficulty: 3 },
    { id: "puzzle-video-007", file: "puzzle-video-007.json", map: "ascent", theme: "entry",     difficulty: 3 },
    { id: "puzzle-video-008", file: "puzzle-video-008.json", map: "ascent", theme: "eco",       difficulty: 4 },
    { id: "puzzle-video-009", file: "puzzle-video-009.json", map: "ascent", theme: "eco",       difficulty: 2 },
    { id: "puzzle-video-010", file: "puzzle-video-010.json", map: "ascent", theme: "util",      difficulty: 4 },
    { id: "puzzle-video-011", file: "puzzle-video-011.json", map: "bind",   theme: "postplant", difficulty: 3 },
    { id: "puzzle-video-012", file: "puzzle-video-012.json", map: "bind",   theme: "entry",     difficulty: 3 },
    { id: "puzzle-video-013", file: "puzzle-video-013.json", map: "bind",   theme: "rotation",  difficulty: 3 },
    { id: "puzzle-video-014", file: "puzzle-video-014.json", map: "haven",  theme: "clutch",    difficulty: 5 },
    { id: "puzzle-video-015", file: "puzzle-video-015.json", map: "haven",  theme: "retake",    difficulty: 4 },
  ] as const;

  // ---- Base URL ----
  const BASE = import.meta.env.BASE_URL; // '/dueliq/'

  // ---- Preview override ----
  // ?p=007 loads a specific puzzle (playtest/deep-links; daily streak logic untouched)
  // Supports ?p=007 (numeric → looks in DAILY_PUZZLES) or ?p=video-001 (literal slug → direct file)
  const previewParam = new URLSearchParams(location.search).get("p");
  let previewFile: string | null = null;
  if (previewParam) {
    if (/^\d+$/.test(previewParam)) {
      previewFile = DAILY_PUZZLES.find((f) => f.includes(`puzzle-${previewParam.padStart(3, "0")}`)) ?? null;
    } else {
      previewFile = `puzzle-${previewParam}.json`;
    }
  }
  const isPreview = previewFile !== null;
  const dailyFile = previewFile ?? todayPuzzleFile();
  const dayNum = dailyNumber();

  // ---- State ----
  let puzzle = $state<PuzzleSchema | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(true);
  let dailyDone = $state(getStreakData().playedToday);
  let waitlistStatus = $state<"idle" | "sending" | "ok" | "err">("idle");
  let waitlistEmail = $state("");

  // ---- Theatre mode ----
  // theatrePuzzle: the PuzzleSchema currently open in theatre (daily or lib selection)
  let theatrePuzzle = $state<PuzzleSchema | null>(null);
  let theatreCurrentMeta = $state<typeof VIDEO_METAS[number] | null>(null);
  let theatreActive = $derived(theatrePuzzle !== null);

  // ---- Progress panel / library refs ----
  let progressPanelRef = $state<{ refresh: () => void } | null>(null);
  let libraryRef = $state<{ refreshPlayed: () => void } | null>(null);

  // ---- Library filter (from CTA "Train [theme]") ----
  let libraryFilterTheme = $state<string | null>(null);

  // ---- Onboarding ----
  let onboardingProfile = $state<OnboardingProfile | null>(loadProfile());
  let showOnboarding = $state(shouldShowBanner());

  function onOnboardingComplete(role: Role, rank: RankBand) {
    onboardingProfile = { role, rank };
    showOnboarding = false;
  }

  function onOnboardingSkip() {
    showOnboarding = false;
  }

  function onEditProfile() {
    showOnboarding = true;
  }

  // ── Load daily puzzle ──────────────────────────────────────────────────────
  async function loadPuzzle() {
    loading = true;
    error = null;
    try {
      const url = `${BASE}puzzles/${dailyFile}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      puzzle = (await res.json()) as PuzzleSchema;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  // ── Load any puzzle by file (for library) ────────────────────────────────
  async function loadPuzzleFile(file: string): Promise<PuzzleSchema | null> {
    try {
      const url = `${BASE}puzzles/${file}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as PuzzleSchema;
    } catch {
      return null;
    }
  }

  // ── Theatre open/close ────────────────────────────────────────────────────
  function enterTheatre() {
    if (!puzzle) return;
    // Daily puzzle in theatre
    const meta = VIDEO_METAS.find((m) => m.id === puzzle!.id) ?? null;
    theatreCurrentMeta = meta;
    theatrePuzzle = puzzle;
  }

  async function openLibraryPuzzle(file: string) {
    const meta = VIDEO_METAS.find((m) => m.file === file) ?? null;
    const loaded = await loadPuzzleFile(file);
    if (!loaded) return;
    theatreCurrentMeta = meta;
    theatrePuzzle = loaded;
  }

  function exitTheatre() {
    theatrePuzzle = null;
    theatreCurrentMeta = null;
    // Refresh progress + library badges after any puzzle completion
    progressPanelRef?.refresh();
    libraryRef?.refreshPlayed();
  }

  // ── Next puzzle chain ─────────────────────────────────────────────────────
  async function goNextPuzzle() {
    if (!theatreCurrentMeta) { exitTheatre(); return; }
    const currentId = theatreCurrentMeta.id;
    const currentTheme = theatreCurrentMeta.theme;
    // pickNextPuzzle reads localStorage progress internally.
    // When a profile is set, role/rank relevance scores are used to weight
    // the next puzzle selection toward the user's role themes + rank difficulty.
    const next = pickNextPuzzle(
      VIDEO_METAS.map((m) => ({ id: m.id, theme: m.theme, difficulty: m.difficulty })),
      currentId,
      currentTheme,
      onboardingProfile ?? undefined
    );
    if (!next) { exitTheatre(); return; }
    const nextMeta = VIDEO_METAS.find((m) => m.id === next.id) ?? null;
    const loaded = await loadPuzzleFile(nextMeta?.file ?? `${next.id}.json`);
    if (!loaded) { exitTheatre(); return; }
    theatreCurrentMeta = nextMeta;
    theatrePuzzle = loaded;
  }

  // ── Daily complete ─────────────────────────────────────────────────────────
  function onDailyComplete() {
    if (isPreview) return;
    markDailyPlayed();
    dailyDone = true;
    progressPanelRef?.refresh();
    libraryRef?.refreshPlayed();
  }

  // ── Library: train weakest theme ──────────────────────────────────────────
  function onTrainTheme(theme: string) {
    libraryFilterTheme = theme;
    // Scroll to library
    document.getElementById("practice-library")?.scrollIntoView({ behavior: "smooth" });
  }

  // ── Waitlist ───────────────────────────────────────────────────────────────
  async function submitWaitlist(e: SubmitEvent) {
    e.preventDefault();
    if (!waitlistEmail.trim()) return;
    waitlistStatus = "sending";
    try {
      const res = await fetch("https://formspree.io/f/xnnvoqew", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: waitlistEmail, source: "dueliq-landing" }),
      });
      if (res.ok) {
        waitlistStatus = "ok";
        waitlistEmail = "";
      } else {
        waitlistStatus = "err";
      }
    } catch {
      waitlistStatus = "err";
    }
  }

  // ---- Init ----
  loadPuzzle();
</script>

<!-- ======= THEATRE MODE (full viewport, outside page flow) ======= -->
{#if theatreActive && theatrePuzzle?.video}
  {#key theatrePuzzle?.id}
    <TheatreOverlay
      puzzle={theatrePuzzle}
      onComplete={theatrePuzzle?.id === puzzle?.id ? onDailyComplete : undefined}
      onExit={exitTheatre}
      onNext={goNextPuzzle}
    />
  {/key}
{/if}

<div class="page">

  <!-- ======= HEADER ======= -->
  <header class="header">
    <div class="header-inner">
      <div class="wordmark">
        <span class="word-duel">Duel</span><span class="word-iq">IQ</span>
      </div>
      <div class="header-right">
        <StreakBadge />
        <span class="legal-note">Not endorsed by Riot Games</span>
      </div>
    </div>
  </header>

  <!-- ======= HERO ======= -->
  <section class="hero">
    <div class="hero-inner">
      <div class="daily-label">
        <span class="daily-num-badge">#{dayNum}</span>
        <span class="daily-sep">/</span>
        <Countdown />
        <span class="daily-sep">/</span>
        <span class="daily-tag">DAILY PUZZLE</span>
      </div>
      <h1 class="hero-title">
        Make sharper<br/>
        <span class="hero-title--accent">decisions.</span>
      </h1>
      <p class="hero-sub">One daily scenario puzzle. Free. No account. Pro-level logic, explained.</p>
      <!-- Badges row — text only, no glyphs -->
      <div class="hero-badges">
        <span class="hero-badge">Real gameplay clips</span>
        <span class="hero-badge">New puzzle daily</span>
        <span class="hero-badge hero-badge--accent">Free</span>
      </div>
    </div>
  </section>

  <!-- ======= DAILY PUZZLE ======= -->
  <section class="daily-section">
    <div class="daily-inner">

      {#if loading}
        <div class="status-msg">
          <div class="loading-bar"></div>
          Loading today's puzzle...
        </div>

      {:else if error}
        <div class="error-box">
          <div class="error-icon">!</div>
          <div>
            <strong>Failed to load puzzle</strong><br/>
            {error}
          </div>
          <button class="btn-small" onclick={loadPuzzle}>Retry</button>
        </div>

      {:else if dailyDone && !isPreview}
        <!-- Puzzle already played today — show teaser -->
        <div class="done-box">
          <div class="done-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 12L10 17L19 8" stroke="#00D4AA" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="done-content">
            <div class="done-title">Daily #{dayNum} — Done</div>
            <p class="done-msg">Come back tomorrow for the next puzzle.</p>
          </div>
          <div class="done-countdown">
            <div class="done-countdown-label">Next in</div>
            <Countdown />
          </div>
        </div>

      {:else if puzzle}
        {#if puzzle.video}
          <!-- Video puzzle: theatre launcher card -->
          <div class="theatre-launcher">
            <div class="theatre-launcher-meta">
              <span class="tl-badge tl-badge--map">{puzzle.map.toUpperCase()}</span>
              <span class="tl-badge tl-badge--theme">{puzzle.theme.toUpperCase()}</span>
              <span class="tl-badge tl-badge--side">{puzzle.side.toUpperCase()}</span>
              <span class="tl-badge tl-badge--video">VIDEO</span>
            </div>
            <div class="theatre-launcher-body">
              <!-- Play icon: simple solid triangle, no glow rings -->
              <div class="tl-icon" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect width="40" height="40" fill="#FF4655"/>
                  <polygon points="15,11 31,20 15,29" fill="#ECE8E1"/>
                </svg>
              </div>
              <div class="tl-text">
                <div class="tl-title">Video Puzzle</div>
                <p class="tl-desc">Watch the real gameplay clip, freeze on the decision, make your call.</p>
              </div>
            </div>
            <button class="btn-theatre" onclick={enterTheatre}>
              Play →
            </button>
            <p class="tl-hint">Opens full screen. Press Esc to return.</p>
          </div>
        {:else}
          <PuzzleEngine {puzzle} onComplete={onDailyComplete} />
        {/if}
      {/if}

    </div>
  </section>

  <!-- ======= PROGRESS PANEL ======= -->
  <ProgressPanel
    bind:this={progressPanelRef}
    totalPuzzles={VIDEO_METAS.length}
    onTrainTheme={onTrainTheme}
    profile={onboardingProfile}
    onEditProfile={onEditProfile}
  />

  <!-- ======= PRACTICE LIBRARY ======= -->
  <div id="practice-library">
    <!-- Onboarding banner: inline above library, skippable, no blocking modal -->
    {#if showOnboarding}
      <div class="ob-wrapper">
        <div class="ob-inner">
          <OnboardingBanner
            onComplete={onOnboardingComplete}
            onSkip={onOnboardingSkip}
          />
        </div>
      </div>
    {/if}
    <PracticeLibrary
      bind:this={libraryRef}
      puzzleMetas={VIDEO_METAS}
      onSelectPuzzle={openLibraryPuzzle}
      filterTheme={libraryFilterTheme}
      profile={onboardingProfile}
    />
  </div>

  <!-- ======= HOW IT WORKS ======= -->
  <section class="howto-section">
    <div class="howto-inner">
      <h2 class="howto-title">How it works</h2>
      <div class="steps-grid">
        <div class="step">
          <div class="step-num">01</div>
          <div class="step-content">
            <div class="step-title">Read the situation</div>
            <p class="step-desc">See the map, ally and enemy positions, credits. Same information the pros work with.</p>
          </div>
        </div>
        <div class="step-connector"></div>
        <div class="step">
          <div class="step-num">02</div>
          <div class="step-content">
            <div class="step-title">Make the call</div>
            <p class="step-desc">4 real options. 15 seconds. No peeking — just your game sense.</p>
          </div>
        </div>
        <div class="step-connector"></div>
        <div class="step">
          <div class="step-num">03</div>
          <div class="step-content">
            <div class="step-title">See the EV delta</div>
            <p class="step-desc">Radiant / Acceptable / Costly / Mistake — with the numbers behind each call.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ======= COMING SOON ======= -->
  <section class="coming-section">
    <div class="coming-inner">
      <div class="coming-header">
        <h2 class="coming-title">Full training mode</h2>
        <span class="coming-tag">EARLY ACCESS</span>
      </div>
      <ul class="coming-list">
        <li class="coming-item">
          <span class="coming-dash">—</span>
          <span>Playstyle diagnosis</span>
        </li>
        <li class="coming-item">
          <span class="coming-dash">—</span>
          <span>Personalized training program</span>
        </li>
        <li class="coming-item">
          <span class="coming-dash">—</span>
          <span>Skill radar by role</span>
        </li>
        <li class="coming-item">
          <span class="coming-dash">—</span>
          <span>VOD review</span>
        </li>
      </ul>
    </div>
  </section>

  <!-- ======= WAITLIST ======= -->
  <section class="waitlist-section">
    <div class="waitlist-inner">
      <h2 class="waitlist-title">Get notified first</h2>
      <p class="waitlist-sub">Join the list for early access to the full training mode. No spam.</p>

      {#if waitlistStatus === "ok"}
        <div class="waitlist-ok">
          You're in. We'll reach out when it launches.
        </div>
      {:else}
        <form class="waitlist-form" onsubmit={submitWaitlist}>
          <input
            class="waitlist-input"
            type="email"
            placeholder="your@email.com"
            bind:value={waitlistEmail}
            required
            disabled={waitlistStatus === "sending"}
          />
          <button
            class="btn-waitlist"
            type="submit"
            disabled={waitlistStatus === "sending"}
          >
            {waitlistStatus === "sending" ? "..." : "Notify me"}
          </button>
        </form>
        {#if waitlistStatus === "err"}
          <p class="waitlist-err">Send failed — try again or reach us at dueliq [at] gmail.com</p>
        {/if}
      {/if}
    </div>
  </section>

  <!-- ======= FOOTER ======= -->
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-disclaimer">
        DuelIQ isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games
        or anyone officially involved in producing or managing Riot Games properties.
        Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
      </div>
      <div class="footer-links">
        <span class="footer-wordmark"><span style="color:#FF4655">Duel</span><span style="color:#ECE8E1">IQ</span> &copy; 2026</span>
        <span class="sep">|</span>
        <span>Analytics: <a href="https://goatcounter.com" target="_blank" rel="noopener">GoatCounter</a> (no cookies)</span>
        <span class="sep">|</span>
        <span>Data: localStorage only</span>
      </div>
    </div>
  </footer>

</div>

<style>
  .page {
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    background: #0F1923;
  }

  /* ---- HEADER ---- */
  .header {
    border-bottom: 1px solid #2A3441;
    background: #0F1923;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .header-inner {
    max-width: 760px;
    margin: 0 auto;
    padding: 0 20px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .wordmark {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 0.01em;
    font-family: 'Anton', Impact, sans-serif;
    text-transform: uppercase;
  }
  .word-duel { color: #FF4655; }
  .word-iq   { color: #ECE8E1; }

  .header-right {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .legal-note {
    font-size: 10px;
    color: #4A5568;
    font-family: 'Inter', system-ui, sans-serif;
    letter-spacing: 0.06em;
    display: none;
    text-transform: uppercase;
  }
  @media (min-width: 600px) { .legal-note { display: inline; } }

  /* ---- HERO ---- */
  .hero {
    padding: 48px 20px 40px;
    border-bottom: 2px solid #FF4655;
  }
  @media (min-width: 600px) { .hero { padding: 64px 20px 48px; } }

  .hero-inner {
    max-width: 760px;
    margin: 0 auto;
  }

  .daily-label {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }
  .daily-num-badge {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 800;
    color: #ECE8E1;
    background: #FF4655;
    padding: 2px 8px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%);
  }
  .daily-sep { color: #4A5568; font-size: 12px; font-weight: 700; }
  .daily-tag {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #7B8FA1;
    text-transform: uppercase;
  }

  .hero-title {
    font-family: 'Anton', Impact, sans-serif;
    font-size: 52px;
    font-weight: 400; /* Anton is inherently bold */
    color: #ECE8E1;
    line-height: 1.0;
    margin-bottom: 16px;
    letter-spacing: 0.01em;
    text-transform: uppercase;
  }
  .hero-title--accent {
    color: #FF4655;
  }
  @media (min-width: 600px) { .hero-title { font-size: 72px; } }

  .hero-sub {
    font-size: 15px;
    color: #7B8FA1;
    line-height: 1.6;
    max-width: 480px;
    margin-bottom: 28px;
    font-weight: 400;
    text-transform: none;
  }

  .hero-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .hero-badge {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #7B8FA1;
    border: 1px solid #2A3441;
    padding: 4px 12px;
    text-transform: uppercase;
  }
  .hero-badge--accent {
    color: #ECE8E1;
    border-color: #FF4655;
    background: #FF465514;
  }

  /* ---- DAILY SECTION ---- */
  .daily-section {
    flex: 1;
    padding: 32px 20px 52px;
  }
  .daily-inner {
    max-width: 760px;
    margin: 0 auto;
  }

  .status-msg {
    color: #7B8FA1;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 13px;
    text-align: center;
    padding: 60px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .loading-bar {
    width: 120px;
    height: 2px;
    background: #2A3441;
    overflow: hidden;
    position: relative;
  }
  .loading-bar::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: #FF4655;
    animation: shimmer 1.5s ease-in-out infinite;
    background-size: 200% 100%;
  }

  .error-box {
    background: #1C2127;
    border: 1px solid #7f1d1d;
    border-left: 2px solid #FF4655;
    color: #fca5a5;
    font-size: 13px;
    font-family: 'Inter', system-ui, sans-serif;
    padding: 20px 24px;
    max-width: 440px;
    line-height: 1.6;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .error-icon {
    width: 28px;
    height: 28px;
    background: #FF4655;
    color: #ECE8E1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 14px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .btn-small {
    background: transparent;
    color: #fca5a5;
    border: 1px solid #7f1d1d;
    padding: 8px 16px;
    min-height: 44px;
    font-size: 12px;
    font-family: 'Inter', system-ui, sans-serif;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }
  .btn-small:hover { background: #7f1d1d; color: #ECE8E1; }

  /* Done box */
  .done-box {
    background: #1C2127;
    border: 1px solid #2A3441;
    border-left: 2px solid #00D4AA;
    padding: 24px;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .done-icon {
    width: 36px;
    height: 36px;
    background: #00D4AA;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .done-content { display: flex; flex-direction: column; gap: 6px; }
  .done-title {
    font-family: 'Anton', Impact, sans-serif;
    font-size: 18px;
    font-weight: 400;
    color: #ECE8E1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .done-msg {
    font-size: 14px;
    color: #7B8FA1;
    line-height: 1.5;
    text-transform: none;
  }
  .done-countdown {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .done-countdown-label {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #7B8FA1;
    text-transform: uppercase;
  }

  /* ---- HOW IT WORKS ---- */
  .howto-section {
    background: #1C2127;
    border-top: 1px solid #2A3441;
    padding: 52px 20px;
  }
  .howto-inner {
    max-width: 760px;
    margin: 0 auto;
  }
  .howto-title {
    font-family: 'Anton', Impact, sans-serif;
    font-size: 26px;
    font-weight: 400;
    color: #ECE8E1;
    margin-bottom: 36px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  @media (min-width: 600px) { .howto-title { font-size: 32px; } }

  .steps-grid {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  @media (min-width: 640px) {
    .steps-grid {
      flex-direction: row;
      align-items: flex-start;
      gap: 0;
    }
  }

  .step {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
    padding: 20px 0;
    border-top: 1px solid #2A3441;
  }
  @media (min-width: 640px) {
    .step {
      padding: 0 24px;
      border-top: none;
      border-left: 1px solid #2A3441;
    }
    .step:first-child { border-left: none; padding-left: 0; }
  }

  .step-connector { display: none; }

  .step-num {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.14em;
    color: #FF4655;
    text-transform: uppercase;
  }
  .step-title {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #ECE8E1;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .step-desc {
    font-size: 14px;
    color: #7B8FA1;
    line-height: 1.6;
    margin: 0;
    text-transform: none;
  }

  /* ---- COMING SOON ---- */
  .coming-section {
    background: #0F1923;
    border-top: 1px solid #2A3441;
    border-bottom: 1px solid #2A3441;
    padding: 48px 20px;
    min-height: 200px;
    contain: layout;
  }
  .coming-inner {
    max-width: 760px;
    margin: 0 auto;
  }
  .coming-header {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }
  .coming-title {
    font-family: 'Anton', Impact, sans-serif;
    font-size: 22px;
    font-weight: 400;
    color: #ECE8E1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .coming-tag {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.14em;
    color: #ECE8E1;
    background: #FF4655;
    padding: 3px 8px;
    text-transform: uppercase;
    clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%);
  }
  .coming-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .coming-item {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    font-weight: 500;
    color: #7B8FA1;
  }
  .coming-dash {
    color: #FF4655;
    font-weight: 700;
    flex-shrink: 0;
    font-family: 'Inter', system-ui, sans-serif;
  }

  /* ---- WAITLIST ---- */
  .waitlist-section {
    padding: 56px 20px;
    background: #1C2127;
  }
  .waitlist-inner {
    max-width: 760px;
    margin: 0 auto;
  }
  .waitlist-title {
    font-family: 'Anton', Impact, sans-serif;
    font-size: 26px;
    font-weight: 400;
    color: #ECE8E1;
    margin-bottom: 10px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .waitlist-sub {
    font-size: 14px;
    font-weight: 400;
    color: #7B8FA1;
    margin-bottom: 24px;
    line-height: 1.6;
  }
  .waitlist-form {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    max-width: 480px;
  }
  .waitlist-input {
    flex: 1;
    min-width: 200px;
    background: #0F1923;
    border: 1px solid #2A3441;
    color: #ECE8E1;
    font-size: 14px;
    font-family: 'Inter', system-ui, sans-serif;
    padding: 13px 16px;
    min-height: 48px;
    outline: none;
    transition: border-color 0.1s;
  }
  .waitlist-input:focus {
    border-color: #FF4655;
    outline: 2px solid rgba(255,70,85,0.35);
    outline-offset: 2px;
  }
  .waitlist-input::placeholder { color: #4A5568; }
  .waitlist-input:disabled { opacity: 0.5; }

  .btn-waitlist {
    background: #FF4655;
    color: #ECE8E1;
    border: none;
    padding: 13px 24px;
    min-height: 48px;
    font-size: 13px;
    font-weight: 700;
    font-family: 'Inter', system-ui, sans-serif;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
    white-space: nowrap;
    clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  }
  .btn-waitlist:hover {
    background: #ECE8E1;
    color: #FF4655;
  }
  .btn-waitlist:disabled { opacity: 0.5; cursor: default; }

  .waitlist-ok {
    font-size: 13px;
    font-weight: 700;
    font-family: 'Inter', system-ui, sans-serif;
    color: #00D4AA;
    padding: 12px 0;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .waitlist-err {
    font-size: 12px;
    color: #f87171;
    margin-top: 10px;
    font-family: 'Inter', system-ui, sans-serif;
  }

  /* ---- FOOTER ---- */
  .footer {
    background: #0F1923;
    border-top: 1px solid #2A3441;
    padding: 24px 20px;
    margin-top: auto;
  }
  .footer-inner {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .footer-disclaimer {
    font-size: 11px;
    color: #4A5568;
    font-family: 'Inter', system-ui, sans-serif;
    line-height: 1.65;
    letter-spacing: 0.03em;
  }
  .footer-links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    font-size: 11px;
    color: #4A5568;
    font-family: 'Inter', system-ui, sans-serif;
    letter-spacing: 0.04em;
  }
  .footer-wordmark {
    font-family: 'Anton', Impact, sans-serif;
    font-size: 13px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .footer-links a { color: #7B8FA1; }
  .footer-links a:hover { color: #ECE8E1; }
  .sep { color: #4A5568; }

  /* ---- ONBOARDING BANNER WRAPPER ---- */
  .ob-wrapper {
    padding: 0 20px;
    border-top: 1px solid #2A3441;
    background: #0F1923;
    padding-top: 20px;
  }
  .ob-inner {
    max-width: 760px;
    margin: 0 auto;
    padding-bottom: 0;
  }

  /* ---- THEATRE LAUNCHER CARD ---- */
  .theatre-launcher {
    background: #1C2127;
    border: 1px solid #2A3441;
    border-left: 2px solid #FF4655;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
  }

  .theatre-launcher-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .tl-badge {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    letter-spacing: 0.1em;
    padding: 2px 8px;
    font-weight: 700;
    text-transform: uppercase;
    background: #0F1923;
    border: 1px solid #2A3441;
    color: #7B8FA1;
  }
  .tl-badge--video { background: #FF4655; color: #ECE8E1; border-color: #FF4655; }

  .theatre-launcher-body {
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }
  .tl-icon { flex-shrink: 0; }
  .tl-text { display: flex; flex-direction: column; gap: 6px; }
  .tl-title {
    font-family: 'Anton', Impact, sans-serif;
    font-size: 20px;
    font-weight: 400;
    color: #ECE8E1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .tl-desc {
    font-size: 14px;
    color: #7B8FA1;
    line-height: 1.55;
    margin: 0;
    max-width: 400px;
    font-family: 'Inter', system-ui, sans-serif;
    text-transform: none;
    font-weight: 400;
  }

  .btn-theatre {
    background: #FF4655;
    color: #ECE8E1;
    border: none;
    padding: 14px 24px;
    min-height: 52px;
    font-size: 13px;
    font-weight: 700;
    font-family: 'Inter', system-ui, sans-serif;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  }
  .btn-theatre:hover {
    background: #ECE8E1;
    color: #FF4655;
  }

  .tl-hint {
    font-size: 11px;
    color: #4A5568;
    font-family: 'Inter', system-ui, sans-serif;
    text-align: center;
    margin: 0;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
</style>
