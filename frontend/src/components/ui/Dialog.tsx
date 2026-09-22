import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import { t } from '@/i18n/he';
import { cn } from '@/lib/cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

const widthClass = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

export function Dialog({ open, onClose, title, description, children, footer, width = 'md' }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn('relative w-full glass rounded-2xl overflow-hidden', widthClass[width])}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {(title || description) && (
              <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
                <div>
                  {title && <h2 className="text-lg font-semibold tracking-title">{title}</h2>}
                  {description && <p className="mt-1 text-sm text-fg-3">{description}</p>}
                </div>
                <IconButton label={t.common.close} size="sm" onClick={onClose}>
                  <X size={16} />
                </IconButton>
              </header>
            )}
            <div className="px-6 pb-5 max-h-[70vh] overflow-y-auto">{children}</div>
            {footer && <footer className="flex justify-end gap-2 px-6 py-4 hairline-t bg-white/3">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
