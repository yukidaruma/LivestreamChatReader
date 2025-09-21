import Settings from './Settings';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';
import './Options.css';

const Options = () => <Settings />;

export default withErrorBoundary(withSuspense(Options, <LoadingSpinner />), ErrorDisplay);
