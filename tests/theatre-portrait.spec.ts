/**
 * Playwright test: TheatreOverlay portrait mobile layout fix.
 *
 * Verifies that in portrait mobile (390x844, 360x800):
 *   - The video is visible and not fully covered by the question/reveal panel
 *   - The question panel appears BELOW the video (no overlap)
 *   - Screenshots serve as proof
 *
 * Verifies that on desktop (1440x900) the layout is unchanged.
 */
import { test, expect } from "@playwright/test";

const PREVIEW_URL = "http://localhost:4173/dueliq/?p=video-001";

// Portrait phone viewports to test
const PORTRAIT_VIEWPORTS = [
  { name: "iPhone14-390x844", width: 390, height: 844 },
  { name: "Pixel5-360x800",   width: 360, height: 800 },
];

// ── Helper: open the theatre overlay ────────────────────────────────────────
async function openTheatre(page: import("@playwright/test").Page) {
  await page.goto(PREVIEW_URL, { waitUntil: "domcontentloaded" });
  // Wait for the launcher card to appear
  const btn = page.locator("button.btn-theatre");
  await btn.waitFor({ timeout: 10_000 });
  await btn.click();
  // Wait for the theatre overlay to render
  await page.locator(".theatre").waitFor({ timeout: 5_000 });
}

// ── Helper: choose first option and skip watch_ending to reach reveal ────────
async function chooseAndSkipToReveal(page: import("@playwright/test").Page) {
  // Wait for question phase
  const questionLayer = page.locator(".question-layer");
  await questionLayer.waitFor({ timeout: 20_000 });

  // Click first choice → grade flash → watch_ending
  const firstChoice = page.locator(".choice-btn").first();
  await firstChoice.click();

  // Wait for watch_ending banner, then click Skip
  const skipBtn = page.locator(".btn-skip");
  await skipBtn.waitFor({ timeout: 5_000 });
  await skipBtn.click();

  // Wait for reveal layer
  const revealLayer = page.locator(".reveal-layer");
  await revealLayer.waitFor({ timeout: 5_000 });
}

// ── Portrait tests ───────────────────────────────────────────────────────────
for (const vp of PORTRAIT_VIEWPORTS) {
  test.describe(`Portrait ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("intro phase: video visible in top half", async ({ page }) => {
      await openTheatre(page);
      // Phase = intro: video-layer is the top block
      const videoLayer = page.locator(".video-layer");
      await videoLayer.waitFor();
      const box = await videoLayer.boundingBox();
      expect(box).not.toBeNull();

      // In portrait stacked layout the video-layer top = 0 (safe-area may shift a little)
      expect(box!.y).toBeLessThan(40);
      // Height should be ~56.25% of viewport width (16:9)
      const expectedH = Math.round(vp.width * 9 / 16);
      expect(box!.height).toBeGreaterThan(expectedH * 0.85);
      expect(box!.height).toBeLessThan(expectedH * 1.15);

      await page.screenshot({
        path: `tests/screenshots/portrait-${vp.name}-intro.png`,
        fullPage: false,
      });
    });

    test("question phase: video visible AND question panel below it (no overlap)", async ({ page }) => {
      await openTheatre(page);

      // Wait for intro to finish or force skip by waiting for question phase
      // The intro video in tests (headless) fires onended quickly
      const questionLayer = page.locator(".question-layer");
      await questionLayer.waitFor({ timeout: 20_000 });

      const videoLayer = page.locator(".video-layer");
      const videoBox = await videoLayer.boundingBox();
      const questionBox = await questionLayer.boundingBox();

      expect(videoBox).not.toBeNull();
      expect(questionBox).not.toBeNull();

      const videoBottom = videoBox!.y + videoBox!.height;
      const questionTop = questionBox!.y;

      // Key assertion: question panel starts at or after the bottom of the video
      // Allow 4px tolerance for sub-pixel rendering
      expect(questionTop).toBeGreaterThanOrEqual(videoBottom - 4);

      // Video must occupy a meaningful portion of the top
      expect(videoBox!.height).toBeGreaterThan(vp.height * 0.25);

      await page.screenshot({
        path: `tests/screenshots/portrait-${vp.name}-question.png`,
        fullPage: false,
      });
    });

    test("grade_flash phase: grade overlay visible", async ({ page }) => {
      await openTheatre(page);

      // Wait for question phase
      const questionLayer = page.locator(".question-layer");
      await questionLayer.waitFor({ timeout: 20_000 });

      // Click first choice
      const firstChoice = page.locator(".choice-btn").first();
      await firstChoice.click();

      // Grade flash should appear
      const gradeOverlay = page.locator(".grade-flash-overlay");
      await gradeOverlay.waitFor({ timeout: 3_000 });

      await page.screenshot({
        path: `tests/screenshots/portrait-${vp.name}-grade.png`,
        fullPage: false,
      });
    });

    test("watch_ending phase: full-screen clip with banner and skip button", async ({ page }) => {
      await openTheatre(page);

      // Wait for question phase
      const questionLayer = page.locator(".question-layer");
      await questionLayer.waitFor({ timeout: 20_000 });

      // Click first choice → grade flash → watch_ending
      const firstChoice = page.locator(".choice-btn").first();
      await firstChoice.click();

      // Watch ending banner must appear
      const banner = page.locator(".watch-ending-banner");
      await banner.waitFor({ timeout: 5_000 });

      await page.screenshot({
        path: `tests/screenshots/portrait-${vp.name}-watch-ending.png`,
        fullPage: false,
      });
    });

    test("reveal phase: video visible AND reveal panel below it (no overlap)", async ({ page }) => {
      await openTheatre(page);
      await chooseAndSkipToReveal(page);

      const videoLayer = page.locator(".video-layer");
      const revealLayer = page.locator(".reveal-layer");

      const videoBox = await videoLayer.boundingBox();
      const revealBox = await revealLayer.boundingBox();

      expect(videoBox).not.toBeNull();
      expect(revealBox).not.toBeNull();

      const videoBottom = videoBox!.y + videoBox!.height;
      const revealTop = revealBox!.y;

      // Key assertion: reveal panel starts at or after the bottom of the video
      expect(revealTop).toBeGreaterThanOrEqual(videoBottom - 4);

      // Video must still occupy meaningful vertical space
      expect(videoBox!.height).toBeGreaterThan(vp.height * 0.25);

      await page.screenshot({
        path: `tests/screenshots/portrait-${vp.name}-reveal.png`,
        fullPage: false,
      });
    });
  });
}

// ── Desktop: choices ON the video (bottom strip, frame stays visible) ────────
// Feedback fondateur 2026-07-31 : « on soit sur la vidéo pour cliquer, pas un popup »
test.describe("Desktop 1440x900 — choices overlaid on video, no popup", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("question phase: bottom strip on the freeze frame, centre of frame unobstructed", async ({ page }) => {
    await openTheatre(page);

    const questionLayer = page.locator(".question-layer");
    await questionLayer.waitFor({ timeout: 20_000 });

    const videoLayer = page.locator(".video-layer");
    const videoBox  = await videoLayer.boundingBox();
    const questionBox = await questionLayer.boundingBox();

    expect(videoBox).not.toBeNull();
    expect(questionBox).not.toBeNull();

    // Video-layer fills full viewport on desktop
    expect(videoBox!.width).toBeCloseTo(1440, -1);
    expect(videoBox!.height).toBeCloseTo(900, -1);

    // Strip is anchored at the BOTTOM of the viewport (no centered popup)
    expect(questionBox!.y + questionBox!.height).toBeGreaterThan(880);
    // Strip leaves the centre of the frame visible (starts below 55% of viewport height)
    expect(questionBox!.y).toBeGreaterThan(900 * 0.45);
    // Full-width strip
    expect(questionBox!.width).toBeCloseTo(1440, -2);

    // No meta badges in theatre (map/theme/side removed)
    await expect(page.locator(".theatre-badges")).toHaveCount(0);

    await page.screenshot({
      path: "tests/screenshots/desktop-1440x900-question.png",
      fullPage: false,
    });
  });

  test("watch_ending: full-screen clip, no panel, banner + skip visible", async ({ page }) => {
    await openTheatre(page);

    const questionLayer = page.locator(".question-layer");
    await questionLayer.waitFor({ timeout: 20_000 });

    const firstChoice = page.locator(".choice-btn").first();
    await firstChoice.click();

    // Watch ending banner must appear
    const banner = page.locator(".watch-ending-banner");
    await banner.waitFor({ timeout: 5_000 });

    // No reveal panel yet
    await expect(page.locator(".reveal-layer")).toHaveCount(0);

    await page.screenshot({
      path: "tests/screenshots/desktop-1440x900-watch-ending.png",
      fullPage: false,
    });
  });

  test("reveal phase: panel is an absolute overlay (not stacked)", async ({ page }) => {
    await openTheatre(page);
    await chooseAndSkipToReveal(page);

    const videoLayer = page.locator(".video-layer");
    const revealLayer = page.locator(".reveal-layer");

    const videoBox   = await videoLayer.boundingBox();
    const revealBox  = await revealLayer.boundingBox();

    expect(videoBox).not.toBeNull();
    expect(revealBox).not.toBeNull();

    // Desktop: video fills full viewport
    expect(videoBox!.width).toBeCloseTo(1440, -1);
    // Reveal panel overlaps the video
    expect(revealBox!.y).toBeLessThan(videoBox!.y + videoBox!.height);

    // Rewatch button must be present
    await expect(page.locator(".btn-rewatch")).toHaveCount(1);

    await page.screenshot({
      path: "tests/screenshots/desktop-1440x900-reveal.png",
      fullPage: false,
    });
  });
});

// ── Portrait 390x844 — cards below video, centred in their zone ─────────────
test.describe("Portrait 390x844 — cards below video (no regression)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("question phase: video visible, cards appear below it", async ({ page }) => {
    await openTheatre(page);

    const questionLayer = page.locator(".question-layer");
    await questionLayer.waitFor({ timeout: 20_000 });

    const videoLayer = page.locator(".video-layer");
    const videoBox  = await videoLayer.boundingBox();
    const questionBox = await questionLayer.boundingBox();

    expect(videoBox).not.toBeNull();
    expect(questionBox).not.toBeNull();

    const videoBottom  = videoBox!.y + videoBox!.height;
    const questionTop  = questionBox!.y;

    // Cards panel must start at or after the bottom of the video (stacked, no overlap)
    expect(questionTop).toBeGreaterThanOrEqual(videoBottom - 4);

    // Video must still occupy meaningful vertical space
    expect(videoBox!.height).toBeGreaterThan(844 * 0.20);

    await page.screenshot({
      path: "tests/screenshots/portrait-390x844-question.png",
      fullPage: false,
    });
  });

  test("no orphan timer number (no raw numeric text outside SVG arc)", async ({ page }) => {
    await openTheatre(page);

    const questionLayer = page.locator(".question-layer");
    await questionLayer.waitFor({ timeout: 20_000 });

    // The timer SVG must exist
    await expect(page.locator(".timer-svg")).toHaveCount(1);

    // No standalone text node showing a bare number outside the SVG
    // (the SVG <text> was removed — only the arc circle remains)
    const svgTexts = page.locator(".timer-svg text");
    await expect(svgTexts).toHaveCount(0);

    await page.screenshot({
      path: "tests/screenshots/portrait-390x844-timer-arc.png",
      fullPage: false,
    });
  });
});
