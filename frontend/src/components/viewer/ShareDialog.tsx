import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { copyText } from '@/lib/clipboard';
import type { Poi } from '@/types/api';
import { t } from '@/i18n/he';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  poi: Poi | null;
}

function ShareRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyText(url)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-fg-3">{label}</span>
      <div className="flex items-center gap-2">
        <input readOnly dir="ltr" value={url} onFocus={(e) => e.target.select()} className="h-10 flex-1 rounded-xl bg-white/5 border border-line px-3.5 text-[13px] text-fg-2 focus-ring" />
        <Button variant={copied ? 'primary' : 'secondary'} icon={copied ? <Check size={15} /> : <Copy size={15} />} onClick={copy}>
          {copied ? t.common.copied : t.common.copy}
        </Button>
      </div>
    </div>
  );
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
