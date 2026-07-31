/**
 * Playwright tests — 3 UX gaps: Practice Library, Next Puzzle Chain, Local Progress
 *
 * Covers:
 *   1. Practice Library visible with 15 puzzle cards
 *   2. Filters (map/theme) work client-side
 *   3. Next puzzle chain — advance 3 puzzles without returning to landing
 *   4. Progress updated after each puzzle (played count increments)
 *   5. Done badge appears after playing (lib badge)
 *   6. Mobile (390x844) + Desktop (1440x900) screenshots
 *
 * Not endorsed by Riot Games.
 */
import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:4173/dueliq/";
const PREVIEW_VIDEO_1 = `${BASE}?p=video-001`;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Clear localStorage so tests are isolated */
async function clearProgress(page: Page) {
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
  });
}

/** Open theatre for a video puzzle via the daily launcher card */
async function openTheatre(page: Page) {
  const btn = page.locator("button.btn-theatre");
  await btn.waitFor({ timeout: 10_000 });
  await btn.click();
  await page.locator(".theatre").waitFor({ timeout: 5_000 });
}

/** Skip intro and wait for question phase.
 *  After a "Next puzzle →" click the new puzzle starts from intro,
 *  so give a generous timeout for the intro video to auto-end. */
async function waitForQuestion(page: Page, timeoutMs = 40_000) {
  const q = page.locator(".question-layer");
  await q.waitFor({ timeout: timeoutMs });
}

/** Click first choice → wait for grade flash → skip watch_ending → wait for reveal */
async function answerAndReveal(page: Page) {
  const firstChoice = page.locator(".choice-btn").first();
  await firstChoice.click();
  await page.locator(".grade-flash-overlay").waitFor({ timeout: 3_000 });
  // After grade flash, watch_ending plays the clip — click Skip to proceed
  const skipBtn = page.locator(".btn-skip");
  await skipBtn.waitFor({ timeout: 5_000 });
  await skipBtn.click();
  await page.locator(".reveal-layer").waitFor({ timeout: 5_000 });
}

/** Click "Final score →" → wait for end overlay */
async function goToEnd(page: Page) {
  const btn = page.locator(".reveal-layer .btn-final");
  await btn.waitFor({ timeout: 5_000 });
  await btn.click();
  await page.locator(".end-overlay").waitFor({ timeout: 5_000 });
}

/** Complete a puzzle from theatre open to end overlay */
async function completePuzzle(page: Page) {
  await waitForQuestion(page);
  await answerAndReveal(page);
  await goToEnd(page);
}

// ── Test suite: Practice Library ─────────────────────────────────────────────

test.describe("Practice Library", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("renders 15 puzzle cards", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500); // let Svelte mount

    const libSection = page.locator("section[aria-label='Practice Library']");
    await libSection.waitFor({ timeout: 8_000 });

    const cards = page.locator(".lib-card");
    await expect(cards).toHaveCount(15);
  });

  test("map filter reduces visible cards", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // Click the "Haven" map filter
    const havenBtn = page.locator(".filter-pills .pill", { hasText: "Haven" }).first();
    await havenBtn.waitFor({ timeout: 8_000 });
    await havenBtn.click();

    // Should show only Haven puzzles (001-006, 014-015 = 8)
    const cards = page.locator(".lib-card");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(15);

    await page.screenshot({
      path: "tests/screenshots/library-filter-haven-desktop.png",
      fullPage: false,
    });
  });

  test("theme filter reduces visible cards", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // Click "Rotation" theme filter
    const rotBtn = page.locator(".filter-pills .pill", { hasText: "Rotation" }).first();
    await rotBtn.waitFor({ timeout: 8_000 });
    await rotBtn.click();

    const cards = page.locator(".lib-card");
    const count = await cards.count();
    // Rotation: 001,004,006,013 = 4
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(15);
  });

  test("screenshot: library section mobile 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const libSection = page.locator("section[aria-label='Practice Library']");
    await libSection.waitFor({ timeout: 8_000 });

    await libSection.screenshot({
      path: "tests/screenshots/library-mobile-390x844.png",
    });
  });

  test("screenshot: library section desktop 1440x900", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const libSection = page.locator("section[aria-label='Practice Library']");
    await libSection.waitFor({ timeout: 8_000 });

    await libSection.screenshot({
      path: "tests/screenshots/library-desktop-1440x900.png",
    });
  });
});

// ── Test suite: Next Puzzle Chain ─────────────────────────────────────────────

test.describe("Next Puzzle Chain", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("chain 3 puzzles via Next puzzle → button without returning to landing", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await clearProgress(page);
    await page.waitForTimeout(500);

    // Open theatre for puzzle 1
    await openTheatre(page);
    await completePuzzle(page);

    // Should see "Next puzzle →" button
    const nextBtn1 = page.locator("[data-testid='btn-next-puzzle']");
    await nextBtn1.waitFor({ timeout: 5_000 });

    // Click → puzzle 2 loads (theatre stays open, new puzzle)
    await nextBtn1.click();
    // Theatre should still be active (no landing return), wait for new puzzle to mount
    await page.locator(".theatre").waitFor({ timeout: 10_000 });
    // Wait a beat for new puzzle to initialize
    await page.waitForTimeout(1_000);

    await completePuzzle(page);

    // Next puzzle for puzzle 2
    const nextBtn2 = page.locator("[data-testid='btn-next-puzzle']");
    await nextBtn2.waitFor({ timeout: 5_000 });
    await nextBtn2.click();
    await page.locator(".theatre").waitFor({ timeout: 10_000 });
    await page.waitForTimeout(1_000);

    await completePuzzle(page);

    // Puzzle 3 done — still in theatre
    await expect(page.locator(".theatre")).toBeVisible();
    await expect(page.locator("[data-testid='btn-next-puzzle']")).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/chain-3-puzzles-end.png",
      fullPage: false,
    });
  });

  test("chain 3 puzzles mobile 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await clearProgress(page);
    await page.waitForTimeout(500);

    await openTheatre(page);
    await completePuzzle(page);

    const nextBtn = page.locator("[data-testid='btn-next-puzzle']");
    await nextBtn.waitFor({ timeout: 5_000 });
    await nextBtn.click();
    await page.locator(".theatre").waitFor({ timeout: 10_000 });
    await page.waitForTimeout(1_000);

    await page.screenshot({
      path: "tests/screenshots/chain-mobile-390x844.png",
      fullPage: false,
    });
  });
});

// ── Test suite: Local Progress ────────────────────────────────────────────────

test.describe("Local Progress", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("progress panel hidden with 0 played, visible after 1 puzzle", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await clearProgress(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // No progress panel when nothing played
    const progressSection = page.locator("section[aria-label='Your progress']");
    await expect(progressSection).toHaveCount(0);

    // Play the daily puzzle
    await openTheatre(page);
    await completePuzzle(page);

    // Close theatre → back to landing
    const backBtn = page.locator(".btn-exit-end");
    await backBtn.click();
    await page.locator(".theatre").waitFor({ state: "detached", timeout: 5_000 });

    // Progress panel should now appear (reactive refresh)
    await progressSection.waitFor({ timeout: 5_000 });
    await expect(progressSection).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/progress-panel-after-1-puzzle.png",
      fullPage: false,
    });
  });

  test("played count increments after each puzzle", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await clearProgress(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // Play puzzle 1
    await openTheatre(page);
    await completePuzzle(page);

    // Next puzzle → puzzle 2
    const nextBtn = page.locator("[data-testid='btn-next-puzzle']");
    await nextBtn.waitFor({ timeout: 5_000 });
    await nextBtn.click();
    await page.locator(".theatre").waitFor({ timeout: 10_000 });
    await page.waitForTimeout(1_000);
    await completePuzzle(page);

    // Next → puzzle 3
    const nextBtn2 = page.locator("[data-testid='btn-next-puzzle']");
    await nextBtn2.waitFor({ timeout: 5_000 });
    await nextBtn2.click();
    await page.locator(".theatre").waitFor({ timeout: 10_000 });
    await page.waitForTimeout(1_000);
    await completePuzzle(page);

    // Exit theatre
    const backBtn = page.locator(".btn-exit-end");
    await backBtn.click();
    await page.locator(".theatre").waitFor({ state: "detached", timeout: 5_000 });

    // Verify localStorage progress
    const playedCount = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem("dueliq_progress_v1");
        if (!raw) return 0;
        const d = JSON.parse(raw);
        return d.results?.length ?? 0;
      } catch { return 0; }
    });
    expect(playedCount).toBeGreaterThanOrEqual(3);

    // Progress section shows the count
    const progressSection = page.locator("section[aria-label='Your progress']");
    await progressSection.waitFor({ timeout: 5_000 });
    const statText = await page.locator(".stat-value").first().textContent();
    expect(statText).toContain("3");

    await page.screenshot({
      path: "tests/screenshots/progress-count-3.png",
      fullPage: false,
    });
  });

  test("done badge appears on lib card after playing a puzzle", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await clearProgress(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // Confirm first card has no done badge before playing
    const firstCard = page.locator(".lib-card").first();
    await firstCard.waitFor({ timeout: 8_000 });
    await expect(firstCard).not.toHaveClass(/lib-card--done/);

    // Play daily (video-001)
    await openTheatre(page);
    await completePuzzle(page);

    // Exit
    const backBtn = page.locator(".btn-exit-end");
    await backBtn.click();
    await page.locator(".theatre").waitFor({ state: "detached", timeout: 5_000 });

    // The card for puzzle-video-001 should now have done class
    await expect(firstCard).toHaveClass(/lib-card--done/, { timeout: 5_000 });

    await page.screenshot({
      path: "tests/screenshots/lib-done-badge-desktop.png",
      fullPage: false,
    });
  });

  test("progress panel screenshot mobile 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Inject fake progress so panel is visible without playing
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      const fake = {
        results: [
          { puzzle: "puzzle-video-001", tier: "optimal",    grade: "S", score: 1000, theme: "rotation",  map: "haven", date: new Date().toISOString() },
          { puzzle: "puzzle-video-002", tier: "acceptable", grade: "A", score: 700,  theme: "util",      map: "haven", date: new Date().toISOString() },
          { puzzle: "puzzle-video-003", tier: "couteux",    grade: "C", score: 300,  theme: "postplant", map: "haven", date: new Date().toISOString() },
          { puzzle: "puzzle-video-004", tier: "faute",      grade: "X", score: 0,    theme: "rotation",  map: "haven", date: new Date().toISOString() },
        ],
      };
      localStorage.setItem("dueliq_progress_v1", JSON.stringify(fake));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const progressSection = page.locator("section[aria-label='Your progress']");
    await progressSection.waitFor({ timeout: 8_000 });

    await progressSection.screenshot({
      path: "tests/screenshots/progress-panel-mobile-390x844.png",
    });
  });
});
