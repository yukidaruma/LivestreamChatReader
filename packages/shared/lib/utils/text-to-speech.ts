import { ttsVolumeStorage } from '@extension/storage';
import type { logger as loggerType } from './logger';
import type { BackgroundRequest, InferBackgroundResponse, TTSSpeakRequest } from './message-types';

// Helper function to generate unique request ID (non-cryptographically secure)
const generateRequestId = (): string => `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

// Helper function to send TTS messages to background script via `browser.runtime.sendMessage`
const sendTTSMessage = <T extends BackgroundRequest>(message: T): Promise<InferBackgroundResponse<T>> =>
  browser.runtime.sendMessage<T, InferBackgroundResponse<T>>(message);

type CancellableSpeech = {
  promise: Promise<boolean>; // Resolves to true if speech completed successfully, false if cancelled
  cancel: () => Promise<void>;
};

export const speakText = (
  text: string,
  voiceURI: string | null,
  { logger }: { logger?: typeof loggerType } = {},
): CancellableSpeech => {
  const requestId = generateRequestId();
  let resolved = false;

  // Build the TTS request data

  const speakRequestData: TTSSpeakRequest['data'] = {
    text,
    voiceURI,
    requestId,
  };

  const { volume } = ttsVolumeStorage.getSnapshot() ?? {};
  if (volume) {
    speakRequestData.volume = volume;
  }

  // Create the cancellable promise for TTS operation

  // Store resolve function to allow external cancellation of the promise
  let resolvePromise: (value: boolean) => void;

  const promise = new Promise<boolean>((resolve, reject) => {
    resolvePromise = resolve;

    // Send TTS request to background script
    sendTTSMessage({
      type: 'TTS_SPEAK_REQUEST',
      data: speakRequestData,
    })
      .then(response => {
        if (!resolved) {
          resolved = true;
          if (response?.data?.success) {
            logger?.debug(`Background TTS completed for request ${requestId}`);
            resolve(true);
          } else {
            const error = response?.data?.error ?? 'Unknown TTS error';
            reject(new Error(error));
          }
        }
      })
      .catch(error => {
        if (!resolved) {
          resolved = true;
          if (error instanceof Error) {
            logger?.error(`Background TTS error for request ${requestId}: ${error.message}`);
          }
          reject(error);
        }
      });
  });

  const cancel = async () => {
    if (!resolved) {
      resolved = true;
      logger?.debug(`Cancelling TTS request ${requestId}`);

      try {
        // Send cancel message to background script
        // Note: Since we don't queue multiple messages at once, cancelling all TTS requests effectively cancels this single request
        await sendTTSMessage({
          type: 'TTS_CANCEL_REQUEST',
        });
      } catch (error) {
        logger?.error(`Error cancelling TTS request ${requestId}:`, error);
      }

      resolvePromise(false);
    }
  };

  return { promise, cancel };
};

export const initWebDriverShim = async () => {
  await sendTTSMessage({
    type: 'SET_WEBDRIVER_SHIM_REQUEST',
  });
};
