/* eslint-disable import-x/exports-last */

import {
  DEFAULT_SPEECH_TEMPLATE,
  extractFieldValues,
  findSiteConfigByUrl,
  formatText,
  initWebDriverShim,
  logger,
  normalizeWhitespaces,
  speakText,
  waitForElementAppearance,
  waitForElementRemoval,
} from '@extension/shared/lib/utils';
import { applyTextFilters } from '@extension/shared/lib/utils/text-filter';
import { extensionEnabledStorage, speechTemplateStorage, textFilterStorage } from '@extension/storage';
import type { SiteConfig, SiteId } from '@extension/shared/lib/utils/site-config';
import type { TextFilter } from '@extension/storage/lib/base';

const createMonitor =
  (config: SiteConfig, containerNode: Element, { ignoreNames }: { ignoreNames?: string[] }) =>
  () => {
    logger.debug(`${config.name} monitoring started.`);

    // Subscribe to storage updates
    const cachedValues = {
      filters: [] as TextFilter[],
      template: DEFAULT_SPEECH_TEMPLATE as string,
    } as const;
    // The `storageValueKey` must match both the name of the value property in storage and the key in `cachedValues`.
    const storageSubscriptions = [
      { storage: textFilterStorage, storageValueKey: 'filters', default: [] },
      {
        storage: speechTemplateStorage,
        storageValueKey: 'template',
        default: DEFAULT_SPEECH_TEMPLATE,
      },
    ] as const;
    const storageUnsubscriptionFunctions: Array<() => void> = [];

    for (const { storage, storageValueKey, default: defaultValue } of storageSubscriptions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cachedValues as any)[storageValueKey] = (storage.getSnapshot() as any)?.[storageValueKey] ?? defaultValue;

      const unsubscribe = storage.subscribe(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cachedValues as any)[storageValueKey] = (storage.getSnapshot() as any)?.[storageValueKey] ?? defaultValue;
        logger.debug(`Storage updated (${storageValueKey}): ${cachedValues[storageValueKey]}`);
      });
      storageUnsubscriptionFunctions.push(unsubscribe);
    }

    type MessageData = {
      fieldValues: Record<string, string>;
      filteredFieldValues: Record<string, string>;
      serialized: string; // Used as a unique identifier for the message
      text: string;
    };
    const extractMessageData = (element: Element): MessageData | null => {
      const fieldValues = extractFieldValues(element, config.fields);
      const hasContent = Object.values(fieldValues).some(value => value !== '');
      if (!hasContent) return null;

      // Apply field-level filters
      const filteredFieldValues = { ...fieldValues };

      for (const [fieldName, fieldValue] of Object.entries(filteredFieldValues)) {
        const fieldFilters = cachedValues.filters.filter(
          f => f.enabled && f.target === 'field' && f.fieldName === fieldName,
        );
        const result = applyTextFilters(fieldValue, fieldFilters, { fieldName, logger });
        if (result === null) {
          return null;
        }

        filteredFieldValues[fieldName] = result;
      }

      let formattedText = formatText(cachedValues.template, filteredFieldValues);

      // Apply output-level filters
      const outputFilters = cachedValues.filters.filter(f => f.enabled && f.target === 'output');
      const filteredText = applyTextFilters(formattedText, outputFilters, { logger });
      if (filteredText === null) {
        return null;
      }

      formattedText = filteredText;

      // Re-normalize whitespace. formattedText may contain extra spacing from:
      // - formatText: user-supplied format string with multiple spaces
      // - applyTextFilters: text replacements
      return {
        fieldValues,
        filteredFieldValues,
        serialized: formatText(DEFAULT_SPEECH_TEMPLATE, filteredFieldValues),
        text: normalizeWhitespaces(formattedText),
      };
    };

    const messageQueue: string[] = [];
    let isProcessing = false;
    let cancelSpeech: (() => void) | null = null;

    const clearMessageQueue = () => {
      messageQueue.length = 0;
    };

    const processQueue = async () => {
      if (isProcessing || messageQueue.length === 0) {
        return;
      }

      isProcessing = true;

      const { enabled } = await extensionEnabledStorage.get();

      while (enabled && messageQueue.length > 0) {
        const message = messageQueue.shift()!;
        logger.debug(`Start speech: "${message}"`);

        const { promise, cancel } = speakText(message, { logger });
        cancelSpeech = cancel;

        const unsubscribe = extensionEnabledStorage.subscribe(() => {
          const snapshot = extensionEnabledStorage.getSnapshot();
          if (snapshot && !snapshot.enabled) {
            logger.debug('Extension disabled, canceling current speech');
            isProcessing = false;

            clearMessageQueue();

            cancel();
            cancelSpeech = null;
          }
        });

        try {
          const speechResult = await promise;
          if (speechResult) {
            logger.debug(`Finished speech: "${message}"`);
          }
        } catch (error: unknown) {
          if (error instanceof Error) {
            logger.error(`Error during speech: "${message}": ${error.message}`);
          }
        } finally {
          cancelSpeech = null;
          unsubscribe();
        }
      }

      isProcessing = false;
    };

    const queueMessage = (message: string) => {
      logger.debug(`Adding message to queue: "${message}"`);
      messageQueue.push(message);
      processQueue();
    };

    // Set up MutationObserver to watch for new messages
    let hasLoaded = false;

    // Twitch chat inserts nodes for the same message twice, so we need to ignore duplicates
    let lastMessage = '';

    const loadDetectionSelector = config.loadDetectionSelector;
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type !== 'childList') {
          continue;
        }

        // Check if any added nodes match message selector or contain matching elements
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes.item(i)!;
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;

            if (loadDetectionSelector && !hasLoaded) {
              if (element.matches(loadDetectionSelector) || element.querySelector(loadDetectionSelector)) {
                // Prevent messages prior to load being spoken
                // 1-second delay to ensure previous messages are processed
                setTimeout(() => (hasLoaded = true), 1000);
                logger.debug(`[loadDetectionSelector] chat loaded, starting message detection in 1 second.`);
                break;
              }
              continue;
            }

            // Check if the element itself matches the message selector;
            // if not, check if it contains any matching elements
            if (element.matches(config.messageSelector) || element.querySelector(config.messageSelector)) {
              const message = extractMessageData(element);

              if (message) {
                if (ignoreNames?.includes(message.fieldValues.name)) {
                  logger.debug(`Skipping message from user: ${message.fieldValues.name}`);
                  continue;
                }

                // Duplicate message check for Twitch chat
                if (message.serialized !== lastMessage) {
                  lastMessage = message.serialized;
                  queueMessage(message.text);
                }
              }
            }
          }
        }
      }
    });

    observer.observe(containerNode, {
      childList: true,
      subtree: !config.containerSelector, // Only observe subtree if no specific container
    });
    logger.debug('MutationObserver started', { containerNode });

    return () => {
      storageUnsubscriptionFunctions.forEach(unsubscribe => unsubscribe());
      observer.disconnect();

      clearMessageQueue();

      cancelSpeech?.();
      cancelSpeech = null;
    };
  };

// Exporting for chat-test.js
export const main = async () => {
  logger.log('All content script loaded');

  const url = location.href;
  const siteConfig = findSiteConfigByUrl(url);

  // Initialize shim for E2E testing
  // Since `navigator.webdriver` is undefined on service worker,
  // we need to check it in content script.
  if (import.meta.env.VITE_E2E) {
    await initWebDriverShim();
  }

  logger.debug(`Running content script on URL: ${url}`, { enabled: Boolean(siteConfig) });
  if (!siteConfig) {
    return;
  }

  logger.debug(`Site configuration found: ${siteConfig.name}`);

  speechSynthesis.getVoices(); // Ensure voices are loaded on first speechSynthesis.speak call

  const myName = await getMyName(siteConfig.id as SiteId);

  const monitorOptions = { ignoreNames: myName ? [myName] : undefined };
  if (siteConfig.containerSelector) {
    // Twitch destroys/recreates chat containers during navigation,
    // so we need to monitor for the container's appearance/removal
    while (true) {
      const foundContainer = await waitForElementAppearance(siteConfig.containerSelector);

      const monitor = createMonitor(siteConfig, foundContainer, monitorOptions);
      const disposeMonitor = monitor();

      try {
        await waitForElementRemoval(foundContainer);
      } finally {
        disposeMonitor();
      }
    }
  } else {
    const monitor = createMonitor(siteConfig, document.body, monitorOptions);
    monitor();
  }
};

const getMyName = async (id: SiteId): Promise<string | null> => {
  switch (id) {
    case 'youtube': {
      const ytInitialDataScript = Array.from(document.scripts).find(script =>
        script.textContent?.startsWith('window["ytInitialData"]'),
      )?.textContent;
      const ytInitialDataMatch = ytInitialDataScript?.match(/window\["ytInitialData"\]\s*=\s*({.*?});/);
      if (ytInitialDataMatch) {
        try {
          const ytInitialData = JSON.parse(ytInitialDataMatch[1]);
          // You can also obtain channel id from following path:
          // ytInitialData.continuationContents.liveChatContinuation.actionPanel.liveChatMessageInputRenderer.sendButton.buttonRenderer.serviceEndpoint.sendLiveChatMessageEndpoint.actions[0].addLiveChatTextMessageFromTemplateAction.template.liveChatTextMessageRenderer.authorExternalChannelId
          return ytInitialData?.continuationContents?.liveChatContinuation?.viewerName || null;
        } catch {
          /* noop */
        }
      }

      return null;
    }

    case 'twitch': {
      // TODO: Currently, we haven't figured out how to get the current user name from Twitch.
      return null;
    }

    default:
      return null;
  }
};

export default defineContentScript({
  matches: [
    'https://www.youtube.com/live_chat*',
    'https://studio.youtube.com/live_chat*',
    'https://www.twitch.tv/*',
    'https://dashboard.twitch.tv/*',
  ],
  allFrames: true,
  main,
});
