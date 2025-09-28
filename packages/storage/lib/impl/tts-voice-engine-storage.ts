import { createStorage, StorageEnum } from '../base/index';
import type { TtsVoiceEngineStateType, TtsVoiceEngineStorageType } from '../base/index';

const storage = createStorage<TtsVoiceEngineStateType>(
  'tts-voice-engine-key',
  {
    languageDetectionEnabled: false,
    uri: null,
  },
  {
    storageEnum: StorageEnum.Sync,
    liveUpdate: true,
  },
);

export const ttsVoiceEngineStorage: TtsVoiceEngineStorageType = {
  ...storage,
  toggleLanguageDetection: async () => {
    await storage.set(currentState => ({
      ...currentState,
      languageDetectionEnabled: !currentState.languageDetectionEnabled,
    }));
  },
  setUri: async uri => {
    await storage.set(currentState => ({
      ...currentState,
      uri,
    }));
  },
};
