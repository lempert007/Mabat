import { Dialog } from '@/components/ui/Dialog';
import { ShareRow } from './ShareRow';
import type { Poi } from '@/types/api';
import { t } from '@/i18n/he';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  poi: Poi | null;
}

export function ShareDialog({ open, onClose, projectId, poi }: ShareDialogProps) {
  const base = `${window.location.origin}/p/${projectId}`;
  return (
    <Dialog open={open} onClose={onClose} title={t.viewer.shareTitle} description={t.viewer.shareBody} width="sm">
      <div className="flex flex-col gap-5">
        {poi && <ShareRow label={`${t.viewer.sharePoint} · ${poi.identifier}`} url={`${base}?poi=${poi.id}`} />}
        <ShareRow label={t.viewer.shareProject} url={base} />
      </div>
    </Dialog>
  );
}
