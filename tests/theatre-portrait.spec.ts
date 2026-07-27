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

    test("reveal phase: video visible AND reveal panel below it (no overlap)", async ({ page }) => {
      await openTheatre(page);

      // Wait for question phase
      const questionLayer = page.locator(".question-layer");
      await questionLayer.waitFor({ timeout: 20_000 });

      // Click first choice → grade flash → reveal
      const firstChoice = page.locator(".choice-btn").first();
      await firstChoice.click();

      // Wait for reveal layer
      const revealLayer = page.locator(".reveal-layer");
      await revealLayer.waitFor({ timeout: 5_000 });

      const videoLayer = page.locator(".video-layer");
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

// ── Desktop control: layout must be unchanged ────────────────────────────────
test.describe("Desktop 1440x900 — layout unchanged", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("question phase: panel is an absolute overlay (not stacked)", async ({ page }) => {
    await openTheatre(page);

    const questionLayer = page.locator(".question-layer");
    await questionLayer.waitFor({ timeout: 20_000 });

    const videoLayer = page.locator(".video-layer");
    const videoBox  = await videoLayer.boundingBox();
    const questionBox = await questionLayer.boundingBox();

    expect(videoBox).not.toBeNull();
    expect(questionBox).not.toBeNull();

    // On desktop, video-layer is position:absolute inset:0 = full viewport
    expect(videoBox!.width).toBeCloseTo(1440, -1);
    expect(videoBox!.height).toBeCloseTo(900, -1);

    // Question panel overlaps the video (bottom-anchored overlay)
    const questionTop  = questionBox!.y;
    const videoBottom  = videoBox!.y + videoBox!.height;
    // The panel is inside the video layer area
    expect(questionTop).toBeLessThan(videoBottom);

    await page.screenshot({
      path: "tests/screenshots/desktop-1440x900-question.png",
      fullPage: false,
    });
  });

  test("reveal phase: panel is an absolute overlay (not stacked)", async ({ page }) => {
    await openTheatre(page);

    const questionLayer = page.locator(".question-layer");
    await questionLayer.waitFor({ timeout: 20_000 });

    const firstChoice = page.locator(".choice-btn").first();
    await firstChoice.click();

    const revealLayer = page.locator(".reveal-layer");
    await revealLayer.waitFor({ timeout: 5_000 });

    const videoLayer = page.locator(".video-layer");
    const videoBox   = await videoLayer.boundingBox();
    const revealBox  = await revealLayer.boundingBox();

    expect(videoBox).not.toBeNull();
    expect(revealBox).not.toBeNull();

    // Desktop: video fills full viewport
    expect(videoBox!.width).toBeCloseTo(1440, -1);
    // Reveal panel overlaps the video
    expect(revealBox!.y).toBeLessThan(videoBox!.y + videoBox!.height);

    await page.screenshot({
      path: "tests/screenshots/desktop-1440x900-reveal.png",
      fullPage: false,
    });
  });
});
