import { t, unsafeT, useStorage } from '@extension/shared';
import { textFilterStorage } from '@extension/storage';
import { Dialog, IconButton, LabeledToggleButton, icons, useConfirm } from '@extension/ui';
import { useState, useEffect } from 'react';
import type { FilterCommandName, TextFilter } from '@extension/storage';

const validateRegex = (pattern: string): string | null => {
  try {
    new RegExp(pattern);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid regular expression';
  }
};

type TextFilterWithoutId = Omit<TextFilter, 'id'>;

interface FilterRuleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (filter: TextFilterWithoutId) => void;
  initialFilter?: TextFilter | null;
}

const DEFAULT_FILTER_VALUES = {
  type: 'pattern' as const,
  target: 'output' as const,
  fieldName: 'name',
  pattern: '',
  replacement: '',
  isRegex: false,
  command: 'mute' as const,
};

const FilterSetting = () => {
  const { filters } = useStorage(textFilterStorage);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<TextFilter | null>(null);
  const confirm = useConfirm();

  const addRule = () => {
    setEditingFilter(null);
    setIsDialogOpen(true);
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
    } else {
      // Add new rule
      await textFilterStorage.addFilter(filterData);
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

    try {
      await textFilterStorage.removeFilter(id);
    } catch (error) {
      console.error('Failed to delete filter:', error);
    }
  };

  return (
    <div className="text-sm">
      <p className="mb-4">
        <button onClick={() => (location.hash = '')}>{t('backToSettings')}</button>
      </p>

      <div className="flex items-center justify-between">
        <h1 className="mb-0! text-xl font-bold">{t('filterSettings')}</h1>
        <button onClick={addRule} className="flex items-center space-x-2 text-base">
          <icons.Add size="16" color="var(--text-primary)" />
          <span>{t('addRule')}</span>
        </button>
      </div>

      <div className="mt-8 space-y-3">
        {filters.length === 0 ? (
          <div className="text-secondary text-left">{t('noFilters')}</div>
        ) : (
          <>
            <p className="text-secondary mt-8 text-sm">{t('filterOrderNote')}</p>
            {filters.map(rule => (
              <div key={rule.id} className="flex items-center space-x-2">
                <div
                  onClick={() => startEditing(rule.id)}
                  className="flex min-h-12 flex-1 cursor-pointer items-center border border-transparent p-2 font-mono hover:bg-[var(--bg-secondary)]"
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      startEditing(rule.id);
                    }
                  }}>
                  <div>
                    {rule.target === 'field' && <span className="text-secondary">[{unsafeT(rule.fieldName!)}]</span>}
                    <div className="flex items-center space-x-2">
                      {rule.type === 'pattern' && (
                        <>
                          <span>{rule.pattern}</span>
                          <span>→</span>
                          {rule.replacement ? (
                            <span>{rule.replacement}</span>
                          ) : (
                            <span className="text-secondary">{t('empty')}</span>
                          )}
                        </>
                      )}
                      {rule.type === 'command' && (
                        <>
                          <code>{rule.command}</code>
                          <span>{rule.pattern && rule.pattern}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <IconButton
                  icon={icons.Close}
                  onClick={() => deleteRule(rule.id)}
                  className="hover:bg-red-500/20!"
                  color="var(--color-red-600)"
                  outline
                  title={t('delete')}
                />
              </div>
            ))}
          </>
        )}
      </div>

      <FilterRuleDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
        }}
        onSave={saveRule}
        initialFilter={editingFilter}
      />
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
  const [regexError, setRegexError] = useState<string | null>(null);

  // Initialize form with initial filter data
  useEffect(() => {
    if (!isOpen) return;

    const values = { ...DEFAULT_FILTER_VALUES, ...initialFilter };

    setFilterType(values.type);
    setTarget(values.target);
    setFieldName(values.fieldName);
    setPattern(values.pattern);
    setReplacement(values.replacement);
    setIsRegex(values.isRegex);
    setCommand(values.command);
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

    setFilterType(value as TextFilter['type']);
    if (value === 'command') {
      const selectedOption = e.target.selectedOptions[0];
      const commandType = selectedOption.getAttribute('data-command') as FilterCommandName;
      setCommand(commandType);
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
      ...(filterType === 'command' && { command }),
    } as TextFilterWithoutId;

    onSave(filterData);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <div className="input-full space-y-4 text-sm">
        <label className="block">
          <span className="mb-2 block font-medium">{t('filterType')}</span>
          <select value={filterType} onChange={handleFilterTypeChange} className="rounded border border-gray-300">
            <option value="pattern">{t('textPattern')}</option>
            <option value="command" data-command="mute">
              {t('muteCommand', ['mute', t('commandDescription_mute')])}
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
          {regexError && <div className="mt-1 text-red-600">{regexError}</div>}
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

        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!isOpen || !!regexError || pattern.trim() === ''}
            className="button-bg-blue rounded px-4 py-2">
            {initialFilter ? t('save') : t('addRule')}
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default FilterSetting;
