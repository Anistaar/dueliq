/**
 * Playwright test: verify no double-token during replay/freeze on p007.
 * Checks that .tokens-hidden is applied during replay and removed after.
 */
import { test, expect } from "@playwright/test";

test.describe("Replay double-token fix", () => {
  // Start local preview server before tests
  test.beforeAll(async ({}) => {});

  test("p007 replay: token-layer hidden during replay, visible after", async ({
    page,
  }) => {
    // Navigate to the app — use ?p=007 to load a static puzzle with replay
    await page.goto("http://localhost:4173/dueliq/?p=007");

    // Find puzzle-007 or navigate there
    // The app renders a daily/random puzzle — we trigger Play and check overlay state
    const playBtn = page.locator("button:has-text('Play')");
    await playBtn.waitFor({ timeout: 10000 });

    // Before clicking Play — token layer should be visible (no hideTokens)
    const tokenLayer = page.locator(".token-layer");
    const hiddenBefore = await tokenLayer.first().evaluate((el) =>
      el.classList.contains("tokens-hidden")
    );
    expect(hiddenBefore).toBe(false);

    await playBtn.click();

    // During replay phase — tokens-hidden should be applied
    // Wait for LIVE badge to appear
    const liveBadge = page.locator(".replay-badge");
    await liveBadge.waitFor({ timeout: 5000 });

    const hiddenDuringReplay = await tokenLayer.first().evaluate((el) =>
      el.classList.contains("tokens-hidden")
    );
    expect(hiddenDuringReplay).toBe(true);

    // Replay overlay should be present
    const overlay = page.locator(".replay-overlay");
    await expect(overlay).toBeVisible();

    // Screenshot: replay phase — should show animated tokens only
    await page.screenshot({
      path: "tests/screenshots/replay-phase.png",
      fullPage: false,
    });

    // Wait for freeze — FREEZE badge or transition to question
    const freezeBadge = page.locator(".replay-badge");
    // Wait up to 10 seconds for freeze (freeze_at_ms=5800)
    await page.waitForTimeout(7000);

    // Screenshot: after freeze
    await page.screenshot({
      path: "tests/screenshots/freeze-phase.png",
      fullPage: false,
    });

    // After freeze → playing: token layer should be visible again
    // Wait for playing phase (options appear)
    const firstOption = page.locator(".option-btn").first();
    await firstOption.waitFor({ timeout: 5000 });

    await page.screenshot({
      path: "tests/screenshots/playing-phase.png",
      fullPage: false,
    });

    // In playing phase, no replay overlay, tokens visible
    const overlayGone = await page.locator(".replay-overlay").count();
    expect(overlayGone).toBe(0);

    // Verify no .tokens-hidden in playing phase
    const hiddenAfter = await page
      .locator(".token-layer")
      .first()
      .evaluate((el) => el.classList.contains("tokens-hidden"));
    expect(hiddenAfter).toBe(false);
  });
});
