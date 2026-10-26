import { ImagePlus, X } from 'lucide-react';
import { attachmentThumbUrl } from '@/api/attachments';
import { AttachmentUploadButton } from './AttachmentUploadButton';
import type { ImagesBlock } from '@/types/api';
import { t } from '@/i18n/he';

interface ImagesBlockEditorProps {
  block: ImagesBlock;
  projectId: string;
  poiId: string;
  onUpdate: (update: (b: ImagesBlock) => ImagesBlock) => void;
}

export function ImagesBlockEditor({ block, projectId, poiId, onUpdate }: ImagesBlockEditorProps) {
  const setItems = (items: ImagesBlock['items']) => onUpdate((current) => ({ ...current, items }));
  return (
    <div className="flex flex-col gap-2.5">
      {block.items.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {block.items.map((item, index) => (
            <div key={item.attachmentId} className="relative flex flex-col gap-1.5">
              <img src={attachmentThumbUrl(item.attachmentId)} alt="" className="aspect-[4/3] w-full rounded-lg object-cover bg-surface-2" />
              <input
                className="h-8 w-full rounded-md bg-white/5 border border-line px-2 text-[12px] text-fg placeholder:text-fg-4 focus:border-accent focus-ring"
                placeholder={t.blocks.caption}
                value={item.caption}
                onChange={(e) =>
                  setItems(block.items.map((it, i) => (i === index ? { ...it, caption: e.target.value } : it)))
                }
              />
              <button
                type="button"
                aria-label={t.common.remove}
                onClick={() => setItems(block.items.filter((_, i) => i !== index))}
                className="absolute top-1.5 end-1.5 h-6 w-6 rounded-full bg-black/60 text-white/90 hover:bg-danger flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <AttachmentUploadButton
        projectId={projectId}
        poiId={poiId}
        accept="image/jpeg,image/png,image/webp,image/gif"
        icon={<ImagePlus size={14} />}
        label={t.blocks.addImages}
        onUploaded={(attachments) =>
          onUpdate((current) => ({
            ...current,
            items: [...current.items, ...attachments.map((a) => ({ attachmentId: a.id, caption: '' }))],
          }))
        }
      />
    </div>
  );
}
