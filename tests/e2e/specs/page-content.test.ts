import { beforeAll, describe, expect, test } from './fixtures';
import { sleep } from '@/packages/shared';

declare global {
  interface Window {
    addMessage: (message: { name: string; body: string; isAuto?: boolean }) => void;
  }
}

const TTS_SCRIPTS_LOADED_LOG = 'All content script loaded';

const waitUntil = async (
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number; timeoutMsg?: string } = {},
) => {
  const { timeout = 5000, interval = 100, timeoutMsg = `waitUntil timeout after ${timeout}ms` } = options;

  return Promise.race([
    (async () => {
      while (true) {
        const result = await condition();
        if (result) {
          return true;
        }
        await sleep(interval);
      }
    })(),
    sleep(timeout).then(() => {
      throw new Error(timeoutMsg);
    }),
  ]);
};

describe('Text-to-Speech Extension E2E', () => {
  // Incremental URL counter to clear browser cache
  let extensionPath: string = null!;
  let testUrlCounter = 0;
  const getTestUrl = (): string => {
    testUrlCounter += 1;
    return `${extensionPath}/chat-test.html?${testUrlCounter}`;
  };

  beforeAll(({ extensionId }) => {
    extensionPath = `chrome-extension://${extensionId}`;
  });

  test('should load TTS extension content script', async ({ page }) => {
    const logs: Array<string | null> = [];
    page.on('console', logEntry => {
      logs.push(logEntry.text());
    });

    // Load the chat-test.html file from our HTTP server
    await page.goto(getTestUrl());

    // This works like an implicit assertion;
    // the test will fail if the log is not found within the timeout.
    await waitUntil(() => logs.some(log => log?.includes(TTS_SCRIPTS_LOADED_LOG)));
  });

  test('should detect and add YouTube chat message to speech queue', async ({ page }) => {
    // Set up logging to monitor extension loading
    const logs: Array<string | null> = [];
    page.on('console', logEntry => {
      logs.push(logEntry.text());
    });

    // Load the chat-test.html file
    await page.goto(getTestUrl());

    // Wait for extension to load and process existing messages
    await waitUntil(() => logs.some(log => log?.includes(TTS_SCRIPTS_LOADED_LOG)));

    // Add a test message to the chat
    await page.evaluate(() => {
      window.addMessage({ name: 'User1', body: 'Test message' });
    });

    // waitUntil serves as an implicit assertion; the test will fail on timeout.
    await waitUntil(() => logs.some(log => log?.includes('Adding message to queue:')));
  });

  test('should process multiple messages sequentially', async ({ page }) => {
    const speakTextCalls: Array<{ text: string; timestamp: number }> = [];

    page.on('console', logEntry => {
      const message = logEntry.text();
      if (!message) {
        return;
      }

      // Finished speech: "<message>"
      const match = message.match(/Finished speech: "(.*)"/);

      if (match) {
        const text = match[1];
        const timestamp = Date.now();
        speakTextCalls.push({ text, timestamp });
      }
    });

    // Enable required CDP domains
    await page.goto(getTestUrl());

    // Add multiple messages sequentially
    await page.evaluate(() => {
      window.addMessage({ name: 'User1', body: 'First message' });
      window.addMessage({ name: 'User2', body: 'Second message' });
    });

    // Wait for all messages to be processed sequentially
    await waitUntil(() => speakTextCalls.length >= 2, {
      timeoutMsg: 'Expected at least 2 speechSynthesis.speak calls',
    });

    // Verify the messages were processed in order (timestamps should be sequential)
    expect(speakTextCalls[0].text).toContain('First message');
    expect(speakTextCalls[1].text).toContain('Second message');
    expect(speakTextCalls[0].timestamp).toBeLessThan(speakTextCalls[1].timestamp);
  });
});
