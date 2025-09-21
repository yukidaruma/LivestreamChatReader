type GetMessageParameters = Parameters<typeof browser.i18n.getMessage>;

export const t: typeof browser.i18n.getMessage = (...args: GetMessageParameters) => browser.i18n.getMessage(...args);

export const unsafeT = (key: string, substitutions?: string | string[]): string =>
  browser.i18n.getMessage(key as GetMessageParameters[0], substitutions);

export const supportedLanguages = {
  en: 'English',
  ja: '日本語',
} as const;
