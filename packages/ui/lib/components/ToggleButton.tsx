import { cn } from '../utils';

type ToggleButtonProps = {
  checked: boolean;
  onChange: () => void;
  className?: string;
  srOnlyLabel?: string;
};

type LabeledToggleButtonProps = ToggleButtonProps & {
  currentState?: string;
  description?: string;
};

export const ToggleButton = ({ checked, onChange, className, srOnlyLabel }: ToggleButtonProps) => (
  <label className={cn('cursor-pointer', className)}>
    {srOnlyLabel && <span className="sr-only">{srOnlyLabel}</span>}
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    <div
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        checked ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 hover:bg-gray-400',
      )}>
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </div>
  </label>
);

export const LabeledToggleButton = (props: LabeledToggleButtonProps) => {
  const { currentState, description, ...restProps } = props;
  return (
    <label className={cn('cursor-pointer')}>
      <div className="flex items-center gap-2">
        {description && <span className="text-secondary flex-1 text-sm select-none">{description}</span>}
        <ToggleButton {...restProps} />
      </div>
      {currentState && <div className="mt-1 text-xs text-gray-500 select-none">{currentState}</div>}
    </label>
  );
};
