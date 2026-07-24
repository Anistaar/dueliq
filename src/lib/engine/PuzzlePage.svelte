<script lang="ts">
  // PuzzlePage — loads a puzzle JSON and renders PuzzleEngine
  // Not endorsed by Riot Games.
  import type { PuzzleSchema } from "./puzzle_types.js";
  import PuzzleEngine from "./PuzzleEngine.svelte";

  const { puzzleUrl = "/puzzles/puzzle-000-exemple.json" } = $props<{
    puzzleUrl?: string;
  }>();

  let puzzle = $state<PuzzleSchema | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(true);

  async function loadPuzzle(url: string) {
    loading = true;
    error = null;
    puzzle = null;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      puzzle = (await res.json()) as PuzzleSchema;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadPuzzle(puzzleUrl);
  });
</script>

<div class="puzzle-page">
  <header class="page-header">
    <div class="product-name">DuelIQ</div>
    <div class="disclaimer">Not endorsed by Riot Games</div>
  </header>

  {#if loading}
    <div class="status-msg">Chargement du puzzle...</div>
  {:else if error}
    <div class="error-msg">
      <strong>Erreur de chargement</strong><br/>
      {error}
    </div>
  {:else if puzzle}
    <PuzzleEngine {puzzle} />
  {/if}

  <footer class="page-footer">
    <span>VALIQ — Entraine ta prise de decision Valorant</span>
    <span class="sep">|</span>
    <span>Not affiliated with Riot Games</span>
  </footer>
</div>

<style>
  .puzzle-page {
    min-height: 100svh;
    background: #0b0d14;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 16px 40px;
    box-sizing: border-box;
  }

  .page-header {
    width: 100%;
    max-width: 640px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0 12px;
    border-bottom: 1px solid #1e293b;
    margin-bottom: 20px;
  }

  .product-name {
    font-family: monospace;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #e2e8f0;
  }

  .disclaimer {
    font-family: monospace;
    font-size: 10px;
    letter-spacing: 0.05em;
    color: #334155;
  }

  .status-msg {
    color: #475569;
    font-family: monospace;
    font-size: 14px;
    margin-top: 60px;
  }

  .error-msg {
    background: #1c0a0a;
    border: 1px solid #7f1d1d;
    border-radius: 6px;
    color: #fca5a5;
    font-size: 13px;
    font-family: monospace;
    padding: 14px 18px;
    margin-top: 40px;
    max-width: 440px;
    text-align: center;
    line-height: 1.6;
  }

  .page-footer {
    margin-top: 40px;
    font-family: monospace;
    font-size: 10px;
    letter-spacing: 0.05em;
    color: #1e293b;
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .sep { color: #0f172a; }
</style>
