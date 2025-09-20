import { config as baseConfig } from './wdio.conf';
import { getChromeExtensionPath, getFirefoxExtensionPath } from '../utils/extension-path';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const { IS_CI, IS_FIREFOX } = process.env;

const extName = IS_FIREFOX ? '.xpi' : '.zip';
const extensions = await readdir(join(import.meta.dirname, '../../../.output'));
const latestExtension = extensions.filter(file => extname(file) === extName).at(-1);
const extPath = join(import.meta.dirname, `../../../.output/${latestExtension}`);
const bundledExtension = (await readFile(extPath)).toString('base64');

const chromeCapabilities = {
  browserName: 'chrome',
  acceptInsecureCerts: true,
  'goog:chromeOptions': {
    args: [
      '--disable-web-security',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--remote-debugging-port=9223',
      ...(IS_CI ? ['--headless'] : []),
    ],
    prefs: { 'extensions.ui.developer_mode': true },
    extensions: [bundledExtension],
  },
};

const firefoxCapabilities = {
  browserName: 'firefox',
  acceptInsecureCerts: true,
  'moz:firefoxOptions': {
    args: [...(IS_CI ? ['--headless'] : [])],
  },
};

export const config: WebdriverIO.Config = {
  ...baseConfig,
  capabilities: IS_FIREFOX ? [firefoxCapabilities] : [chromeCapabilities],

  maxInstances: IS_CI ? 10 : 1,
  logLevel: 'error',
  execArgv: IS_CI ? [] : ['--inspect'],
  before: async ({ browserName }: WebdriverIO.Capabilities, _specs, browser: WebdriverIO.Browser) => {
    if (browserName === 'firefox') {
      await browser.installAddOn(bundledExtension, true);

      browser.addCommand('getExtensionPath', async () => getFirefoxExtensionPath(browser));
    } else if (browserName === 'chrome') {
      browser.addCommand('getExtensionPath', async () => getChromeExtensionPath(browser));
    }
  },
  afterTest: async () => {
    if (!IS_CI) {
      await browser.pause(500);
    }
  },
};
