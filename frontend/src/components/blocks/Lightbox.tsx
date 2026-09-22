import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { attachmentFileUrl } from '@/api/attachments';
import type { ImageItem } from '@/types/api';
import { t } from '@/i18n/he';

interface LightboxProps {
  items: ImageItem[];
  index: number | null;
  onClose: () => void;
  onIndex: (index: number) => void;
}

export function Lightbox({ items, index, onClose, onIndex }: LightboxProps) {
  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') onIndex((index + 1) % items.length);
      if (event.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length);
      event.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [index, items.length, onClose, onIndex]);

  const item = index === null ? null : items[index];

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <div className="absolute top-4 end-4">
            <IconButton label={t.common.close} onClick={onClose}>
              <X size={18} />
            </IconButton>
          </div>
          {items.length > 1 && (
            <>
              <div className="absolute start-4 top-1/2 -translate-y-1/2" onClick={(e) => e.stopPropagation()}>
                <IconButton label={t.viewer.previous} onClick={() => onIndex(((index ?? 0) - 1 + items.length) % items.length)}>
                  <ChevronRight size={20} />
                </IconButton>
              </div>
              <div className="absolute end-4 top-1/2 -translate-y-1/2" onClick={(e) => e.stopPropagation()}>
                <IconButton label={t.viewer.next} onClick={() => onIndex(((index ?? 0) + 1) % items.length)}>
                  <ChevronLeft size={20} />
                </IconButton>
              </div>
            </>
          )}
          <motion.figure
            key={item.attachmentId}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-3 max-w-[92vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={attachmentFileUrl(item.attachmentId)}
              alt={item.caption}
              className="max-h-[80vh] max-w-[92vw] rounded-xl object-contain shadow-card"
            />
            {item.caption && <figcaption className="text-sm text-fg-2">{item.caption}</figcaption>}
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
