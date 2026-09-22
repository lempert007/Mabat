import { Button } from './Button';
import { Dialog } from './Dialog';
import { t } from '@/i18n/he';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, body, confirmLabel, loading, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>
            {confirmLabel ?? t.common.confirmDelete}
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg-2 leading-relaxed">{body}</p>
    </Dialog>
  );
}
