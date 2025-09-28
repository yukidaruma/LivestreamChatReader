/* eslint-disable import-x/exports-last */
import { validateRegex } from '@extension/shared';
import { z } from 'zod';
import type { StorageEnum } from './index';

export type ValueOrUpdateType<D> = D | ((prev: D) => Promise<D> | D);

export type BaseStorageType<D> = {
  key: string;
  get: () => Promise<D>;
  set: (value: ValueOrUpdateType<D>) => Promise<void>;
  getSnapshot: () => D | null;
  subscribe: (listener: () => void) => () => void;
};

export type StorageConfigType<D = string> = {
  /**
   * Assign the {@link StorageEnum} to use.
   * @default Local
   */
  storageEnum?: StorageEnum;
  /**
   * Only for {@link StorageEnum.Session}: Grant Content scripts access to storage area?
   * @default false
   */
  sessionAccessForContentScripts?: boolean;
  /**
   * Keeps state live in sync between all instances of the extension. Like between popup, side panel and content scripts.
   * To allow chrome background scripts to stay in sync as well, use {@link StorageEnum.Session} storage area with
   * {@link StorageConfigType.sessionAccessForContentScripts} potentially also set to true.
   * @see https://stackoverflow.com/a/75637138/2763239
   * @default false
   */
  liveUpdate?: boolean;
  /**
   * An optional props for converting values from storage and into it.
   * @default undefined
   */
  serialization?: {
    /**
     * convert non-native values to string to be saved in storage
     */
    serialize: (value: D) => string;
    /**
     * convert string value from storage to non-native values
     */
    deserialize: (text: string) => D;
  };
};

export type ToggleStorageType<T> = BaseStorageType<T> & {
  toggle: () => Promise<void>;
};

// extension-enabled-storage.ts
export type ExtensionEnabledStateType = {
  enabled: boolean;
};
export type ExtensionEnabledStorageType = ToggleStorageType<ExtensionEnabledStateType>;

// language-storage.ts
export type LanguageStateType = {
  language: string; // must be `SupportedLanguagesKeysType`
};
export type LanguageStorageType = BaseStorageType<LanguageStateType> & {
  setLanguage: (language: string) => Promise<void>;
};

// log-console-storage.ts
export type LogConsoleStateType = {
  enabled: boolean;
};
export type LogConsoleStorageType = ToggleStorageType<LogConsoleStateType>;

// log-storage.ts
export type JSDataType = string | number | JSDataObject | Array<JSDataType>;
type JSDataObject = {
  [key: string]: JSDataType;
};
export type LogEntry = {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: JSDataType;
};
export type LogStateType = {
  entries: LogEntry[];
  maxEntries: number;
};

export type LogStorageType = BaseStorageType<LogStateType> & {
  addEntry: (level: LogEntry['level'], message: string, data?: JSDataType, timestamp?: number) => Promise<void>;
  clearLogs: () => Promise<void>;
  getRecentLogs: (count?: number) => Promise<LogEntry[]>;
};

// Zod schemas for text filter data
const BaseTextFilterSchema = z.object({
  id: z.number(),
  enabled: z.boolean(),
  target: z.enum(['field', 'output']),
  fieldName: z.enum(['name', 'body']).optional(),
  description: z.string().optional(),
  command: z.unknown().optional(),
  replacement: z.unknown().optional(),
  options: z.unknown().optional(),
});

const regexValidation = (data: { isRegex?: boolean; pattern?: string }) => {
  if (data.isRegex && data.pattern) {
    return validateRegex(data.pattern) === null;
  }
  return true;
};
const regexValidationOptions = {
  message: 'Invalid regular expression pattern',
  path: ['pattern'],
};

const PatternFilterSchema = BaseTextFilterSchema.extend({
  type: z.literal('pattern'),
  isRegex: z.boolean().optional(),
  pattern: z.string(),
  replacement: z.string(),
}).refine(regexValidation, regexValidationOptions);

const MuteCommandFilterSchema = BaseTextFilterSchema.extend({
  type: z.literal('command'),
  command: z.literal('mute'),
  isRegex: z.boolean().optional(),
  pattern: z.string().optional(),
  options: z
    .object({
      isNot: z.boolean().optional(),
    })
    .optional(),
}).refine(regexValidation, regexValidationOptions);

const NotifyCommandFilterSchema = BaseTextFilterSchema.extend({
  type: z.literal('command'),
  command: z.literal('notify'),
  isRegex: z.boolean().optional(),
  pattern: z.string().optional(),
  options: z
    .object({
      isNot: z.boolean().optional(),
      silent: z.boolean().optional(),
    })
    .optional(),
}).refine(regexValidation, regexValidationOptions);

const CommandFilterSchema = z.discriminatedUnion('command', [MuteCommandFilterSchema, NotifyCommandFilterSchema]);

export const TextFilterSchema = z.discriminatedUnion('type', [PatternFilterSchema, CommandFilterSchema]);

// Array schema for validating collections of filters
export const TextFiltersArraySchema = z.array(TextFilterSchema).refine(
  data => {
    const seenIds = new Set<number>();
    return !data.some(filter => {
      const hasDuplicate = seenIds.has(filter.id);
      seenIds.add(filter.id);
      return hasDuplicate;
    });
  },
  {
    message: 'All filter IDs must be unique',
  },
);

// Derive types from schemas
export type BaseTextFilter = z.infer<typeof BaseTextFilterSchema>;
export type PatternFilter = z.infer<typeof PatternFilterSchema>;
export type MuteCommandFilter = z.infer<typeof MuteCommandFilterSchema>;
export type NotifyCommandFilter = z.infer<typeof NotifyCommandFilterSchema>;
export type CommandFilter = MuteCommandFilter | NotifyCommandFilter;
export type FilterCommandName = CommandFilter['command'];
export type TextFilter = z.infer<typeof TextFilterSchema>;

export type TextFilterStateType = {
  filters: TextFilter[];
  nextId: number;
};
export type TextFilterStorageType = BaseStorageType<TextFilterStateType> & {
  addFilter: (filterData: Omit<TextFilter, 'id'>) => Promise<TextFilter>;
  removeFilter: (id: number) => Promise<void>;
  updateFilter: (id: number, updates: Partial<Omit<TextFilter, 'id'>>) => Promise<void>;
  reorderFilters: (sourceId: number, targetId: number) => Promise<void>;
};

// speech-template-storage.ts
export type SpeechTemplateStateType = {
  template: string | null; // Template string like "%(name) %(body)"
};
export type SpeechTemplateStorageType = BaseStorageType<SpeechTemplateStateType> & {
  setTemplate: (template: string | null) => Promise<void>;
};

// tts-voice-engine-storage.ts
export type TtsVoiceEngineStateType = {
  uri: string | null; // Voice URI like "Microsoft Ayumi - Japanese (Japan)" or "Google 日本語"
  languageDetectionEnabled: boolean;
};
export type TtsVoiceEngineStorageType = BaseStorageType<TtsVoiceEngineStateType> & {
  setUri: (uri: string | null) => Promise<void>;
  toggleLanguageDetection: () => Promise<void>;
};

// theme-storage.ts
export type ThemeStateType = {
  theme: 'light' | 'dark';
  isLight: boolean;
};
export type ThemeStorageType = ToggleStorageType<ThemeStateType>;

// tts-rate-storage.ts
export type TtsRateStateType = {
  rate: number; // 0.1 to 10.0 (Web Speech API range)
};
export type TtsRateStorageType = BaseStorageType<TtsRateStateType> & {
  setRate: (rate: number) => Promise<void>;
};

// tts-volume-storage.ts
export type TtsVolumeStateType = {
  volume: number; // 0.0 to 1.0
};
export type TtsVolumeStorageType = BaseStorageType<TtsVolumeStateType> & {
  setVolume: (volume: number) => Promise<void>;
};
