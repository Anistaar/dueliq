import { test, expect } from "@playwright/test";

// Batch #2 proof: 3 new video puzzles (Ascent / Bind / Haven) play end-to-end.
// Drives the theatre via ?p=video-0XX deep-links.

const SHOTS = "tests/screenshots";
const PREVIEW = "http://localhost:4173/dueliq";

async function skipIntro(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const v = document.querySelector("video");
    if (v) {
      try { v.currentTime = (v.duration && isFinite(v.duration)) ? v.duration : 9; } catch {}
      v.dispatchEvent(new Event("ended"));
    }
  });
}

async function playPuzzle(page: import("@playwright/test").Page, slug: string, chooseLabelIncludes: string) {
  await page.goto(`${PREVIEW}/?p=${slug}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Video Puzzle").first()).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /Play/i }).click();
  await expect(page.getByText(/Watch the situation/i)).toBeVisible({ timeout: 10000 });

  await skipIntro(page);
  await page.locator(".question-layer").waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${SHOTS}/batch2-${slug}-question.png` });

  await page.getByRole("button", { name: new RegExp(chooseLabelIncludes, "i") }).click();

  // Grade flash → watch_ending → click Skip → reveal
  const skipBtn = page.locator(".btn-skip");
  await skipBtn.waitFor({ timeout: 5_000 });
  await skipBtn.click();

  await expect(page.locator(".reveal-layer")).toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: `${SHOTS}/batch2-${slug}-reveal.png` });

  await page.getByRole("button", { name: /Final score/i }).click();
  await expect(page.getByText(/\/1000/).first()).toBeVisible({ timeout: 8000 });
}

test("video-007 Ascent plays end-to-end", async ({ page }) => {
  await playPuzzle(page, "video-007", "Trade-hold: swing just behind your entry");
});

test("video-011 Bind plays end-to-end", async ({ page }) => {
  await playPuzzle(page, "video-011", "Hold crossfire angles on the spike");
});

test("video-014 Haven plays end-to-end", async ({ page }) => {
  await playPuzzle(page, "video-014", "Isolate one fight");
});
