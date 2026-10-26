import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { t } from '@/i18n/he';

interface SectionBlockViewProps {
  title: string;
  defaultOpen: boolean;
  /** Raised by the dashboard's expand-all and collapse-all controls. */
  forcedOpen: boolean | null;
  isEmpty: boolean;
  children: ReactNode;
}

/**
 * One collapsible group in a point's dashboard. Collapsed content is unmounted, so a point with
 * many sections costs nothing until the reader opens one.
 */
export function SectionBlockView({ title, defaultOpen, forcedOpen, isEmpty, children }: SectionBlockViewProps) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (forcedOpen !== null) setOpen(forcedOpen);
  }, [forcedOpen]);

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white/[0.03]">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-center gap-2.5 px-3.5 py-3 text-start transition-colors duration-200 hover:bg-white/[0.04] focus-ring"
        >
          <ChevronDown
            size={15}
            className={cn(
              'shrink-0 text-fg-3 transition-transform duration-300 ease-out-soft',
              !open && '-rotate-90',
            )}
          />
          <span className="flex-1 text-[13px] font-semibold tracking-[0.01em] text-fg">
            {title || t.blocks.untitledSection}
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 pt-0.5">
              {isEmpty ? <p className="text-[13px] text-fg-4">{t.blocks.sectionEmpty}</p> : children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
