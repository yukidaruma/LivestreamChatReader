declare global {
  interface Window {
    // https://developer.chrome.com/docs/ai/language-detection
    LanguageDetector?: {
      availability: () => Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
      create: () => Promise<{
        detect: (text: string) => Promise<{ detectedLanguage: string; confidence: number }[]>;
      }>;
    };
  }

  const LanguageDetector = window.LanguageDetector;
}

export {};
