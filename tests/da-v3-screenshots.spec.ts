/**
 * DA v3 before/after screenshots — landing desktop/mobile, theatre question.
 * Not endorsed by Riot Games.
 */
import { test, Page } from "@playwright/test";

const BASE = "http://localhost:4173/dueliq/";
const PREVIEW_VIDEO_1 = `${BASE}?p=video-001`;
const OUT = "design/da_v3";

async function openTheatreQuestion(page: Page) {
  const btn = page.locator("button.btn-theatre");
  await btn.waitFor({ timeout: 10_000 });
  await btn.click();
  await page.locator(".question-layer").waitFor({ timeout: 40_000 });
}

test.describe("DA v3 Screenshots", () => {
  test("landing desktop 1440x900", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/landing-desktop-1440x900.png`, fullPage: false });
  });

  test("landing mobile 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/landing-mobile-390x844.png`, fullPage: false });
  });

  test("theatre question desktop 1440x900", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    await openTheatreQuestion(page);
    await page.screenshot({ path: `${OUT}/theatre-question-desktop-1440x900.png`, fullPage: false });
  });

  test("theatre question mobile 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    await openTheatreQuestion(page);
    await page.screenshot({ path: `${OUT}/theatre-question-mobile-390x844.png`, fullPage: false });
  });

  test("library section desktop 1440x900", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PREVIEW_VIDEO_1, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    const lib = page.locator("section[aria-label='Practice Library']");
    await lib.waitFor({ timeout: 8_000 });
    await lib.screenshot({ path: `${OUT}/library-desktop-1440x900.png` });
  });
});
