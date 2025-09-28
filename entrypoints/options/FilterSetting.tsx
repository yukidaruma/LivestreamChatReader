import { JsonFilterEditor } from './JsonFilterEditor';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { t, unsafeT, validateRegex } from '@extension/shared';
import { textFilterStorage } from '@extension/storage';
import { Dialog, IconButton, LabeledToggleButton, handleKeyboardClick, icons, useConfirm } from '@extension/ui';
import { useState, useEffect } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import type { FilterCommandName, TextFilter } from '@extension/storage';

type TextFilterWithoutId = Omit<TextFilter, 'id'>;

type FilterPreset = {
  name: string;
  description: string;
  filter: TextFilterWithoutId;
};

const DEFAULT_FILTER_VALUES = {
  type: 'pattern' as const,
  target: 'output' as const,
  fieldName: 'name',
  pattern: '',
  replacement: '',
  enabled: true,
  isRegex: false,
} satisfies TextFilterWithoutId;

const FILTER_PRESETS: FilterPreset[] = [
  {
    name: t('presetAllowlistUser'),
    description: t('presetAllowlistUserDescription'),
    filter: {
      enabled: true,
      type: 'command',
      command: 'mute',
      target: 'field',
      fieldName: 'name',
      pattern: t('placeholder_replaceMe'),
      isRegex: false,
      options: {
        isNot: true,
      },
    },
  },
  {
    name: t('presetUrlBlock'),
    description: t('presetUrlBlockDescription'),
    filter: {
      enabled: true,
      type: 'command',
      command: 'mute',
      target: 'output',
      pattern: 'https?://[^\\s]+',
      isRegex: true,
    },
  },
  {
    name: t('presetUrlToLink'),
    description: t('presetUrlToLinkDescription'),
    filter: {
      enabled: true,
      type: 'pattern',
      target: 'output',
      pattern: 'https?://[^\\s]+',
      replacement: t('linkReplacement'),
      isRegex: true,
    },
  },
  {
    name: t('presetLimitLength'),
    description: t('presetLimitLengthDescription'),
    filter: {
      enabled: true,
      type: 'pattern',
      target: 'output',
      pattern: '^(.{20}).*$',
      replacement: '$1',
      isRegex: true,
    },
  },
];

type SortableFilterItemProps = {
  filter: TextFilter;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

const SortableFilterItem = ({ filter, onEdit, onDelete }: SortableFilterItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: filter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center space-x-2">
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab rounded p-1 hover:bg-[var(--bg-secondary)] active:cursor-grabbing">
        <icons.Menu size="16" color="var(--text-secondary)" />
      </div>
      <div
        onClick={() => onEdit(filter.id)}
        className="flex min-h-12 flex-1 cursor-pointer items-center border border-transparent p-2 font-mono hover:bg-[var(--bg-secondary)]"
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyboardClick}>
        <div>
          {filter.target === 'field' && (
            <span className="text-secondary">
              [{t('filterTarget')} {unsafeT(filter.fieldName!)}]
            </span>
          )}
          <div className="flex items-center space-x-2">
            {filter.type === 'pattern' && (
              <>
                <span>{filter.pattern}</span>
                <span>→</span>
                {filter.replacement ? (
                  <span>{filter.replacement}</span>
                ) : (
                  <span className="text-secondary">{t('empty')}</span>
                )}
              </>
            )}
            {filter.type === 'command' && (
              <>
                <code>{filter.command}</code>
                {filter.options?.isNot && <span className="font-bold">NOT</span>}
                <span>{filter.pattern && filter.pattern}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <IconButton
        icon={icons.Close}
        onClick={() => onDelete(filter.id)}
        className="hover:bg-red-500/20!"
        color="var(--color-red-600)"
        outline
        title={t('delete')}
      />
    </div>
  );
};

type FilterRuleDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (filter: TextFilterWithoutId) => void;
  initialFilter?: TextFilter | null;
};

const FilterSetting = () => {
  // Manage filters as a state;
  // As the storage operation is async, reordering animation will be janky if we read from storage directly.
  const [filters, setFilters] = useState<TextFilter[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [editingFilter, setEditingFilter] = useState<TextFilter | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    const { filters: storedFilters } = textFilterStorage.getSnapshot() ?? { filters: [] };
    setFilters(storedFilters);
  }, []);

  const addRule = () => {
    setEditingFilter(null);
    setIsDialogOpen(true);
  };

  const openPresetDialog = () => {
    setIsPresetDialogOpen(true);
  };

  const toggleDeveloperMode = () => {
    setIsDeveloperMode(!isDeveloperMode);
  };

  const applyPreset = async (preset: FilterPreset) => {
    const newFilter = await textFilterStorage.addFilter(preset.filter);
    setFilters(prev => [...prev, newFilter]);
    setIsPresetDialogOpen(false);
  };

  const startEditing = (id: number) => {
    const filter = filters.find(f => f.id === id)!;
    setEditingFilter(filter);
    setIsDialogOpen(true);
  };

  const saveRule = async (filterData: TextFilterWithoutId) => {
    if (editingFilter) {
      // Edit existing rule
      await textFilterStorage.updateFilter(editingFilter.id, filterData);
      setFilters(prev => prev.map(f => (f.id === editingFilter.id ? ({ ...f, ...filterData } as TextFilter) : f)));
    } else {
      // Add new rule
      const newFilter = await textFilterStorage.addFilter(filterData);
      setFilters(prev => [...prev, newFilter]);
    }

    setEditingFilter(null);
    setIsDialogOpen(false);
  };

  const deleteRule = async (id: number) => {
    const filter = filters.find(f => f.id === id)!;

    const descriptionParts = [];
    if (filter.type === 'command') {
      descriptionParts.push(`${t('command')}: ${filter.command}`);
    }
    descriptionParts.push(`${t('filterPattern')}: ${filter.pattern}`);
    if (filter.type !== 'command') {
      const replacementText = filter.replacement || t('empty');
      descriptionParts.push(`${t('filterReplacement')}: ${replacementText}`);
    }
    const filterDescription = descriptionParts.join(', ');

    const confirmed = await confirm({
      title: t('delete'),
      message: t('confirmDeleteFilterRule', filterDescription),
      confirmText: t('delete'),
      cancelText: t('cancel'),
      confirmButtonClassName: 'button-bg-red',
    });

    if (!confirmed) return;

    await textFilterStorage.removeFilter(id);
    setFilters(prev => prev.filter(f => f.id !== id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const {
      active: { id: activeId },
      over,
    } = event;

    if (over && activeId !== over.id) {
      const activeIndex = filters.findIndex(f => f.id === activeId);
      const overIndex = filters.findIndex(f => f.id === over.id);

      if (activeIndex !== -1 && overIndex !== -1) {
        // Update local state immediately for smooth UI
        const newFilters = [...filters];
        const [movedItem] = newFilters.splice(activeIndex, 1);
        newFilters.splice(overIndex, 0, movedItem);
        setFilters(newFilters);

        await textFilterStorage.reorderFilters(activeId as number, over.id as number);
      }
    }
  };

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between">
        <h1 className="mb-0! text-xl leading-9 font-bold">{t('filterSettings')}</h1>
        <div className="flex items-center space-x-2">
          {!isDeveloperMode && (
            <>
              <button onClick={openPresetDialog} className="flex items-center space-x-2 text-xs">
                <span>{t('usePreset')}</span>
              </button>
              <button onClick={addRule} className="flex items-center space-x-2 text-xs">
                <icons.Add size="16" color="var(--text-primary)" />
                <span>{t('addRule')}</span>
              </button>
            </>
          )}
          <LabeledToggleButton
            checked={isDeveloperMode}
            onChange={toggleDeveloperMode}
            description={t('developerMode')}
          />
        </div>
      </div>

      {isDeveloperMode ? (
        <JsonFilterEditor filters={filters} onClose={toggleDeveloperMode} onFiltersUpdate={setFilters} />
      ) : (
        <div className="mt-8 space-y-3">
          {filters.length === 0 ? (
            <div className="text-secondary text-left">{t('noFilters')}</div>
          ) : (
            <>
              <p className="text-secondary mt-8 text-sm">{t('filterOrderNote')}</p>
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filters.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {filters.map(rule => (
                      <SortableFilterItem key={rule.id} filter={rule} onEdit={startEditing} onDelete={deleteRule} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}
        </div>
      )}

      <FilterRuleDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
        }}
        onSave={saveRule}
        initialFilter={editingFilter}
      />

      <Dialog isOpen={isPresetDialogOpen} onClose={() => setIsPresetDialogOpen(false)} title={t('presetDialogTitle')}>
        <div className="space-y-4">
          <p className="text-secondary text-sm">{t('selectFilterPreset')}</p>
          <p className="text-secondary text-xs">{t('presetUsageHint')}</p>
          <div className="space-y-3">
            {FILTER_PRESETS.map((preset, index) => (
              <div
                key={index}
                className="cursor-pointer rounded border border-gray-300 p-3 hover:bg-[var(--bg-secondary)]"
                role="button"
                tabIndex={0}
                onClick={() => applyPreset(preset)}
                onKeyDown={handleKeyboardClick}>
                <h3 className="font-medium">{preset.name}</h3>
                <p className="text-secondary mt-1 text-sm">{preset.description}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-end space-x-3">
            <button onClick={() => setIsPresetDialogOpen(false)}>{t('cancel')}</button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

const FilterRuleDialog = ({ isOpen, onClose, onSave, initialFilter }: FilterRuleDialogProps) => {
  const [filterType, setFilterType] = useState<TextFilter['type']>('pattern');
  const [target, setTarget] = useState<TextFilter['target']>('output');
  const [fieldName, setFieldName] = useState('name');
  const [pattern, setPattern] = useState('');
  const [replacement, setReplacement] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [command, setCommand] = useState<FilterCommandName>('mute');
  const [conditionNot, setConditionNot] = useState(false);
  const [notifySilent, setNotifySilent] = useState(false);
  const [regexError, setRegexError] = useState<string | null>(null);

  // Initialize form with initial filter data
  useEffect(() => {
    if (!isOpen) return;

    const values = { ...DEFAULT_FILTER_VALUES, ...initialFilter };

    setFilterType(values.type);
    setTarget(values.target);
    setFieldName(values.fieldName);
    setPattern(values.pattern);
    setIsRegex(values.isRegex);
    if (values.type === 'pattern') {
      setReplacement(values.replacement);
    }
    if (values.type === 'command') {
      setCommand(values.command);
      setConditionNot(values.options?.isNot ?? false);
      if (values.command === 'notify') {
        setNotifySilent(values.options?.silent ?? false);
      }
    }
    setRegexError(null);
  }, [isOpen, initialFilter]);

  const handlePatternChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPattern = e.target.value;
    setPattern(newPattern);

    if (isRegex) {
      setRegexError(validateRegex(newPattern));
    } else {
      setRegexError(null);
    }
  };

  const handleRegexToggle = () => {
    const newIsRegex = !isRegex;
    setIsRegex(newIsRegex);

    if (newIsRegex) {
      setRegexError(validateRegex(pattern));
    } else {
      setRegexError(null);
    }
  };

  const handleFilterTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === 'pattern') {
      setFilterType('pattern');
    } else if (value.startsWith('command:')) {
      setFilterType('command');
      const commandType = value.split(':')[1] as FilterCommandName;
      setCommand(commandType);

      // Reset command-specific options
      if (commandType === 'notify') {
        setNotifySilent(false);
      }
    }
  };

  const handleSave = () => {
    if (pattern.trim() === '' || regexError) return;

    const filterData: TextFilterWithoutId = {
      enabled: true,
      target,
      type: filterType,
      pattern: pattern.trim(),
      isRegex,
      ...(target === 'field' && { fieldName }),
      ...(filterType === 'pattern' && { replacement: replacement.trim() }),
      ...(filterType === 'command' && {
        command,
        options: {
          ...(command === 'mute' && { isNot: conditionNot }),
          ...(command === 'notify' && {
            isNot: conditionNot,
            silent: notifySilent,
          }),
        },
      }),
    } as TextFilterWithoutId;

    onSave(filterData);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <div className="input-full space-y-4 text-sm">
        <label className="block">
          <span className="mb-2 block font-medium">{t('filterType')}</span>
          <select
            value={filterType === 'command' ? `command:${command}` : filterType}
            onChange={handleFilterTypeChange}
            className="rounded border border-gray-300">
            <option value="pattern">{t('textPattern')}</option>
            <option value="command:mute">{t('commandDescription', ['mute', t('commandDescription_mute')])}</option>
            <option value="command:notify">
              {t('commandDescription', ['notify', t('commandDescription_notify')])}
            </option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block font-medium">{t('filterTarget')}</span>
          <select
            value={target === 'field' ? 'field' : target}
            onChange={e => {
              const value = e.target.value as TextFilter['target'];

              setTarget(value);
              if (value === 'field') {
                const selectedOption = e.target.selectedOptions[0];
                const fieldType = selectedOption.getAttribute('data-field')!;
                setFieldName(fieldType);
              }
            }}
            className="rounded border border-gray-300">
            <option value="output">{t('targetOutput')}</option>
            <option value="field" data-field="name">
              {t('name')}
            </option>
            <option value="field" data-field="body">
              {t('body')}
            </option>
          </select>
        </label>

        <div>
          <LabeledToggleButton
            checked={isRegex}
            onChange={handleRegexToggle}
            description={t('useRegularExpression')}
            srOnlyLabel={isRegex ? t('enabled') : t('disabled')}
          />
        </div>

        <label className="block">
          <span className="mb-2 block font-medium">
            {t('filterPattern')} ({t('filterPatternHint')})
          </span>
          <input
            type="text"
            value={pattern}
            onChange={handlePatternChange}
            className="rounded border border-gray-300"
          />
          {regexError && <div className="mt-1 text-red-500">{regexError}</div>}
        </label>

        {filterType === 'pattern' && (
          <label className="block">
            <span className="mb-2 block font-medium">
              {t('filterReplacement')} ({t('filterReplacementHint')})
            </span>
            <input
              type="text"
              value={replacement}
              onChange={e => setReplacement(e.target.value)}
              placeholder={isRegex ? '$1' : ''}
              className="rounded border border-gray-300"
            />
          </label>
        )}

        {filterType === 'command' && (
          <>
            <div>
              <LabeledToggleButton
                checked={conditionNot}
                onChange={() => setConditionNot(prev => !prev)}
                description={t('invertFilterPattern')}
                srOnlyLabel={conditionNot ? t('enabled') : t('disabled')}
              />
            </div>
            {command === 'notify' && (
              <div>
                <LabeledToggleButton
                  checked={notifySilent}
                  onChange={() => setNotifySilent(prev => !prev)}
                  description={t('silentNotification')}
                  srOnlyLabel={notifySilent ? t('enabled') : t('disabled')}
                />
              </div>
            )}
          </>
        )}

        <div className="flex justify-end space-x-3">
          <button onClick={onClose}>{t('cancel')}</button>
          <button
            onClick={handleSave}
            disabled={!isOpen || !!regexError || pattern.trim() === ''}
            className="button-bg-blue">
            {initialFilter ? t('save') : t('addRule')}
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default FilterSetting;
