import About from './About';
import ChatTest from './ChatTest';
import FilterSetting from './FilterSetting';
import Settings from './Settings';
import { useThemeStorage, withErrorBoundary, withSuspense, t, useMount, useStorage } from '@extension/shared';
import { textFilterStorage } from '@extension/storage';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useEffect, useState } from 'react';
import './Options.css';

type TabType = 'settings' | 'filter' | 'chat-test' | 'about';

const Options = () => {
  // Check if we're in inline mode (embedded in iframe)
  const isInline = new URLSearchParams(window.location.search).has('inline');

  const { filters } = useStorage(textFilterStorage);
  const enabledFilterCount = useMemo(() => filters.filter(filter => filter.enabled).length, [filters]);

  useMount(() => {
    if (isInline) {
      document.body.classList.add('inline');
    }
  });

  useThemeStorage(); // Ensure data-theme is set for <html>

  const [currentTab, setCurrentTab] = useState<TabType>(() => {
    const hash = window.location.hash.slice(1);
    if (hash === 'filter' || hash === 'chat-test' || hash === 'about') {
      return hash as TabType;
    }
    return 'settings';
  });

  // Listen for hash changes to update route
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'filter' || hash === 'chat-test' || hash === 'about') {
        setCurrentTab(hash as TabType);
      } else {
        setCurrentTab('settings');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    window.location.hash = tab === 'settings' ? '' : `#${tab}`;
  };

  const tabs = [
    { id: 'settings' as const, label: t('settings') },
    { id: 'filter' as const, label: `${t('filterSettings')} (${enabledFilterCount})` },
    { id: 'chat-test' as const, label: t('testPage') },
    { id: 'about' as const, label: t('about', t('extensionNameShort')) },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {isInline || (
        <nav className="border-b-1 border-[var(--border-primary)] font-medium">
          <div className="flex">
            {tabs.map(tab => (
              <a
                key={tab.id}
                href={tab.id === 'settings' ? '#' : `#${tab.id}`}
                onClick={e => {
                  e.preventDefault();
                  handleTabChange(tab.id);
                }}
                className={`default text-primary border-b-2 px-4 py-3 text-sm decoration-0 hover:bg-[var(--bg-secondary)]/80! ${
                  currentTab === tab.id
                    ? 'border-blue-500 bg-[var(--bg-secondary)]!'
                    : 'border-transparent text-inherit hover:border-gray-300'
                }`}>
                {tab.label}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* Tab Content */}
      <div className="flex-1 p-6">
        {currentTab === 'settings' && <Settings />}
        {currentTab === 'filter' && <FilterSetting />}
        {currentTab === 'chat-test' && <ChatTest />}
        {currentTab === 'about' && <About />}
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <LoadingSpinner />), ErrorDisplay);
