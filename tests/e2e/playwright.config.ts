// This file is based on `wxt-dev/examples` repository, which is released under the MIT License.
// https://github.com/wxt-dev/examples/blob/fe72c3f55d40fb81c49ec03b4a99c1953d02fb90/examples/playwright-e2e-testing/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'specs',
  timeout: 10 * 1000,
  reporter: 'line',

  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.IS_CI,

  // Opt out of parallel tests on CI.
  workers: process.env.IS_CI ? 1 : undefined,

  use: {
    // Collect trace when retrying the failed test.
    trace: 'on-first-retry',
  },

  // Configure projects for major browsers.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
