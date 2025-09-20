import { createStorage, StorageEnum } from '../base/index';
import type { ExtensionEnabledStateType, ExtensionEnabledStorageType } from '../base/index';

const storage = createStorage<ExtensionEnabledStateType>(
  'extension-enabled-key',
  {
    enabled: true,
  },
  {
    storageEnum: StorageEnum.Sync,
    liveUpdate: true,
  },
);

export const extensionEnabledStorage: ExtensionEnabledStorageType = {
  ...storage,
  toggle: async () => {
    await storage.set(currentState => ({
      enabled: !currentState.enabled,
    }));
  },
};
