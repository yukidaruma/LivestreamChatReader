import { createStorage, StorageEnum } from '../base/index';
import type { TextFilterStateType, TextFilterStorageType, TextFilter } from '../base/index';

const storage = createStorage<TextFilterStateType>(
  'text-filter-key',
  {
    filters: [],
    nextId: 1,
  },
  {
    storageEnum: StorageEnum.Sync,
    liveUpdate: true,
  },
);

export const textFilterStorage: TextFilterStorageType = {
  ...storage,
  addFilter: async filterData => {
    const { filters, nextId } = await storage.get();
    const newFilter = {
      ...filterData,
      id: nextId,
    } as TextFilter;
    await storage.set({
      filters: [...filters, newFilter],
      nextId: nextId + 1,
    });
    return newFilter;
  },
  removeFilter: async id => {
    const { filters, nextId } = await storage.get();
    await storage.set({
      filters: filters.filter(f => f.id !== id),
      nextId,
    });
  },
  updateFilter: async (id, updates) => {
    const { filters, nextId } = await storage.get();
    const updatedFilters = filters.map(f => (f.id === id ? ({ ...f, ...updates } as TextFilter) : f));
    await storage.set({
      filters: updatedFilters,
      nextId,
    });
  },
  reorderFilters: async (sourceId, targetId) => {
    const { filters, nextId } = await storage.get();
    const sourceIndex = filters.findIndex(f => f.id === sourceId);
    const targetIndex = filters.findIndex(f => f.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const reorderedFilters = [...filters];
    const [movedItem] = reorderedFilters.splice(sourceIndex, 1);
    reorderedFilters.splice(targetIndex, 0, movedItem);

    await storage.set({
      filters: reorderedFilters,
      nextId,
    });
  },
};
