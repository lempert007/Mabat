import { blockMeta } from './blockMeta';
import type { BlockType } from '@/types/api';

interface AddBlockMenuProps {
  types: readonly BlockType[];
  onAdd: (type: BlockType) => void;
}

export function AddBlockMenu({ types, onAdd }: AddBlockMenuProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {types.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onAdd(type)}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-[11px] text-fg-3 transition-colors hover:border-line-strong hover:bg-white/5 hover:text-fg focus-ring"
        >
          {blockMeta[type].icon}
          {blockMeta[type].label}
        </button>
      ))}
    </div>
  );
}
