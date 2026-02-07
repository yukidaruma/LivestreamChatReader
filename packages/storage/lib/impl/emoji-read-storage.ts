import { createStorage, StorageEnum } from '../base/index';
import type { EmojiReadStateType, EmojiReadStorageType } from '../base/index';

const storage = createStorage<EmojiReadStateType>(
  'emoji-read-key',
  {
    enabled: true,
  },
  {
    storageEnum: StorageEnum.Sync,
    liveUpdate: true,
  },
);

export const emojiReadStorage: EmojiReadStorageType = {
  ...storage,
  toggle: async () => {
    await storage.set(currentState => ({
      enabled: !currentState.enabled,
    }));
  },
};
