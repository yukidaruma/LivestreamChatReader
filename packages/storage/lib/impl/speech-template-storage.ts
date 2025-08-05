import { createStorage, StorageEnum } from '../base/index.js';
import type { SpeechTemplateStateType, SpeechTemplateStorageType } from '../base/index.js';

const storage = createStorage<SpeechTemplateStateType>(
  'speech-template-key',
  {
    template: null,
  },
  {
    storageEnum: StorageEnum.Sync,
    liveUpdate: true,
  },
);

export const speechTemplateStorage: SpeechTemplateStorageType = {
  ...storage,
  setTemplate: async template => {
    await storage.set({ template });
  },
};
