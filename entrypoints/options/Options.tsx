import ChatTest from './ChatTest';
import FilterSetting from './FilterSetting';
import Settings from './Settings';
import { useThemeStorage, withErrorBoundary, withSuspense, t } from '@extension/shared';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useEffect, useState } from 'react';
import './Options.css';

type TabType = 'settings' | 'filter' | 'chat-test';

const Options = () => {
  useThemeStorage(); // Ensure data-theme is set for <html>

  const [currentTab, setCurrentTab] = useState<TabType>(() => {
    const hash = window.location.hash.slice(1);
    if (hash === 'filter' || hash === 'chat-test') {
      return hash as TabType;
    }
    return 'settings';
  });

  // Listen for hash changes to update route
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'filter' || hash === 'chat-test') {
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
    { id: 'filter' as const, label: t('filterSettings') },
    { id: 'chat-test' as const, label: t('testPage') },
  ];

  return (
    <div className="flex min-h-screen flex-col">
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
              className={`default text-primary border-b-2 px-4 py-3 text-sm decoration-0 hover:bg-[var(--bg-secondary)] ${
                currentTab === tab.id ? 'border-blue-500' : 'border-transparent text-inherit hover:border-gray-300'
              }`}>
              {tab.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Tab Content */}
      <div className="flex-1 p-6">
        {currentTab === 'settings' && <Settings />}
        {currentTab === 'filter' && <FilterSetting />}
        {currentTab === 'chat-test' && <ChatTest />}
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <LoadingSpinner />), ErrorDisplay);
