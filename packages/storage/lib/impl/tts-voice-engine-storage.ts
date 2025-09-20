import { createStorage, StorageEnum } from '../base/index';
import type { TtsVoiceEngineStateType, TtsVoiceEngineStorageType } from '../base/index';

const storage = createStorage<TtsVoiceEngineStateType>(
  'tts-voice-engine-key',
  {
    uri: null,
  },
  {
    storageEnum: StorageEnum.Sync,
    liveUpdate: true,
  },
);

export const ttsVoiceEngineStorage: TtsVoiceEngineStorageType = {
  ...storage,
  setUri: async uri => {
    await storage.set({ uri });
  },
};
