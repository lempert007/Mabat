import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import type { SpecsBlock } from '@/types/api';
import { t } from '@/i18n/he';

export function SpecsBlockEditor({ block, onChange }: { block: SpecsBlock; onChange: (b: SpecsBlock) => void }) {
  const update = (index: number, patch: Partial<{ label: string; value: string }>) =>
    onChange({ ...block, items: block.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) });

  return (
    <div className="flex flex-col gap-2">
      {block.items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input placeholder={t.blocks.label} value={item.label} onChange={(e) => update(index, { label: e.target.value })} />
          <Input placeholder={t.blocks.value} value={item.value} onChange={(e) => update(index, { value: e.target.value })} />
          <IconButton
            label={t.common.remove}
            size="sm"
            onClick={() => onChange({ ...block, items: block.items.filter((_, i) => i !== index) })}
          >
            <X size={14} />
          </IconButton>
        </div>
      ))}
      <Button
        size="sm"
        variant="ghost"
        icon={<Plus size={14} />}
        className="self-start"
        onClick={() => onChange({ ...block, items: [...block.items, { label: '', value: '' }] })}
      >
        {t.blocks.addRow}
      </Button>
    </div>
  );
}
