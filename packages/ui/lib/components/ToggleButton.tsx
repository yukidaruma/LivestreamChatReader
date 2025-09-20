import { cn } from '../utils';

interface ToggleButtonProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
  srOnlyLabel?: string;
  className?: string;
}

export const ToggleButton = ({ checked, onChange, label, srOnlyLabel, className }: ToggleButtonProps) => (
  <label className={cn('flex cursor-pointer items-center gap-2', className)}>
    {srOnlyLabel && <span className="sr-only">{srOnlyLabel}</span>}
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    <div
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        checked ? 'bg-blue-600' : 'bg-gray-300',
      )}>
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </div>
    {label && <span className="text-sm select-none">{label}</span>}
  </label>
);
