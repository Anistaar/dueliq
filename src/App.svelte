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
      // Formspree free tier endpoint (dueliq waitlist form)
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
    <div class="hero-inner">
      <div class="daily-label">Daily #{dayNum} &mdash; <Countdown /></div>
      <h1 class="hero-title">Prends de meilleures decisions sur Valorant.</h1>
      <p class="hero-sub">Un puzzle de situation par jour. Gratuit. Sans compte. La logique des pros, expliquee.</p>
    </div>
  </section>

  <!-- ======= DAILY PUZZLE ======= -->
  <section class="daily-section">
    <div class="daily-inner">

      {#if loading}
        <div class="status-msg">Chargement du puzzle du jour...</div>

      {:else if error}
        <div class="error-box">
          <strong>Erreur de chargement</strong><br/>
          {error}<br/>
          <button class="btn-small" onclick={loadPuzzle}>Reessayer</button>
        </div>

      {:else if dailyDone}
        <!-- Puzzle already played today — show teaser -->
        <div class="done-box">
          <div class="done-icon">✓</div>
          <div class="done-title">Daily #{dayNum} complete !</div>
          <p class="done-msg">Tu as deja joue le puzzle du jour. Reviens demain pour le suivant.</p>
          <Countdown />
        </div>

      {:else if puzzle}
        <PuzzleEngine {puzzle} onComplete={onDailyComplete} />
      {/if}

    </div>
  </section>

  <!-- ======= COMING SOON ======= -->
  <section class="coming-section">
    <div class="coming-inner">
      <h2 class="coming-title">Bientot : le training complet</h2>
      <ul class="coming-list">
        <li><span class="coming-dot teal"></span>Diagnostic de ton style de jeu</li>
        <li><span class="coming-dot red"></span>Programme d'entrainement personnalise</li>
        <li><span class="coming-dot teal"></span>Radar de competences par role</li>
        <li><span class="coming-dot red"></span>VOD review assistee par IA</li>
      </ul>
    </div>
  </section>

  <!-- ======= WAITLIST ======= -->
  <section class="waitlist-section">
    <div class="waitlist-inner">
      <h2 class="waitlist-title">Sois notifie en premier</h2>
      <p class="waitlist-sub">Rejoins la liste pour l'acces early au training complet. Pas de spam.</p>

      {#if waitlistStatus === "ok"}
        <div class="waitlist-ok">Merci ! On te contacte a l'ouverture.</div>
      {:else}
        <form class="waitlist-form" onsubmit={submitWaitlist}>
          <input
            class="waitlist-input"
            type="email"
            placeholder="ton@email.com"
            bind:value={waitlistEmail}
            required
            disabled={waitlistStatus === "sending"}
          />
          <button
            class="btn-waitlist"
            type="submit"
            disabled={waitlistStatus === "sending"}
          >
            {waitlistStatus === "sending" ? "..." : "M'inscrire"}
          </button>
        </form>
        {#if waitlistStatus === "err"}
          <p class="waitlist-err">Erreur d'envoi — reessaie ou ecris a dueliq [at] gmail.com</p>
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
        <span>DuelIQ &copy; 2026</span>
        <span class="sep">|</span>
        <span>Analytics : <a href="https://goatcounter.com" target="_blank" rel="noopener">GoatCounter</a> (sans cookies)</span>
        <span class="sep">|</span>
        <span>Donnees : localStorage uniquement</span>
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
    background: #0f111a;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .header-inner {
    max-width: 760px;
    margin: 0 auto;
    padding: 0 16px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .wordmark {
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.02em;
    font-family: system-ui, sans-serif;
  }
  .word-duel { color: #FF4655; }
  .word-iq   { color: #00D4AA; }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .legal-note {
    font-size: 10px;
    color: #1e293b;
    font-family: ui-monospace, Consolas, monospace;
    letter-spacing: 0.04em;
    display: none;
  }
  @media (min-width: 600px) { .legal-note { display: inline; } }

  /* ---- HERO ---- */
  .hero {
    padding: 36px 16px 20px;
    border-bottom: 1px solid #1e293b;
  }
  .hero-inner {
    max-width: 760px;
    margin: 0 auto;
  }
  .daily-label {
    font-family: ui-monospace, Consolas, monospace;
    font-size: 12px;
    color: #475569;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .hero-title {
    font-size: 28px;
    font-weight: 800;
    color: #e2e8f0;
    line-height: 1.2;
    margin-bottom: 10px;
    letter-spacing: -0.01em;
  }
  @media (min-width: 600px) { .hero-title { font-size: 36px; } }

  .hero-sub {
    font-size: 15px;
    color: #64748b;
    line-height: 1.55;
    max-width: 540px;
  }

  /* ---- DAILY SECTION ---- */
  .daily-section {
    flex: 1;
    padding: 24px 16px 40px;
  }
  .daily-inner {
    max-width: 760px;
    margin: 0 auto;
  }

  .status-msg {
    color: #475569;
    font-family: ui-monospace, Consolas, monospace;
    font-size: 14px;
    text-align: center;
    padding: 60px 0;
  }
  .error-box {
    background: #1c0a0a;
    border: 1px solid #7f1d1d;
    border-radius: 8px;
    color: #fca5a5;
    font-size: 13px;
    font-family: ui-monospace, Consolas, monospace;
    padding: 20px 24px;
    max-width: 440px;
    line-height: 1.6;
  }
  .btn-small {
    margin-top: 10px;
    background: #7f1d1d;
    color: #fca5a5;
    border: 1px solid #b91c1c;
    border-radius: 4px;
    padding: 4px 12px;
    font-size: 12px;
    cursor: pointer;
  }

  .done-box {
    background: #0a1a10;
    border: 1px solid #14532d;
    border-radius: 12px;
    padding: 40px 32px;
    max-width: 440px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
  }
  .done-icon {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #14532d;
    color: #4ade80;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .done-title {
    font-family: ui-monospace, Consolas, monospace;
    font-size: 16px;
    font-weight: 700;
    color: #4ade80;
    letter-spacing: 0.05em;
  }
  .done-msg {
    font-size: 14px;
    color: #94a3b8;
    line-height: 1.55;
  }

  /* ---- COMING SOON ---- */
  .coming-section {
    background: #0f111a;
    border-top: 1px solid #1e293b;
    border-bottom: 1px solid #1e293b;
    padding: 40px 16px;
  }
  .coming-inner {
    max-width: 760px;
    margin: 0 auto;
  }
  .coming-title {
    font-size: 20px;
    color: #e2e8f0;
    font-weight: 700;
    margin-bottom: 20px;
  }
  .coming-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .coming-list li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: #94a3b8;
  }
  .coming-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .coming-dot.teal { background: #00D4AA; }
  .coming-dot.red  { background: #FF4655; }

  /* ---- WAITLIST ---- */
  .waitlist-section {
    padding: 40px 16px;
    background: #0b0d14;
  }
  .waitlist-inner {
    max-width: 760px;
    margin: 0 auto;
  }
  .waitlist-title {
    font-size: 20px;
    color: #e2e8f0;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .waitlist-sub {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 20px;
    line-height: 1.5;
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
    background: #0f111a;
    border: 1px solid #1e293b;
    border-radius: 6px;
    color: #e2e8f0;
    font-size: 14px;
    padding: 10px 14px;
    outline: none;
    transition: border-color 0.15s;
  }
  .waitlist-input:focus { border-color: #00D4AA; }
  .waitlist-input::placeholder { color: #334155; }
  .waitlist-input:disabled { opacity: 0.5; }

  .btn-waitlist {
    background: #00D4AA;
    color: #0b0d14;
    border: none;
    border-radius: 6px;
    padding: 10px 22px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
  }
  .btn-waitlist:hover { background: #00bfa0; }
  .btn-waitlist:disabled { opacity: 0.5; cursor: default; }

  .waitlist-ok {
    font-size: 14px;
    color: #4ade80;
    font-family: ui-monospace, Consolas, monospace;
    padding: 10px 0;
  }
  .waitlist-err {
    font-size: 12px;
    color: #f87171;
    margin-top: 8px;
    font-family: ui-monospace, Consolas, monospace;
  }

  /* ---- FOOTER ---- */
  .footer {
    background: #0f111a;
    border-top: 1px solid #1e293b;
    padding: 24px 16px;
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
    color: #334155;
    font-family: ui-monospace, Consolas, monospace;
    line-height: 1.6;
    letter-spacing: 0.02em;
  }
  .footer-links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    font-size: 11px;
    color: #1e293b;
    font-family: ui-monospace, Consolas, monospace;
  }
  .footer-links a { color: #334155; }
  .footer-links a:hover { color: #475569; }
  .sep { color: #1e293b; }
</style>
