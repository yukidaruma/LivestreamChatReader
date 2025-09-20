import { createStorage, StorageEnum } from '../base/index';
import type { LanguageStateType, LanguageStorageType } from '../base/index';

const storage = createStorage<LanguageStateType>(
  'language-storage-key',
  {
    language: 'en',
  },
  {
    storageEnum: StorageEnum.Sync,
    liveUpdate: true,
  },
);

export const languageStorage: LanguageStorageType = {
  ...storage,
  setLanguage: async language => {
    await storage.set({ language });
  },
};
