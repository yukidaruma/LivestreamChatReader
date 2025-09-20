import { createStorage, StorageEnum } from '../base/index';
import type { TtsRateStateType, TtsRateStorageType } from '../base/index';

const storage = createStorage<TtsRateStateType>(
  'tts-rate-key',
  {
    rate: 1.0,
  },
  {
    storageEnum: StorageEnum.Sync,
    liveUpdate: true,
  },
);

export const ttsRateStorage: TtsRateStorageType = {
  ...storage,
  setRate: async rate => {
    // Clamp rate between 0.1 and 10.0 (Web Speech API limits)
    // See: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/rate
    const clampedRate = Math.max(0.1, Math.min(10.0, rate));
    await storage.set({ rate: clampedRate });
  },
};
