import { t } from '@extension/shared';
import { TextFiltersArraySchema, textFilterStorage } from '@extension/storage';
import { AlertWarning } from '@extension/ui';
import { useState } from 'react';
import type { TextFilter } from '@extension/storage';

type JsonFilterEditorProps = {
  filters: TextFilter[];
  onClose: () => void;
  onFiltersUpdate: (filters: TextFilter[]) => void;
};

export const JsonFilterEditor = ({ filters, onClose, onFiltersUpdate }: JsonFilterEditorProps) => {
  const [jsonText, setJsonText] = useState(JSON.stringify(filters, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newJsonText = e.target.value;
    setJsonText(newJsonText);

    if (newJsonText.trim() === '') {
      setJsonError(null);
      return;
    }

    try {
      const parsed = JSON.parse(newJsonText);

      const validationResult = TextFiltersArraySchema.safeParse(parsed);

      if (!validationResult.success) {
        const firstError = validationResult.error.issues[0]!;
        const errorPath = firstError.path.join('.');
        const errorMessage = firstError.message;
        setJsonError(errorPath ? `${errorPath}: ${errorMessage}` : errorMessage);
        return;
      }

      setJsonError(null);
    } catch (error) {
      setJsonError(t('jsonSyntaxError', (error as Error).message));
    }
  };

  const handleSave = async () => {
    if (jsonError || jsonText.trim() === '') return;

    const parsed = JSON.parse(jsonText);

    // Calculate nextId based on maximum ID in parsed data
    const maxId = parsed.length > 0 ? Math.max(...parsed.map((filter: TextFilter) => filter.id)) : 0;
    const nextId = maxId + 1;

    await textFilterStorage.set({ filters: parsed, nextId });

    onFiltersUpdate(parsed);
    onClose(); // Close editor
  };

  return (
    <div className="mt-8 space-y-4">
      <AlertWarning heading={t('debugFeatureDescription')}>
        <p>{t('jsonEditingWarning')}</p>
      </AlertWarning>

      <div className="space-y-2">
        <label className="block text-sm font-medium">{t('filterSettingsJson')}</label>
        <textarea
          value={jsonText}
          onChange={handleJsonChange}
          className="h-96 w-full max-w-none! resize-y rounded border border-gray-300 p-3 font-mono text-sm"
          placeholder="[]"
          spellCheck={false}
        />
      </div>

      <div className="flex items-center justify-between">
        {jsonError && <div className="text-sm font-medium text-red-500">{jsonError}</div>}
        <div className="ml-auto flex space-x-3">
          <button onClick={onClose} className="text-sm">
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!!jsonError || jsonText.trim() === ''}
            className="button-bg-blue text-sm">
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
};
