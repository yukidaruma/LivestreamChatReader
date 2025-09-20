// This file is based on `wxt-dev/examples` repository, which is released under the MIT License.
// https://github.com/wxt-dev/examples/blob/fe72c3f55d40fb81c49ec03b4a99c1953d02fb90/examples/playwright-e2e-testing/e2e/fixtures.ts

/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, chromium } from '@playwright/test';
import path from 'path';
import type { BrowserContext } from '@playwright/test';

const IS_FIREFOX = process.env.FIREFOX === 'true';

const pathToExtension = path.resolve(import.meta.dirname, `../../../.output/${IS_FIREFOX ? 'firefox' : 'chrome'}-mv3`);

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [`--disable-extensions-except=${pathToExtension}`, `--load-extension=${pathToExtension}`],
    });

    await use(context);

    await context.close();
  },
  extensionId: async ({ context }, use) => {
    const [background] = context.serviceWorkers();

    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});
export const afterAll = test.afterAll;
export const beforeAll = test.beforeAll;
export const describe = test.describe;
export const expect = test.expect;
