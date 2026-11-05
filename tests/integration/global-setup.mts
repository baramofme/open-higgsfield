/**
 * global-setup.mts — Playwright globalSetup for the integration suite.
 *
 * Starts the mock comfy-webui backend before the tests run and closes it after.
 * The Next dev server is started separately by `webServer` in the config; this
 * only owns the backend stub so the submit→poll path has something to talk to.
 *
 * Returning a function here makes Playwright call it as teardown once every test
 * has finished, so the stub is always shut down even if a scenario fails.
 */

import process from "node:process";
import { startMockGradio, type MockGradio } from "./mock-gradio-server.mts";

export default async function globalSetup(): Promise<() => Promise<void>> {
  const port = Number(process.env.MOCK_PORT || 3131);
  const mock: MockGradio = await startMockGradio(port);
  console.info(`[integration] mock backend up at ${mock.baseUrl}`);

  // Expose the stub's origin to the specs via env so they can assert the exact
  // media URL a run carries (the app rewrites host, the path survives).
  process.env.OHF_MOCK_BASE_URL = mock.baseUrl;

  return async function teardown() {
    await mock.close();
    console.info("[integration] mock backend closed");
  };
}
