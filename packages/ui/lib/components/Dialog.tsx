import { cn } from '../utils';
import { Dialog as HeadlessDialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import type { ReactNode } from 'react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export const Dialog = ({ isOpen, onClose, title, children, className }: DialogProps) => (
  <HeadlessDialog open={isOpen} onClose={onClose} className="relative z-50">
    <DialogBackdrop transition className="fixed inset-0 bg-black/50 duration-300 ease-out data-[closed]:opacity-0" />
    <div className="fixed inset-0 flex w-screen items-start justify-center p-4 pt-16">
      <DialogPanel
        transition
        className={cn(
          'bg-primary text-primary w-160 max-w-[90vw] rounded-lg shadow-xl duration-300 ease-out data-[closed]:opacity-0',
          className,
        )}>
        <div className="m-4 space-y-4">
          {title && <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>}
          {children}
        </div>
      </DialogPanel>
    </div>
  </HeadlessDialog>
);
