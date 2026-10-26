import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  tone?: 'default' | 'danger';
  onSelect: () => void;
}

/** Where the menu was summoned from, in viewport coordinates. */
export interface ContextMenuAnchor {
  x: number;
  y: number;
}

interface ContextMenuProps {
  anchor: ContextMenuAnchor | null;
  items: ContextMenuItem[];
  onClose: () => void;
}

const EDGE_MARGIN = 8;

/**
 * A small menu summoned at a point on screen. It measures itself once so it can stay inside
 * the window, and opens toward the reading direction when there is room.
 */
export function ContextMenu({ anchor, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<ContextMenuAnchor | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!anchor || !element) {
      setPosition(null);
      return;
    }
    const { width, height } = element.getBoundingClientRect();
    const rightToLeft = getComputedStyle(document.documentElement).direction === 'rtl';
    // Grow away from the pointer along the reading direction, then pull back inside the window.
    const preferredX = rightToLeft ? anchor.x - width : anchor.x;
    setPosition({
      x: Math.min(Math.max(preferredX, EDGE_MARGIN), window.innerWidth - width - EDGE_MARGIN),
      y: Math.min(Math.max(anchor.y, EDGE_MARGIN), window.innerHeight - height - EDGE_MARGIN),
    });
  }, [anchor]);

  useEffect(() => {
    if (!anchor) return;
    const close = () => onClose();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    // Anything that moves the page out from under the menu dismisses it.
    window.addEventListener('pointerdown', close);
    window.addEventListener('wheel', close);
    window.addEventListener('blur', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('wheel', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [anchor, onClose]);

  return (
    <AnimatePresence>
      {anchor && (
        <motion.div
          ref={ref}
          role="menu"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.14, ease: [0.2, 0.8, 0.2, 1] }}
          // Clicks inside must not reach the window listener that closes the menu.
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            left: position?.x ?? anchor.x,
            top: position?.y ?? anchor.y,
            visibility: position ? 'visible' : 'hidden',
          }}
          className="fixed z-[120] w-48 rounded-xl glass p-1 origin-top"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                onClose();
                item.onSelect();
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 h-9 text-sm transition-colors focus-ring',
                item.tone === 'danger'
                  ? 'text-danger hover:bg-danger-soft'
                  : 'text-fg-2 hover:bg-white/8 hover:text-fg',
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
