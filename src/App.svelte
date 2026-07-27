<script lang="ts">
  // DuelIQ — Main App
  // Not endorsed by Riot Games.
  import type { PuzzleSchema } from "./lib/engine/puzzle_types.js";
  import PuzzleEngine from "./lib/engine/PuzzleEngine.svelte";
  import Countdown from "./lib/Countdown.svelte";
  import StreakBadge from "./lib/StreakBadge.svelte";
  import {
    todayPuzzleFile,
    dailyNumber,
    markDailyPlayed,
    getStreakData,
  } from "./lib/daily.js";

  // ---- State ----
  let puzzle = $state<PuzzleSchema | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(true);
  let dailyDone = $state(getStreakData().playedToday);
  let waitlistStatus = $state<"idle" | "sending" | "ok" | "err">("idle");
  let waitlistEmail = $state("");

  const BASE = import.meta.env.BASE_URL; // '/dueliq/'
  const puzzleFile = todayPuzzleFile();
  const dayNum = dailyNumber();

  // ---- Load daily puzzle ----
  async function loadPuzzle() {
    loading = true;
    error = null;
    try {
      const url = `${BASE}puzzles/${puzzleFile}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      puzzle = (await res.json()) as PuzzleSchema;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  // Callback from PuzzleEngine when user reaches end phase
  function onDailyComplete() {
    markDailyPlayed();
    dailyDone = true;
  }

  // ---- Waitlist ----
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
    <!-- Background decorative elements -->
    <div class="hero-bg">
      <div class="hero-orb hero-orb--red"></div>
      <div class="hero-orb hero-orb--teal"></div>
      <div class="hero-grid"></div>
    </div>
    <div class="hero-inner">
      <div class="daily-label">
        <span class="daily-num-badge">#{dayNum}</span>
        <span class="daily-sep">·</span>
        <Countdown />
        <span class="daily-sep">·</span>
        <span class="daily-tag">DAILY PUZZLE</span>
      </div>
      <h1 class="hero-title">
        Make sharper<br/>
        <span class="hero-title--accent">decisions</span> in Valorant.
      </h1>
      <p class="hero-sub">One daily scenario puzzle. Free. No account. Pro-level logic, explained.</p>
      <!-- Badges row -->
      <div class="hero-badges">
        <span class="hero-badge">
          <span class="hb-icon">◈</span>
          30 puzzles
        </span>
        <span class="hero-badge">
          <span class="hb-icon">◎</span>
          5 maps
        </span>
        <span class="hero-badge hero-badge--accent">
          <span class="hb-icon">★</span>
          Free
        </span>
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

      {:else if dailyDone}
        <!-- Puzzle already played today — show teaser -->
        <div class="done-box">
          <div class="done-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" stroke="#00D4AA" stroke-width="2" />
              <path d="M8 14L12 18L20 10" stroke="#00D4AA" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="done-content">
            <div class="done-title">Daily #{dayNum} — Done!</div>
            <p class="done-msg">Come back tomorrow for the next puzzle.</p>
          </div>
          <div class="done-countdown">
            <div class="done-countdown-label">Next puzzle in</div>
            <Countdown />
          </div>
        </div>

      {:else if puzzle}
        <PuzzleEngine {puzzle} onComplete={onDailyComplete} />
      {/if}

    </div>
  </section>

  <!-- ======= HOW IT WORKS ======= -->
  <section class="howto-section">
    <div class="howto-inner">
      <h2 class="howto-title">How it works</h2>
      <div class="steps-grid">
        <div class="step">
          <div class="step-num">01</div>
          <div class="step-icon">◎</div>
          <div class="step-content">
            <div class="step-title">Read the situation</div>
            <p class="step-desc">See the map, ally and enemy positions, credits. Same information the pros work with.</p>
          </div>
        </div>
        <div class="step-connector"></div>
        <div class="step">
          <div class="step-num">02</div>
          <div class="step-icon">◈</div>
          <div class="step-content">
            <div class="step-title">Make the call</div>
            <p class="step-desc">4 real options. 30 seconds. No peeking — just your game sense.</p>
          </div>
        </div>
        <div class="step-connector"></div>
        <div class="step">
          <div class="step-num">03</div>
          <div class="step-icon">★</div>
          <div class="step-content">
            <div class="step-title">Understand the EV delta</div>
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
        <h2 class="coming-title">Coming soon: full training mode</h2>
        <span class="coming-tag">EARLY ACCESS</span>
      </div>
      <ul class="coming-list">
        <li class="coming-item">
          <span class="coming-dot teal"></span>
          <span>Playstyle diagnosis</span>
        </li>
        <li class="coming-item">
          <span class="coming-dot red"></span>
          <span>Personalized training program</span>
        </li>
        <li class="coming-item">
          <span class="coming-dot teal"></span>
          <span>Skill radar by role</span>
        </li>
        <li class="coming-item">
          <span class="coming-dot red"></span>
          <span>AI-assisted VOD review</span>
        </li>
      </ul>
    </div>
  </section>

  <!-- ======= WAITLIST ======= -->
  <section class="waitlist-section">
    <div class="waitlist-inner">
      <div class="waitlist-glow"></div>
      <h2 class="waitlist-title">Get notified first</h2>
      <p class="waitlist-sub">Join the list for early access to the full training mode. No spam.</p>

      {#if waitlistStatus === "ok"}
        <div class="waitlist-ok">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="#00D4AA" stroke-width="1.5"/><path d="M6 10l3 3 5-6" stroke="#00D4AA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
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
        <span class="footer-wordmark"><span style="color:#FF4655">Duel</span><span style="color:#00D4AA">IQ</span> &copy; 2026</span>
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
    background: #0b0d14;
  }

  /* ---- HEADER ---- */
  .header {
    border-bottom: 1px solid #1e293b;
    background: rgba(15,17,26,0.92);
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .header-inner {
    max-width: 760px;
    margin: 0 auto;
    padding: 0 20px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .wordmark {
    font-size: 24px;
    font-weight: 900;
    letter-spacing: -0.03em;
    font-family: 'Space Grotesk', system-ui, sans-serif;
  }
  .word-duel { color: #FF4655; }
  .word-iq   { color: #00D4AA; }

  .header-right {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .legal-note {
    font-size: 10px;
    color: #334155;
    font-family: ui-monospace, Consolas, monospace;
    letter-spacing: 0.04em;
    display: none;
  }
  @media (min-width: 600px) { .legal-note { display: inline; } }

  /* ---- HERO ---- */
  .hero {
    position: relative;
    padding: 40px 20px 32px;
    border-bottom: 1px solid #1e293b;
    overflow: hidden;
  }
  @media (min-width: 600px) { .hero { padding: 56px 20px 40px; } }

  /* Decorative background */
  .hero-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }
  .hero-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.18;
  }
  .hero-orb--red {
    width: 400px;
    height: 400px;
    background: #FF4655;
    top: -180px;
    right: -100px;
  }
  .hero-orb--teal {
    width: 300px;
    height: 300px;
    background: #00D4AA;
    bottom: -140px;
    left: -80px;
    opacity: 0.12;
  }
  .hero-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(#1e293b18 1px, transparent 1px),
      linear-gradient(90deg, #1e293b18 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
    -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
  }

  .hero-inner {
    max-width: 760px;
    margin: 0 auto;
    position: relative;
  }

  .daily-label {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }
  .daily-num-badge {
    font-family: 'Space Grotesk', monospace;
    font-size: 12px;
    font-weight: 800;
    color: #FF4655;
    background: #FF465518;
    border: 1px solid #FF465530;
    border-radius: 5px;
    padding: 2px 8px;
    letter-spacing: 0.05em;
  }
  .daily-sep { color: #334155; font-size: 12px; }
  .daily-tag {
    font-family: 'Space Grotesk', monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #475569;
    text-transform: uppercase;
  }

  .hero-title {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 32px;
    font-weight: 800;
    color: #e2e8f0;
    line-height: 1.15;
    margin-bottom: 14px;
    letter-spacing: -0.02em;
  }
  .hero-title--accent {
    background: linear-gradient(135deg, #FF4655, #ff7b85);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  @media (min-width: 600px) { .hero-title { font-size: 44px; } }

  .hero-sub {
    font-size: 15px;
    color: #64748b;
    line-height: 1.6;
    max-width: 520px;
    margin-bottom: 24px;
    font-weight: 500;
  }

  .hero-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .hero-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'Space Grotesk', monospace;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: #94a3b8;
    background: #0f111a;
    border: 1px solid #1e293b;
    border-radius: 20px;
    padding: 5px 14px;
  }
  .hero-badge--accent {
    color: #00D4AA;
    border-color: #00D4AA30;
    background: #00D4AA0a;
  }
  .hb-icon {
    font-size: 10px;
    opacity: 0.8;
  }

  /* ---- DAILY SECTION ---- */
  .daily-section {
    flex: 1;
    padding: 28px 20px 48px;
  }
  .daily-inner {
    max-width: 760px;
    margin: 0 auto;
  }

  .status-msg {
    color: #475569;
    font-family: 'Space Grotesk', monospace;
    font-size: 14px;
    text-align: center;
    padding: 60px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .loading-bar {
    width: 120px;
    height: 3px;
    background: #1e293b;
    border-radius: 3px;
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
    background: linear-gradient(90deg, transparent, #00D4AA, transparent);
    animation: shimmer 1.5s ease-in-out infinite;
    background-size: 200% 100%;
  }

  .error-box {
    background: linear-gradient(135deg, #1c0a0a, #180808);
    border: 1px solid #7f1d1d;
    border-radius: 10px;
    color: #fca5a5;
    font-size: 13px;
    font-family: ui-monospace, Consolas, monospace;
    padding: 20px 24px;
    max-width: 440px;
    line-height: 1.6;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .error-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #7f1d1d;
    color: #fca5a5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 16px;
  }
  .btn-small {
    background: #7f1d1d;
    color: #fca5a5;
    border: 1px solid #b91c1c;
    border-radius: 6px;
    padding: 8px 16px;
    min-height: 44px;
    font-size: 12px;
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-small:hover { background: #991b1b; }

  /* Done box */
  .done-box {
    background: linear-gradient(135deg, #071510, #091a0f);
    border: 1px solid #14532d;
    border-radius: 14px;
    padding: 28px 24px;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-shadow: 0 4px 32px rgba(0,212,170,0.08);
    position: relative;
    overflow: hidden;
  }
  .done-box::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #00D4AA60, transparent);
  }
  .done-icon {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #00D4AA12;
    border: 1px solid #00D4AA30;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .done-content { display: flex; flex-direction: column; gap: 6px; }
  .done-title {
    font-family: 'Space Grotesk', monospace;
    font-size: 18px;
    font-weight: 800;
    color: #00D4AA;
    letter-spacing: -0.01em;
  }
  .done-msg {
    font-size: 14px;
    color: #64748b;
    line-height: 1.5;
  }
  .done-countdown {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .done-countdown-label {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #334155;
    text-transform: uppercase;
  }

  /* ---- HOW IT WORKS ---- */
  .howto-section {
    background: linear-gradient(180deg, #0b0d14 0%, #0d0f1a 100%);
    border-top: 1px solid #1e293b;
    padding: 56px 20px;
  }
  .howto-inner {
    max-width: 760px;
    margin: 0 auto;
  }
  .howto-title {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: #e2e8f0;
    margin-bottom: 36px;
    letter-spacing: -0.02em;
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
    gap: 12px;
    flex: 1;
    padding: 20px 0;
  }
  @media (min-width: 640px) { .step { padding: 0 24px; } }

  .step-connector {
    display: none;
  }
  @media (min-width: 640px) {
    .step-connector {
      display: block;
      width: 1px;
      min-height: 80px;
      background: linear-gradient(180deg, transparent, #1e293b, transparent);
      flex-shrink: 0;
      margin-top: 20px;
    }
  }

  .step-num {
    font-family: 'Space Grotesk', monospace;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #334155;
  }
  .step-icon {
    font-size: 28px;
    color: #00D4AA;
    opacity: 0.8;
    line-height: 1;
  }
  .step-title {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: #e2e8f0;
    margin-bottom: 4px;
  }
  .step-desc {
    font-size: 13px;
    color: #64748b;
    line-height: 1.6;
    margin: 0;
  }

  /* ---- COMING SOON ---- */
  .coming-section {
    background: #0f111a;
    border-top: 1px solid #1e293b;
    border-bottom: 1px solid #1e293b;
    padding: 48px 20px;
    min-height: 220px;
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
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 22px;
    font-weight: 800;
    color: #e2e8f0;
    letter-spacing: -0.01em;
  }
  .coming-tag {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.14em;
    color: #FF4655;
    background: #FF465514;
    border: 1px solid #FF465530;
    border-radius: 4px;
    padding: 3px 8px;
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
    color: #94a3b8;
  }
  .coming-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 8px currentColor;
  }
  .coming-dot.teal { background: #00D4AA; color: #00D4AA; }
  .coming-dot.red  { background: #FF4655; color: #FF4655; }

  /* ---- WAITLIST ---- */
  .waitlist-section {
    padding: 56px 20px;
    background: #0b0d14;
    position: relative;
    overflow: hidden;
  }
  .waitlist-glow {
    position: absolute;
    width: 400px;
    height: 400px;
    border-radius: 50%;
    background: #00D4AA;
    opacity: 0.04;
    filter: blur(80px);
    top: -100px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
  }
  .waitlist-inner {
    max-width: 760px;
    margin: 0 auto;
    position: relative;
  }
  .waitlist-title {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: #e2e8f0;
    margin-bottom: 10px;
    letter-spacing: -0.01em;
  }
  .waitlist-sub {
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
    margin-bottom: 24px;
    line-height: 1.6;
  }
  .waitlist-form {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    max-width: 480px;
  }
  .waitlist-input {
    flex: 1;
    min-width: 200px;
    background: #0f111a;
    border: 1px solid #1e293b;
    border-radius: 10px;
    color: #e2e8f0;
    font-size: 14px;
    font-family: 'Inter', system-ui, sans-serif;
    padding: 13px 16px;
    min-height: 48px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .waitlist-input:focus {
    border-color: #00D4AA;
    box-shadow: 0 0 0 3px rgba(0,212,170,0.08);
  }
  .waitlist-input::placeholder { color: #334155; }
  .waitlist-input:disabled { opacity: 0.5; }

  .btn-waitlist {
    background: linear-gradient(135deg, #00D4AA 0%, #009980 100%);
    color: #0b0d14;
    border: none;
    border-radius: 10px;
    padding: 13px 24px;
    min-height: 48px;
    font-size: 14px;
    font-weight: 800;
    font-family: 'Space Grotesk', system-ui, sans-serif;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
    white-space: nowrap;
    box-shadow: 0 4px 16px rgba(0,212,170,0.25);
  }
  .btn-waitlist:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(0,212,170,0.4);
    filter: brightness(1.06);
  }
  .btn-waitlist:disabled { opacity: 0.5; cursor: default; transform: none; }

  .waitlist-ok {
    font-size: 14px;
    font-weight: 600;
    font-family: 'Space Grotesk', monospace;
    color: #34d399;
    padding: 12px 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .waitlist-err {
    font-size: 12px;
    color: #f87171;
    margin-top: 10px;
    font-family: ui-monospace, Consolas, monospace;
  }

  /* ---- FOOTER ---- */
  .footer {
    background: #0f111a;
    border-top: 1px solid #1e293b;
    padding: 24px 20px;
    margin-top: auto;
  }
  .footer-inner {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .footer-disclaimer {
    font-size: 11px;
    color: #475569;
    font-family: ui-monospace, Consolas, monospace;
    line-height: 1.65;
    letter-spacing: 0.02em;
  }
  .footer-links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    font-size: 11px;
    color: #334155;
    font-family: ui-monospace, Consolas, monospace;
  }
  .footer-wordmark {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-weight: 700;
    font-size: 13px;
  }
  .footer-links a { color: #475569; }
  .footer-links a:hover { color: #64748b; }
  .sep { color: #1e293b; }
</style>
