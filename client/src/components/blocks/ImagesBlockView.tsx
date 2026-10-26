import { useState } from 'react';
import { attachmentThumbUrl } from '@/api/attachments';
import type { ImagesBlock } from '@/types/api';
import { Lightbox } from './Lightbox';

export function ImagesBlockView({ block }: { block: ImagesBlock }) {
  const [open, setOpen] = useState<number | null>(null);
  if (block.items.length === 0) return null;
  const single = block.items.length === 1;
  return (
    <>
      <div className={`grid gap-2 ${single ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {block.items.map((item, index) => (
          <button
            key={item.attachmentId}
            type="button"
            onClick={() => setOpen(index)}
            className={`group relative overflow-hidden rounded-xl bg-surface-2 focus-ring ${single ? 'aspect-[16/10]' : 'aspect-[4/3]'}`}
          >
            <img
              src={attachmentThumbUrl(item.attachmentId)}
              alt={item.caption}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-[1.04]"
            />
            {item.caption && (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-start text-[12px] text-white/90">
                {item.caption}
              </span>
            )}
          </button>
        ))}
      </div>
      <Lightbox items={block.items} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </>
  );
}
