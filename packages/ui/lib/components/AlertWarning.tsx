import { StatusWarning } from '../icons';
import { cn } from '../utils';
import './AlertWarning.css';

type WarningProps = {
  className?: string;
  heading?: string;
  children: React.ReactNode;
};

export const AlertWarning = ({ className = '', heading, children }: WarningProps) => (
  <div className={cn('warning space-y-1', className)}>
    <div className="heading flex items-center space-x-2">
      <StatusWarning size="16" color="currentColor" />
      <div>{heading || children}</div>
    </div>
    {heading && <div className="text-sm">{children}</div>}
  </div>
);
