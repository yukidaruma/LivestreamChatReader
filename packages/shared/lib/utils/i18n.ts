export const t: typeof browser.i18n.getMessage = (...args: Parameters<typeof browser.i18n.getMessage>) =>
  browser.i18n.getMessage(...args);

export const supportedLanguages = {
  en: 'English',
  ja: '日本語',
} as const;
