<script lang="ts">
  // PracticeLibrary — Grid of 15 video puzzles with filters, blur vignette, done badges.
  // Not endorsed by Riot Games.
  import type { PuzzleSchema } from "./engine/puzzle_types.js";
  import { getPlayedIds, getResultFor, type PuzzleResult } from "./progress.js";

  const {
    puzzleMetas,
    onSelectPuzzle,
    filterTheme = null,
  }: {
    puzzleMetas: { id: string; file: string; map: string; theme: string; difficulty: number }[];
    onSelectPuzzle: (file: string) => void;
    filterTheme?: string | null;
  } = $props();

  // ── Filters ────────────────────────────────────────────────────────────────
  let activeMap = $state<string>("all");
  let activeTheme = $state<string>(filterTheme ?? "all");

  // Sync external filterTheme prop into local state
  $effect(() => {
    if (filterTheme) activeTheme = filterTheme;
  });

  const allMaps = $derived([...new Set(puzzleMetas.map((p) => p.map))].sort());
  const allThemes = $derived([...new Set(puzzleMetas.map((p) => p.theme))].sort());

  const filtered = $derived(
    puzzleMetas.filter((p) => {
      if (activeMap !== "all" && p.map !== activeMap) return false;
      if (activeTheme !== "all" && p.theme !== activeTheme) return false;
      return true;
    })
  );

  // ── Played state ────────────────────────────────────────────────────────────
  // Reactive played set — rebuild when component is visible (after each puzzle completion)
  let playedIds = $state<Set<string>>(getPlayedIds());

  export function refreshPlayed() {
    playedIds = getPlayedIds();
  }

  function getResult(id: string): PuzzleResult | null {
    return getResultFor(id);
  }

  // ── Pip rendering ──────────────────────────────────────────────────────────
  function pips(n: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  // ── Map label ─────────────────────────────────────────────────────────────
  function mapLabel(map: string): string {
    return map.charAt(0).toUpperCase() + map.slice(1);
  }
  function themeLabel(theme: string): string {
    return theme.charAt(0).toUpperCase() + theme.slice(1);
  }

  // ── Grade colors ──────────────────────────────────────────────────────────
  const gradeColor: Record<string, string> = {
    S: "#22c55e",
    A: "#eab308",
    C: "#f97316",
    X: "#ef4444",
  };
</script>

<section class="lib-section" aria-label="Practice Library">
  <div class="lib-header">
    <div class="lib-title-row">
      <h2 class="lib-title">Practice Library</h2>
      <span class="lib-count">{filtered.length}/{puzzleMetas.length}</span>
    </div>

    <!-- Filters -->
    <div class="filters">
      <div class="filter-group">
        <span class="filter-label">Map</span>
        <div class="filter-pills">
          <button
            class="pill"
            class:pill--active={activeMap === "all"}
            onclick={() => (activeMap = "all")}
          >All</button>
          {#each allMaps as map}
            <button
              class="pill"
              class:pill--active={activeMap === map}
              onclick={() => (activeMap = map)}
            >{mapLabel(map)}</button>
          {/each}
        </div>
      </div>
      <div class="filter-group">
        <span class="filter-label">Theme</span>
        <div class="filter-pills">
          <button
            class="pill"
            class:pill--active={activeTheme === "all"}
            onclick={() => (activeTheme = "all")}
          >All</button>
          {#each allThemes as theme}
            <button
              class="pill"
              class:pill--active={activeTheme === theme}
              onclick={() => (activeTheme = theme)}
            >{themeLabel(theme)}</button>
          {/each}
        </div>
      </div>
    </div>
  </div>

  {#if filtered.length === 0}
    <div class="lib-empty">No puzzles match this filter.</div>
  {:else}
    <div class="lib-grid">
      {#each filtered as p}
        {@const result = getResult(p.id)}
        {@const done = playedIds.has(p.id)}
        <button
          class="lib-card"
          class:lib-card--done={done}
          onclick={() => onSelectPuzzle(p.file)}
          aria-label="{mapLabel(p.map)} {themeLabel(p.theme)} puzzle{done ? ' — played' : ''}"
        >
          <!-- Thumbnail: blurred freeze frame -->
          <div class="card-thumb">
            <img
              class="card-thumb-img"
              src="{import.meta.env.BASE_URL}media/p-{p.id.replace('puzzle-','')}-freeze.jpg"
              alt=""
              aria-hidden="true"
              loading="lazy"
            />
            <div class="card-thumb-blur"></div>
            <!-- Play icon overlay -->
            {#if !done}
              <div class="card-play-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="15" stroke="#FF4655" stroke-width="1.5" opacity="0.6"/>
                  <polygon points="13,10 24,16 13,22" fill="#FF4655"/>
                </svg>
              </div>
            {:else}
              <!-- Done badge -->
              <div class="card-done-badge" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" fill="#00D4AA20" stroke="#00D4AA" stroke-width="1.5"/>
                  <path d="M6 10l3 3 5-5" stroke="#00D4AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {#if result}
                  <span class="done-grade" style="color: {gradeColor[result.grade]}">{result.grade}</span>
                {/if}
              </div>
            {/if}
          </div>

          <!-- Card body -->
          <div class="card-body">
            <div class="card-tags">
              <span class="card-tag card-tag--map">{mapLabel(p.map)}</span>
              <span class="card-tag card-tag--theme">{themeLabel(p.theme)}</span>
            </div>
            <div class="card-meta">
              <!-- Difficulty pips -->
              <div class="card-diff" aria-label="Difficulty {p.difficulty}/5">
                {#each pips(5) as pip}
                  <span class="pip" class:pip--filled={pip <= p.difficulty}></span>
                {/each}
              </div>
              {#if done && result}
                <span class="card-score" style="color: {gradeColor[result.grade]}">{result.score}/1000</span>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</section>

<style>
  /* ── Section ─────────────────────────────────────────────────────────────── */
  .lib-section {
    padding: 32px 20px 48px;
    border-top: 1px solid #1e293b;
    background: #0b0d14;
  }

  /* ── Header ─────────────────────────────────────────────────────────────── */
  .lib-header {
    max-width: 760px;
    margin: 0 auto 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .lib-title-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .lib-title {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 22px;
    font-weight: 800;
    color: #e2e8f0;
    letter-spacing: -0.01em;
    margin: 0;
  }

  .lib-count {
    font-family: 'Space Grotesk', monospace;
    font-size: 12px;
    color: #475569;
    font-weight: 600;
  }

  /* ── Filters ─────────────────────────────────────────────────────────────── */
  .filters {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .filter-label {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #334155;
    text-transform: uppercase;
    min-width: 38px;
    flex-shrink: 0;
  }

  .filter-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .pill {
    font-family: 'Space Grotesk', monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 4px 12px;
    border-radius: 20px;
    border: 1px solid #1e293b;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
    min-height: 28px;
  }
  .pill:hover {
    border-color: #334155;
    color: #94a3b8;
  }
  .pill--active {
    border-color: #00D4AA40;
    background: #00D4AA10;
    color: #00D4AA;
  }

  /* ── Grid ────────────────────────────────────────────────────────────────── */
  .lib-grid {
    max-width: 760px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  @media (max-width: 599px) {
    .lib-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
  }

  @media (min-width: 700px) {
    .lib-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  /* ── Card ────────────────────────────────────────────────────────────────── */
  .lib-card {
    display: flex;
    flex-direction: column;
    background: #0f111a;
    border: 1px solid #1e293b;
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    text-align: left;
    padding: 0;
    transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
    min-height: 44px; /* a11y touch target */
  }
  .lib-card:hover {
    border-color: #FF465540;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 70, 85, 0.12);
  }
  .lib-card--done {
    border-color: #00D4AA25;
  }
  .lib-card--done:hover {
    border-color: #00D4AA60;
    box-shadow: 0 6px 20px rgba(0, 212, 170, 0.1);
  }

  /* ── Thumbnail ─────────────────────────────────────────────────────────── */
  .card-thumb {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #13151f;
    overflow: hidden;
    flex-shrink: 0;
  }

  .card-thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  /* Strong blur — no spoiler, just a tease of colour */
  .card-thumb-blur {
    position: absolute;
    inset: 0;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    background: rgba(11, 13, 20, 0.55);
  }

  .card-play-icon {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .card-done-badge {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    pointer-events: none;
    flex-direction: column;
  }

  .done-grade {
    font-family: 'Space Grotesk', monospace;
    font-size: 18px;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.02em;
    text-shadow: 0 0 10px currentColor;
  }

  /* ── Card body ──────────────────────────────────────────────────────────── */
  .card-body {
    padding: 8px 10px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .card-tag {
    font-family: 'Space Grotesk', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid;
  }
  .card-tag--map   { color: #60a5fa; border-color: #1e3a5f; background: #0f1b2d; }
  .card-tag--theme { color: #34d399; border-color: #064e3b; background: #0d1f17; }

  .card-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .card-diff {
    display: flex;
    gap: 3px;
    align-items: center;
  }

  .pip {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #1e293b;
    display: inline-block;
    flex-shrink: 0;
  }
  .pip--filled {
    background: #FF4655;
  }

  .card-score {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.03em;
  }

  /* ── Empty ────────────────────────────────────────────────────────────────── */
  .lib-empty {
    max-width: 760px;
    margin: 0 auto;
    color: #475569;
    font-size: 13px;
    font-family: 'Space Grotesk', monospace;
    padding: 32px 0;
    text-align: center;
  }
</style>
