import { t, useStorage, useSubscribeIcon, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage, extensionEnabledStorage } from '@extension/storage';
import { cn, ErrorDisplay, getIconColor, icons, LoadingSpinner, ToggleButton } from '@extension/ui';

import './App.css';

const Popup = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const { enabled } = useStorage(extensionEnabledStorage);
  const iconColor = getIconColor(isLight);

  useSubscribeIcon();

  return (
    <div className={cn('App h-screen w-full', isLight ? 'light' : 'dark')}>
      <header className="App-header flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('extensionNameShort')}</h1>
        <a href="/options.html" target="_blank" title={t('openPage', t('settings'))} aria-label={t('settings')}>
          <icons.Configure color={iconColor} size="24" />
        </a>
      </header>

      <ToggleButton
        className="my-2 py-2"
        checked={enabled}
        onChange={extensionEnabledStorage.toggle}
        label={enabled ? t('enabled') : t('disabled')}
        srOnlyLabel={t('toggleExtension')}
      />
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
