import { TextArea } from '@/components/ui/TextArea';
import type { TextBlock } from '@/types/api';
import { t } from '@/i18n/he';

export function TextBlockEditor({ block, onChange }: { block: TextBlock; onChange: (b: TextBlock) => void }) {
  return (
    <TextArea
      rows={5}
      value={block.markdown}
      placeholder={t.blocks.textPlaceholder}
      onChange={(e) => onChange({ ...block, markdown: e.target.value })}
    />
  );
}
