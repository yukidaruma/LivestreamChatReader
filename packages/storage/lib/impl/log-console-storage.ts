import { createStorage, StorageEnum } from '../base/index';
import type { LogConsoleStateType, LogConsoleStorageType } from '../base/index';

const storage = createStorage<LogConsoleStateType>(
  'log-console-storage-key',
  {
    enabled: false,
  },
  {
    storageEnum: StorageEnum.Sync,
    liveUpdate: true,
  },
);

export const logConsoleStorage: LogConsoleStorageType = {
  ...storage,
  toggle: async () => {
    await storage.set(currentState => ({
      enabled: !currentState.enabled,
    }));
  },
};
