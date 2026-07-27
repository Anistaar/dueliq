import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
