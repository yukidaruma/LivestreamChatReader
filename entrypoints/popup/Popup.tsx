import { t, useStorage, useSubscribeIcon, useThemeStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { extensionEnabledStorage, textFilterStorage } from '@extension/storage';
import { ErrorDisplay, IconButton, icons, LabeledToggleButton, LoadingSpinner } from '@extension/ui';

import './Popup.css';

const Popup = () => {
  const { enabled } = useStorage(extensionEnabledStorage);
  const { filters } = useStorage(textFilterStorage);

  useThemeStorage(); // Ensure data-theme is set for <html>
  useSubscribeIcon();

  const version = browser.runtime.getManifest().version;

  // Includes disabled filters for counting,
  // because it means the user has created at least one filter.
  const hasNoFilters = filters.length === 0;

  return (
    <div className="App h-screen w-full">
      <header className="App-header flex items-center justify-between">
        <a className="text-current! no-underline!" href="/options.html#about" target="_blank">
          <div>
            <h1 className="text-xl font-semibold">{t('extensionNameShort')}</h1>
            <div className="text-secondary text-xs">v{version}</div>
          </div>
        </a>
        <IconButton
          icon={icons.Configure}
          href="/options.html"
          target="_blank"
          title={t('openPage', t('settings'))}
          aria-label={t('settings')}
        />
      </header>
      <div className="space-y-3 text-sm">
        <LabeledToggleButton
          className="my-2 py-2"
          checked={enabled}
          onChange={extensionEnabledStorage.toggle}
          description={t('extensionState')}
          srOnlyLabel={enabled ? t('enabled') : t('disabled')}
        />

        {hasNoFilters && (
          <div className="text-secondary text-xs">
            <a href="/options.html#filter" target="_blank">
              {t('hintFilter')}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
