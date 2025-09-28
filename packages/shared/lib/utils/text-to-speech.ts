import { ttsRateStorage, ttsVoiceEngineStorage, ttsVolumeStorage } from '@extension/storage';
import type { logger as loggerType } from './logger';
import type { BackgroundRequest, InferBackgroundResponse, TTSSpeakRequest } from './message-types';

const languageDetector = self.LanguageDetector?.create();

// Helper function to generate unique request ID (non-cryptographically secure)
const generateRequestId = (): string => `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

// Helper function to send TTS messages to background script via `browser.runtime.sendMessage`
const sendTTSMessage = <T extends BackgroundRequest>(message: T): Promise<InferBackgroundResponse<T>> =>
  browser.runtime.sendMessage<T, InferBackgroundResponse<T>>(message);

// Language detection using Chrome Built-in AI API
const detectLanguage = async (text: string, logger?: typeof loggerType): Promise<string | null> => {
  if (!languageDetector) {
    logger?.debug('LanguageDetector is not available');
    return null;
  }

  try {
    const detector = await languageDetector;
    const results = await detector.detect(text);

    const topResult = results[0];
    logger?.debug(`Detected language: ${topResult.detectedLanguage} (confidence: ${topResult.confidence})`);
    return topResult.detectedLanguage;
  } catch (error) {
    logger?.debug('Language detection failed:', error);
  }

  return null;
};

// Find best voice for detected language
const findVoiceForLanguage = (detectedLang: string, logger?: typeof loggerType): string => {
  // Filter to only Google voices for better quality
  const voices = speechSynthesis
    .getVoices()
    .filter(voice => voice.name.includes('Google'))
    .map(v => ({
      name: v.name,
      lang: v.lang.toLowerCase(),
      voiceURI: v.voiceURI,
    }));

  const findVoiceForLang = (lang: string) => {
    // First, try exact match. If no exact match, try language prefix (e.g., 'en' for 'en-US')
    let foundVoice = voices.find(voice => voice.lang === lang);
    if (!foundVoice) {
      const langPrefix = lang.split('-')[0];
      foundVoice = voices.find(voice => voice.lang.startsWith(langPrefix));
    }
    return foundVoice;
  };

  const foundVoice = findVoiceForLang(detectedLang.toLowerCase());
  if (foundVoice) {
    logger?.debug(`Found voice for language ${detectedLang}: ${foundVoice.name} (${foundVoice.lang})`);
    return foundVoice.voiceURI;
  }

  const fallbackVoice = findVoiceForLang(navigator.language.toLocaleLowerCase()) ?? voices[0];
  logger?.debug(
    `No voice found for language: ${detectedLang}. Falling back to default voice (${fallbackVoice.voiceURI}).`,
  );
  return fallbackVoice.voiceURI;
};

type CancellableSpeech = {
  promise: Promise<boolean>; // Resolves to true if speech completed successfully, false if cancelled
  cancel: () => Promise<void>;
};

export const speakText = (
  text: string,
  { logger, bodyText }: { logger?: typeof loggerType; bodyText?: string } = {},
): CancellableSpeech => {
  const requestId = generateRequestId();
  let resolved = false;

  // Build the TTS request data

  const { uri: voiceURI, languageDetectionEnabled } = ttsVoiceEngineStorage.getSnapshot() ?? {
    uri: '',
    languageDetectionEnabled: false,
  };

  // Create the cancellable promise for TTS operation
  // Store resolve function to allow external cancellation of the promise
  let resolvePromise: (value: boolean) => void;

  const createSpeakRequest = (voiceURI: string | null) => {
    const speakRequestData: TTSSpeakRequest['data'] = {
      text,
      voiceURI,
      requestId,
    };

    const { rate } = ttsRateStorage.getSnapshot() ?? {};
    if (rate) {
      speakRequestData.rate = rate;
    }

    const { volume } = ttsVolumeStorage.getSnapshot() ?? {};
    if (volume) {
      speakRequestData.volume = volume;
    }

    return speakRequestData;
  };

  const handleSpeakRequest = (speakRequestData: TTSSpeakRequest['data']) =>
    sendTTSMessage({
      type: 'TTS_SPEAK_REQUEST',
      data: speakRequestData,
    }).then(response => {
      if (!resolved) {
        resolved = true;
        if (response?.data?.success) {
          logger?.debug(`Background TTS completed for request ${requestId}`);
          resolvePromise(true);
        } else {
          const error = response?.data?.error ?? 'Unknown TTS error';
          throw new Error(error);
        }
      }
    });

  const promise = new Promise<boolean>((resolve, reject) => {
    resolvePromise = resolve;

    const handleError = (error: unknown) => {
      if (!resolved) {
        resolved = true;
        if (error instanceof Error) {
          logger?.error(`Background TTS error for request ${requestId}: ${error.message}`);
        }
        reject(error);
      }
    };

    // Determine voice to use
    let finalVoiceURI = voiceURI;

    if (languageDetectionEnabled) {
      // If enabled, use language detection preferably on body text
      const textToDetect = bodyText || text;
      detectLanguage(textToDetect, logger)
        .then(detectedLang => {
          if (detectedLang) {
            const languageVoiceURI = findVoiceForLanguage(detectedLang, logger);
            finalVoiceURI = languageVoiceURI;
          }
          return createSpeakRequest(finalVoiceURI);
        })
        .then(handleSpeakRequest)
        .catch(handleError);
    } else {
      const speakRequestData = createSpeakRequest(finalVoiceURI ?? '');
      handleSpeakRequest(speakRequestData).catch(handleError);
    }
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
