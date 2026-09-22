import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GripHorizontal, X } from 'lucide-react';
import { IconButton } from './IconButton';
import { useDraggable } from '@/hooks/useDraggable';
import { t } from '@/i18n/he';

interface DraggablePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Identifies the panel so it reopens where the user last left it. */
  storageKey: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * A floating tool window: no backdrop, so the scene behind stays visible and interactive while
 * the panel is open and the user can drag it aside to watch a setting take effect.
 *
 * Only opacity is animated here. The element's transform belongs to the drag hook, and two
 * owners writing the same property would fight each other mid-drag.
 */
export function DraggablePanel({ open, onClose, title, storageKey, children, footer }: DraggablePanelProps) {
  const { setElement, onHandlePointerDown } = useDraggable(storageKey);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      <AnimatePresence>
        {open && (
          <motion.section
            ref={setElement}
            role="dialog"
            aria-label={title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="pointer-events-auto absolute start-4 top-16 flex max-h-[calc(100vh-6rem)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl glass md:start-[20rem]"
          >
            <header
              onPointerDown={onHandlePointerDown}
              className="flex shrink-0 cursor-grab touch-none select-none items-center gap-2 px-4 py-3 hairline-b active:cursor-grabbing"
            >
              <GripHorizontal size={15} className="text-fg-4" />
              <h2 className="flex-1 text-[14px] font-semibold tracking-title">{title}</h2>
              <IconButton label={t.common.close} size="sm" onClick={onClose}>
                <X size={16} />
              </IconButton>
            </header>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
            {footer && <footer className="shrink-0 px-4 py-3 hairline-t bg-white/3">{footer}</footer>}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
