import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Poi } from '@/types/api';
import { t } from '@/i18n/he';

interface PoiListItemProps {
  poi: Poi;
  index: number;
  color: string;
  selected: boolean;
  editable: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onHover: (id: string | null) => void;
  onMove: (delta: 1 | -1) => void;
}

export function PoiListItem({ poi, index, color, selected, editable, canMoveUp, canMoveDown, onSelect, onHover, onMove }: PoiListItemProps) {
  return (
    <li
      className={cn(
        'group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors duration-150',
        selected ? 'bg-white/10' : 'hover:bg-white/5',
      )}
      onMouseEnter={() => onHover(poi.id)}
      onMouseLeave={() => onHover(null)}
    >
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-start focus-ring rounded-lg">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-semibold tabular-nums"
          style={{ borderColor: color, color, background: selected ? color : 'transparent', ...(selected ? { color: '#0a0a0c' } : {}) }}
        >
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium leading-tight">{poi.title}</span>
          <span className="block truncate text-[12px] text-fg-3 leading-tight mt-0.5">
            <bdi>{poi.identifier}</bdi>
            {poi.summary && ` · ${poi.summary}`}
          </span>
        </span>
      </button>
      {editable && (
        <span className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" aria-label={t.blocks.moveUp} disabled={!canMoveUp} onClick={() => onMove(-1)} className="h-4 text-fg-3 hover:text-fg disabled:opacity-30">
            <ChevronUp size={14} />
          </button>
          <button type="button" aria-label={t.blocks.moveDown} disabled={!canMoveDown} onClick={() => onMove(1)} className="h-4 text-fg-3 hover:text-fg disabled:opacity-30">
            <ChevronDown size={14} />
          </button>
        </span>
      )}
    </li>
  );
}
