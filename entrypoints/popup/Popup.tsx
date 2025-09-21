import { t, useStorage, useSubscribeIcon, useThemeStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { extensionEnabledStorage } from '@extension/storage';
import { ErrorDisplay, IconButton, icons, LabeledToggleButton, LoadingSpinner } from '@extension/ui';

import './Popup.css';

const Popup = () => {
  const { enabled } = useStorage(extensionEnabledStorage);

  useThemeStorage(); // Ensure data-theme is set for <html>
  useSubscribeIcon();

  return (
    <div className="App h-screen w-full">
      <header className="App-header flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('extensionNameShort')}</h1>
        <IconButton
          icon={icons.Configure}
          href="/options.html"
          target="_blank"
          title={t('openPage', t('settings'))}
          aria-label={t('settings')}
        />
      </header>

      <LabeledToggleButton
        className="my-2 py-2"
        checked={enabled}
        onChange={extensionEnabledStorage.toggle}
        description={t('extensionState')}
        srOnlyLabel={enabled ? t('enabled') : t('disabled')}
      />
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
