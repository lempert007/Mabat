import { Input } from '@/components/ui/Input';
import type { HeadingBlock } from '@/types/api';
import { t } from '@/i18n/he';

export function HeadingBlockEditor({ block, onChange }: { block: HeadingBlock; onChange: (b: HeadingBlock) => void }) {
  return (
    <Input
      value={block.text}
      placeholder={t.blocks.headingPlaceholder}
      className="font-semibold"
      onChange={(e) => onChange({ ...block, text: e.target.value })}
    />
  );
}
