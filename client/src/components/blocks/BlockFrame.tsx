import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { blockMeta } from './blockMeta';
import type { BlockType } from '@/types/api';
import { t } from '@/i18n/he';

interface BlockFrameProps {
  type: BlockType;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  children: ReactNode;
}

export function BlockFrame({ type, canMoveUp, canMoveDown, onMoveUp, onMoveDown, onRemove, children }: BlockFrameProps) {
  const meta = blockMeta[type];
  return (
    <section className="rounded-xl border border-line bg-white/3">
      <header className="flex items-center justify-between gap-2 px-3 h-9 border-b border-line">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-fg-3">
          {meta.icon}
          {meta.label}
        </span>
        <span className="flex items-center">
          <IconButton label={t.blocks.moveUp} size="sm" disabled={!canMoveUp} onClick={onMoveUp}>
            <ChevronUp size={14} />
          </IconButton>
          <IconButton label={t.blocks.moveDown} size="sm" disabled={!canMoveDown} onClick={onMoveDown}>
            <ChevronDown size={14} />
          </IconButton>
          <IconButton label={t.common.remove} size="sm" tone="danger" onClick={onRemove}>
            <Trash2 size={14} />
          </IconButton>
        </span>
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}
