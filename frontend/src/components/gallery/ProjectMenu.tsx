import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreHorizontal, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { t } from '@/i18n/he';

interface ProjectMenuProps {
  canReprocess: boolean;
  onEdit: () => void;
  onReprocess: () => void;
  onDelete: () => void;
}

export function ProjectMenu({ canReprocess, onEdit, onReprocess, onDelete }: ProjectMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  const item = (label: string, icon: React.ReactNode, action: () => void, danger = false) => (
    <button
      type="button"
      onClick={() => {
        setOpen(false);
        action();
      }}
      className={`flex w-full items-center gap-2.5 px-3 h-9 text-sm rounded-lg transition-colors ${
        danger ? 'text-danger hover:bg-danger-soft' : 'text-fg-2 hover:text-fg hover:bg-white/8'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <IconButton label={t.common.more} size="sm" active={open} onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal size={16} />
      </IconButton>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute end-0 top-full mt-1 w-44 glass rounded-xl p-1 z-20"
          >
            {item(t.gallery.rename, <Pencil size={14} />, onEdit)}
            {canReprocess && item(t.gallery.reprocess, <RefreshCw size={14} />, onReprocess)}
            {item(t.common.delete, <Trash2 size={14} />, onDelete, true)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
