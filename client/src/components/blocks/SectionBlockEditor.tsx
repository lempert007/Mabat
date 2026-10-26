import type { ReactNode } from 'react';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import type { SectionBlock } from '@/types/api';
import { t } from '@/i18n/he';

interface SectionBlockEditorProps {
  block: SectionBlock;
  onChange: (block: SectionBlock) => void;
  /** The nested block editor, passed in by the parent list so the two files stay independent. */
  children: ReactNode;
}

export function SectionBlockEditor({ block, onChange, children }: SectionBlockEditorProps) {
  return (
    <div className="flex flex-col gap-3">
      <Input
        value={block.title}
        placeholder={t.blocks.sectionTitlePlaceholder}
        className="font-semibold"
        onChange={(event) => onChange({ ...block, title: event.target.value })}
      />
      <label className="flex cursor-pointer items-center justify-between">
        <span className="text-[12px] text-fg-3">{t.blocks.sectionOpenByDefault}</span>
        <Switch
          label={t.blocks.sectionOpenByDefault}
          checked={block.defaultOpen}
          onChange={(defaultOpen) => onChange({ ...block, defaultOpen })}
        />
      </label>
      <div className="rounded-xl border border-line bg-black/25 p-2.5">{children}</div>
    </div>
  );
}
