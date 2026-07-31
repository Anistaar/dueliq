import { test, expect } from "@playwright/test";

// Screenshots proving the video-first daily + 2 new video puzzles play end-to-end.
// Drives the theatre via ?p=video-00X deep-links (loads that puzzle as the daily).

const SHOTS = "tests/screenshots";
const PREVIEW = "http://localhost:4173/dueliq";

// Force intro/resolution <video> elements to "finish" fast so headless doesn't
// wait ~11s of real playback. We fast-forward + fire 'ended'.
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
  // Landing: theatre launcher card visible
  await expect(page.getByText("Video Puzzle").first()).toBeVisible({ timeout: 15000 });
  if (slug === "video-002") {
    await page.screenshot({ path: `${SHOTS}/batch1-daily-landing.png`, fullPage: false });
  }
  // Enter theatre
  await page.getByRole("button", { name: /Play/i }).click();
  // Intro phase — hint visible
  await expect(page.getByText(/Watch the situation/i)).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: `${SHOTS}/batch1-${slug}-intro.png` });

  // Advance intro -> question
  await skipIntro(page);
  await page.locator(".question-layer").waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${SHOTS}/batch1-${slug}-question.png` });

  // Choose an option by its label text
  await page.getByRole("button", { name: new RegExp(chooseLabelIncludes, "i") }).click();

  // Grade flash → watch_ending → click Skip → reveal
  const skipBtn = page.locator(".btn-skip");
  await skipBtn.waitFor({ timeout: 5_000 });
  await skipBtn.click();

  // Reveal panel
  await expect(page.locator(".reveal-layer")).toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: `${SHOTS}/batch1-${slug}-reveal.png` });

  // Go to final score
  await page.getByRole("button", { name: /Final score/i }).click();
  await expect(page.getByText(/\/1000/).first()).toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: `${SHOTS}/batch1-${slug}-end.png` });
}

test("video-002 plays end-to-end (optimal pick)", async ({ page }) => {
  await playPuzzle(page, "video-002", "Fire the Recon Bolt over A");
});

test("video-003 plays end-to-end (a pick)", async ({ page }) => {
  await playPuzzle(page, "video-003", "Sprint to C Link");
});
