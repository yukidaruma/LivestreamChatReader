import 'webextension-polyfill';
import { updateIcon, logger } from '@extension/shared';
import { extensionEnabledStorage } from '@extension/storage';
import type {
  BackgroundRequest,
  TTSSpeakRequest,
  TTSCancelRequest,
  NotificationRequest,
  InferBackgroundResponse,
} from '@extension/shared';

type SendResponseFunction<T extends BackgroundRequest> = (response: InferBackgroundResponse<T>) => void;
type BackgroundRequestHandler<T extends BackgroundRequest> = (
  request: T,
  sendResponse: SendResponseFunction<T>,
) => void | Promise<void>;

// TTS functionality using browser.tts.speak()
const handleTTSSpeak: BackgroundRequestHandler<TTSSpeakRequest> = async (request, sendResponse) => {
  const { rate, requestId, text, voiceURI, volume } = request.data;

  try {
    // Prepare TTS options
    const ttsOptions: Browser.tts.TtsOptions = {
      rate,
      voiceName: voiceURI ?? undefined,
      volume,
      onEvent: (event: Browser.tts.TtsEvent) => {
        // Filter out verbose TTS events
        if (
          event.type === 'word' ||
          event.type === 'sentence' ||
          event.type === 'marker' ||
          event.type === 'pause' ||
          event.type === 'resume'
        ) {
          return;
        }

        logger.debug(`TTS Event for ${requestId}:`, event.type);

        if (
          event.type === 'end' ||
          event.type === 'cancelled' ||
          event.type === 'error' ||
          event.type === 'interrupted'
        ) {
          // Send response back to content script
          sendResponse({
            type: 'TTS_SPEAK_RESPONSE',
            data: {
              requestId,
              type: event.type,
              success: event.type === 'end',
              error: event.type === 'error' ? 'TTS error occurred' : undefined,
            },
          });
        }
      },
    };

    // Start TTS
    browser.tts.speak(text, ttsOptions);

    logger.debug(`Started TTS for request ${requestId}: "${text}"`);
  } catch (error) {
    logger.error(`TTS error for request ${requestId}:`, error);
    sendResponse({
      type: 'TTS_SPEAK_RESPONSE',
      data: {
        requestId,
        type: 'error',
        success: false,
        error: error instanceof Error ? error.message : `${error}`,
      },
    });
  }
};

const handleTTSCancel: BackgroundRequestHandler<TTSCancelRequest> = (_request, sendResponse) => {
  browser.tts.stop();
  logger.debug('Cancelled all TTS requests');

  sendResponse({
    type: 'TTS_CANCEL_RESPONSE',
    data: {
      success: true,
    },
  });
};

const showNotification: BackgroundRequestHandler<NotificationRequest> = async (request, _sendResponse) => {
  const { title, message, silent } = request.data;

  try {
    await browser.notifications.create({
      type: 'basic',
      iconUrl: '/icons/128.png',
      title,
      message,
      silent,
    });
    logger.debug(`Notification shown: ${title} - ${message}${silent ? ' (silent)' : ''}`);
  } catch (error) {
    logger.error('Failed to show notification:', error);
  }
};

const setWebDriverShim = () => {
  browser.tts.speak = function (_utterance: string, options?: Browser.tts.TtsOptions) {
    // It is necessary to resolve the promise returned. The extension's
    // message queuing logic relies on the promise resolution.
    // This spy allows us to monitor the calls without breaking the sequence.

    // Simulate TTS completion after 100ms
    setTimeout(() => {
      options?.onEvent?.({ type: 'end' } satisfies Browser.tts.TtsEvent);
      return Promise.resolve();
    }, 100);
  } as typeof browser.tts.speak;

  console.log('[SPEAKTEXT_MONITOR] browser.tts.speak shim set up successfully');
};

export default defineBackground(() => {
  // Handle commands (keyboard shortcuts) for the extension
  browser.commands.onCommand.addListener(command => {
    logger.log('Command received:', command);

    if (command === 'toggle-activation') {
      extensionEnabledStorage.toggle().then(updateIcon);
    }
  });

  // Message listener for TTS commands
  browser.runtime.onMessage.addListener(
    (message: BackgroundRequest, _sender, sendResponse: SendResponseFunction<BackgroundRequest>) => {
      // See: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage#sending_an_asynchronous_response_using_sendresponse

      // To make `setWebDriverShim` tree-shakable, we use environment variable
      if (import.meta.env.VITE_E2E && message.type === 'SET_WEBDRIVER_SHIM_REQUEST') {
        setWebDriverShim();
        return false;
      }

      logger.debug('Background received message:', message.type, message.data);

      switch (message.type) {
        case 'NOTIFICATION_REQUEST':
          showNotification(message, sendResponse);
          return false;

        case 'TTS_SPEAK_REQUEST':
          handleTTSSpeak(message, sendResponse);
          return true;

        case 'TTS_CANCEL_REQUEST':
          handleTTSCancel(message, sendResponse);
          return true;

        default:
          return false;
      }
    },
  );

  console.log('Background script loaded.');
});
