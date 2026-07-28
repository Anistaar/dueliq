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
            <!-- Play icon overlay — solid rect, esport language (no soft circle) -->
            {#if !done}
              <div class="card-play-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect width="28" height="28" fill="#FF4655"/>
                  <polygon points="11,8 22,14 11,20" fill="#ECE8E1"/>
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
    padding: 32px 20px 52px;
    border-top: 1px solid #2A3441;
    background: #0F1923;
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
    font-family: 'Anton', Impact, sans-serif;
    font-size: 22px;
    font-weight: 400;
    color: #ECE8E1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin: 0;
  }

  .lib-count {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 11px;
    color: #7B8FA1;
    font-weight: 700;
    letter-spacing: 0.08em;
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
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #7B8FA1;
    text-transform: uppercase;
    min-width: 38px;
    flex-shrink: 0;
  }

  .filter-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .pill {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 6px 10px;
    border: 1px solid #2A3441;
    background: transparent;
    color: #7B8FA1;
    cursor: pointer;
    transition: border-color 0.1s, color 0.1s, background 0.1s;
    min-height: 32px;
  }
  @media (max-width: 599px) {
    .pill {
      min-height: 44px;
      padding: 10px 12px;
    }
  }
  .pill:hover {
    border-color: #FF4655;
    color: #ECE8E1;
  }
  .pill--active {
    border-color: #FF4655;
    background: #FF465514;
    color: #ECE8E1;
  }

  /* ── Grid ────────────────────────────────────────────────────────────────── */
  .lib-grid {
    max-width: 760px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  @media (max-width: 599px) {
    .lib-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
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
    background: #1C2127;
    border: 1px solid #2A3441;
    overflow: hidden;
    cursor: pointer;
    text-align: left;
    padding: 0;
    transition: border-color 0.1s, transform 0.1s;
    min-height: 44px;
    clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
  }
  .lib-card:hover {
    border-color: #FF4655;
    transform: translateY(-2px);
  }
  .lib-card--done {
    border-color: #00D4AA40;
  }
  .lib-card--done:hover {
    border-color: #00D4AA;
  }

  /* ── Thumbnail ─────────────────────────────────────────────────────────── */
  .card-thumb {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #0F1923;
    overflow: hidden;
    flex-shrink: 0;
  }

  .card-thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    filter: blur(12px) brightness(0.5);
    transform: scale(1.05); /* compensate blur edges */
  }

  /* Blur applied via CSS filter on img — no backdrop-filter */
  .card-thumb-blur {
    position: absolute;
    inset: 0;
    background: rgba(11,16,22,0.4);
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
    font-family: 'Anton', Impact, sans-serif;
    font-size: 22px;
    font-weight: 400;
    line-height: 1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
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
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 1px 5px;
    border: 1px solid #2A3441;
    color: #7B8FA1;
    background: #0F1923;
  }

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
    width: 4px;
    height: 8px;
    background: #2A3441;
    display: inline-block;
    flex-shrink: 0;
  }
  .pip--filled {
    background: #FF4655;
  }

  .card-score {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
  }

  /* ── Empty ────────────────────────────────────────────────────────────────── */
  .lib-empty {
    max-width: 760px;
    margin: 0 auto;
    color: #7B8FA1;
    font-size: 13px;
    font-family: 'Inter', system-ui, sans-serif;
    padding: 32px 0;
    text-align: center;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
</style>
