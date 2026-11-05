import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright harness for the UI+BE integration suite.
 *
 * - webServer boots the real Next dev server on the test port (3130). Tests run
 *   against a live server so the submit→poll path (a real server action calling
 *   the platform client) is exercised, not mocked in-page. The server is started
 *   from the repo root (cwd below) so Next finds src/app; reuseExistingServer is
 *   off so it always runs with CFWUI_BASE_URL set (a reused foreign server would
 *   lack it and fall back to the cloud, demanding a platform key).
 * - globalSetup starts the mock comfy-webui backend (mock-gradio-server.mts) on
 *   MOCK_PORT (default 3131) and tears it down after the run. The app is pointed
 *   at it through CFWUI_BASE_URL, which puts the studio in LAN mode (no platform
 *   key needed) so generation presses reach the stub end-to-end.
 * - one Chromium (the headless shell already cached on this host) is enough; the
 *   three menu scenarios share it.
 */
const MOCK_PORT = Number(process.env.MOCK_PORT || 3131);
const APP_PORT = Number(process.env.APP_PORT || 3130);

// this config lives in <root>/tests/integration/, so the project root is two up
const CONFIG_DIR = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = path.resolve(CONFIG_DIR, "../..");

export default defineConfig({
  testDir: "./scenarios",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  globalSetup: "./global-setup.mts",
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `next dev --port ${APP_PORT}`,
    cwd: PROJECT_ROOT,
    url: `http://localhost:${APP_PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      CFWUI_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
    },
  },
});
