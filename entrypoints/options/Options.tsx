import FilterSetting from './FilterSetting';
import Settings from './Settings';
import { useThemeStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useEffect, useState } from 'react';
import './Options.css';

const Options = () => {
  useThemeStorage(); // Ensure data-theme is set for <html>

  const [currentRoute, setCurrentRoute] = useState<string | null>(() => window.location.hash.slice(1) || null);

  // Listen for hash changes to update route
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(window.location.hash.slice(1) || null);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Render based on current route
  if (currentRoute === 'filter') {
    return <FilterSetting />;
  }

  return <Settings />;
};

export default withErrorBoundary(withSuspense(Options, <LoadingSpinner />), ErrorDisplay);
