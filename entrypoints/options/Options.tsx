import Settings from './Settings';
import { useThemeStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';
import './Options.css';

const Options = () => {
  useThemeStorage(); // Ensure data-theme is set for <html>

  return <Settings />;
};

export default withErrorBoundary(withSuspense(Options, <LoadingSpinner />), ErrorDisplay);
