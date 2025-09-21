import { Dialog } from './Dialog';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClassName?: string;
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClassName,
}: ConfirmDialogProps) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-secondary">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            {cancelText}
          </button>
          <button onClick={handleConfirm} className={`rounded px-4 py-2 text-sm text-white ${confirmButtonClassName}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
