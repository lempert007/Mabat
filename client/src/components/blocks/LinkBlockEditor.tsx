import { Input } from '@/components/ui/Input';
import type { LinkBlock } from '@/types/api';
import { t } from '@/i18n/he';

export function LinkBlockEditor({ block, onChange }: { block: LinkBlock; onChange: (b: LinkBlock) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Input dir="ltr" placeholder={t.blocks.url} value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} />
      <Input placeholder={t.blocks.linkLabel} value={block.label} onChange={(e) => onChange({ ...block, label: e.target.value })} />
    </div>
  );
}
