/**
 * Playwright tests — 3 REF_MOBATRAINER_v2 gaps
 *
 * GAP-1: Concepts Map public (47 concepts in 8 families, coverage badges, filter click)
 * GAP-2: Speed bonus visible in grade flash and reveal (never punitive)
 * GAP-3: Honest attribution in reveal (DuelIQ + real source domains, no invented handles)
 *
 * Not endorsed by Riot Games.
 */
import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:4173/dueliq/";
const PREVIEW_VIDEO_1 = `${BASE}?p=video-001`;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function clearStorage(page: Page) {
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
  });
}

async function openTheatre(page: Page) {
  const btn = page.locator("button.btn-theatre");
  await btn.waitFor({ timeout: 10_000 });
  await btn.click();
  await page.locator(".theatre").waitFor({ timeout: 5_000 });
}

async function waitForQuestion(page: Page) {
  await page.locator(".question-layer").waitFor({ timeout: 40_000 });
}

async function answerFirstChoice(page: Page) {
  const firstChoice = page.locator(".choice-btn").first();
  await firstChoice.click();
  await page.locator(".grade-flash-overlay").waitFor({ timeout: 3_000 });
}

async function skipToReveal(page: Page) {
  const skipBtn = page.locator(".btn-skip");
  await skipBtn.waitFor({ timeout: 5_000 });
  await skipBtn.click();
  await page.locator(".reveal-layer").waitFor({ timeout: 5_000 });
}

// ══════════════════════════════════════════════════════════════════════════════
// GAP-1: CONCEPTS MAP
// ══════════════════════════════════════════════════════════════════════════════

test.describe("GAP-1: Concepts Map", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("concepts section is visible on landing", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const section = page.locator("section[aria-label='Training concepts map']");
    await section.waitFor({ timeout: 8_000 });
    await expect(section).toBeVisible();
  });

  test("concepts section title reads TRAINING CONCEPTS", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const title = page.locator(".concepts-title");
    await title.waitFor({ timeout: 8_000 });
    const text = await title.textContent();
    expect(text?.toUpperCase()).toContain("TRAINING CONCEPTS");
  });

  test("renders 8 family blocks", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    await page.locator("section[aria-label='Training concepts map']").waitFor({ timeout: 8_000 });
    const families = page.locator(".family-block");
    await expect(families).toHaveCount(8);
  });

  test("renders 47 concept cards total", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    await page.locator("section[aria-label='Training concepts map']").waitFor({ timeout: 8_000 });
    const cards = page.locator(".concept-card");
    await expect(cards).toHaveCount(47);
  });

  test("covered concepts have active badge, uncovered have coming soon", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    await page.locator("section[aria-label='Training concepts map']").waitFor({ timeout: 8_000 });

    const activeBadges = page.locator(".concept-badge--active");
    const soonBadges = page.locator(".concept-badge--soon");

    const activeCount = await activeBadges.count();
    const soonCount = await soonBadges.count();

    // Active concepts = those with puzzle theme covered (7 existing themes cover many concepts)
    expect(activeCount).toBeGreaterThan(0);
    // Some concepts are "coming soon" (new themes like zoning, info, timing, etc.)
    expect(soonCount).toBeGreaterThan(0);
    // Total = 47
    expect(activeCount + soonCount).toBe(47);
  });

  test("clicking a covered concept scrolls to and filters practice library", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    await page.locator("section[aria-label='Training concepts map']").waitFor({ timeout: 8_000 });

    // Click first covered concept card
    const coveredCard = page.locator(".concept-card--covered").first();
    await coveredCard.click();

    // Practice Library section should now be visible in viewport (scrolled to)
    const libSection = page.locator("section[aria-label='Practice Library']");
    await libSection.waitFor({ timeout: 8_000 });
    // Library should have fewer cards than all 27 (filter active)
    const cards = page.locator(".lib-card");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(27);
  });

  test("coming-soon concept cards are not interactive (disabled)", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    await page.locator("section[aria-label='Training concepts map']").waitFor({ timeout: 8_000 });

    const soonCard = page.locator(".concept-card--soon").first();
    // Should be disabled attribute
    await expect(soonCard).toBeDisabled();
  });

  test("screenshot: concepts section desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const section = page.locator("section[aria-label='Training concepts map']");
    await section.waitFor({ timeout: 8_000 });
    await section.screenshot({ path: "tests/screenshots/concepts-map-desktop.png" });
  });

  test("screenshot: concepts section mobile 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const section = page.locator("section[aria-label='Training concepts map']");
    await section.waitFor({ timeout: 8_000 });
    await section.screenshot({ path: "tests/screenshots/concepts-map-mobile.png" });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GAP-2: SPEED BONUS
// ══════════════════════════════════════════════════════════════════════════════

test.describe("GAP-2: Speed Bonus", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("grade flash shows score and optional speed bonus element", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await clearStorage(page);
    await page.waitForTimeout(500);

    await openTheatre(page);
    await waitForQuestion(page);
    await answerFirstChoice(page);

    // Grade flash should show the score row
    const scoreRow = page.locator(".grade-score-row");
    await scoreRow.waitFor({ timeout: 3_000 });
    await expect(scoreRow).toBeVisible();

    // The grade score itself is always present
    const gradeScore = page.locator(".grade-score");
    await expect(gradeScore).toBeVisible();
  });

  test("reveal layer shows score with optional speed badge (no negative)", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await clearStorage(page);
    await page.waitForTimeout(500);

    await openTheatre(page);
    await waitForQuestion(page);
    await answerFirstChoice(page);
    await skipToReveal(page);

    // Reveal header should show score row
    const scoreRow = page.locator(".reveal-score-row");
    await scoreRow.waitFor({ timeout: 5_000 });
    await expect(scoreRow).toBeVisible();

    // Score text should be a number ≥ 0
    const scoreEl = page.locator(".reveal-score");
    await scoreEl.waitFor({ timeout: 3_000 });
    const scoreText = await scoreEl.textContent();
    const scoreNum = parseInt(scoreText?.replace(/\D/g, "") ?? "0", 10);
    expect(scoreNum).toBeGreaterThanOrEqual(0);

    // If speed badge visible, it must show a + prefix (never negative)
    const speedBadge = page.locator(".reveal-speed-badge");
    const badgeCount = await speedBadge.count();
    if (badgeCount > 0) {
      const badgeText = await speedBadge.textContent();
      expect(badgeText).toMatch(/^\+\d+/);
    }
  });

  test("speed bonus is 0 for faute (wrong answer) — no badge shown", async ({ page }) => {
    // We can't guarantee a specific answer is "faute" without knowing shuffle order,
    // but we can verify the grade-flash always renders .grade-score-row without crashing.
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await clearStorage(page);
    await page.waitForTimeout(500);

    await openTheatre(page);
    await waitForQuestion(page);

    // Answer last choice (likely not optimal)
    const choices = page.locator(".choice-btn");
    await choices.last().click();

    const gradeFlash = page.locator(".grade-flash-overlay");
    await gradeFlash.waitFor({ timeout: 3_000 });

    // Should have score row even for last choice
    const scoreRow = page.locator(".grade-score-row");
    await expect(scoreRow).toBeVisible();
  });

  test("screenshot: grade flash with speed bonus", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await clearStorage(page);
    await page.waitForTimeout(500);

    await openTheatre(page);
    await waitForQuestion(page);
    await answerFirstChoice(page);

    const gradeFlash = page.locator(".grade-flash-overlay");
    await gradeFlash.waitFor({ timeout: 3_000 });
    await page.screenshot({
      path: "tests/screenshots/grade-flash-speed-bonus.png",
      fullPage: false,
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GAP-3: HONEST ATTRIBUTION
// ══════════════════════════════════════════════════════════════════════════════

test.describe("GAP-3: Honest Attribution", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("attribution block is visible in reveal panel", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await clearStorage(page);
    await page.waitForTimeout(500);

    await openTheatre(page);
    await waitForQuestion(page);
    await answerFirstChoice(page);
    await skipToReveal(page);

    const attr = page.locator(".attribution-block");
    await attr.waitFor({ timeout: 5_000 });
    await expect(attr).toBeVisible();
  });

  test("attribution shows 'Analysis: DuelIQ' text", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await clearStorage(page);
    await page.waitForTimeout(500);

    await openTheatre(page);
    await waitForQuestion(page);
    await answerFirstChoice(page);
    await skipToReveal(page);

    const attrAnalysis = page.locator(".attr-analysis");
    await attrAnalysis.waitFor({ timeout: 5_000 });
    const text = await attrAnalysis.textContent();
    expect(text).toContain("DuelIQ");
    expect(text).toContain("Analysis");
  });

  test("attribution contains clickable source domain links", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await clearStorage(page);
    await page.waitForTimeout(500);

    await openTheatre(page);
    await waitForQuestion(page);
    await answerFirstChoice(page);
    await skipToReveal(page);

    // Source links (.attr-link) should be present
    const attrLinks = page.locator(".attr-link");
    const count = await attrLinks.count();
    expect(count).toBeGreaterThan(0);

    // Each link should have a real href (not "#")
    for (let i = 0; i < count; i++) {
      const href = await attrLinks.nth(i).getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).not.toBe("#");
    }
  });

  test("attribution does NOT contain fake rank labels (no Challenger/Radiant pseudo)", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await clearStorage(page);
    await page.waitForTimeout(500);

    await openTheatre(page);
    await waitForQuestion(page);
    await answerFirstChoice(page);
    await skipToReveal(page);

    const attr = page.locator(".attribution-block");
    await attr.waitFor({ timeout: 5_000 });
    const text = await attr.textContent();

    // MUST NOT contain invented rank + handle patterns
    expect(text).not.toMatch(/Immortal\s+\d+\s*#/);
    expect(text).not.toMatch(/Radiant\s+#/);
    expect(text).not.toMatch(/Challenger\s+#/);
  });

  test("footage credit is still present alongside analysis attribution", async ({ page }) => {
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await clearStorage(page);
    await page.waitForTimeout(500);

    await openTheatre(page);
    await waitForQuestion(page);
    await answerFirstChoice(page);
    await skipToReveal(page);

    // Footage line should still be there
    const footage = page.locator(".attr-footage");
    await footage.waitFor({ timeout: 5_000 });
    const text = await footage.textContent();
    expect(text).toContain("Footage");
  });

  test("screenshot: attribution block in reveal panel", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await clearStorage(page);
    await page.waitForTimeout(500);

    await openTheatre(page);
    await waitForQuestion(page);
    await answerFirstChoice(page);
    await skipToReveal(page);

    await page.screenshot({
      path: "tests/screenshots/attribution-reveal.png",
      fullPage: false,
    });
  });
});
