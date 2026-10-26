import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { inputClass } from './Input';
import { cn } from '@/lib/cn';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** Drawn before the label, such as a category's colour. */
  icon?: ReactNode;
}

interface SelectProps<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  id?: string;
  /** For a select with no visible label of its own. */
  label?: string;
}

const GAP = 6;
const EDGE_MARGIN = 8;
const ROW_HEIGHT = 36;
const MAX_HEIGHT = 288;

interface Placement {
  left: number;
  top: number;
  width: number;
  above: boolean;
}

/**
 * A dropdown drawn in the interface's own glass. A native select hands its list to the system,
 * which on Windows ignores the dark theme and opens it white on white.
 *
 * The list is portalled to the body and pinned against the trigger: the panels that hold selects
 * scroll and are dragged with `translate`, and either would clip a list drawn inside them. Keys
 * pressed in the list stay in it, so Escape closes the list and not the panel around it.
 */
export function Select<T extends string>({ value, options, onChange, id, label }: SelectProps<T>) {
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];

  const show = () => {
    setActive(selectedIndex);
    setOpen(true);
  };
  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);
  const choose = (index: number) => {
    const option = options[index];
    if (option && option.value !== value) onChange(option.value);
    close(true);
  };

  /** Below the trigger, or above it when the window has no room underneath. */
  const place = useCallback(() => {
    const element = trigger.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const height = Math.min(MAX_HEIGHT, options.length * ROW_HEIGHT + 8);
    const above = rect.bottom + GAP + height > window.innerHeight - EDGE_MARGIN && rect.top - GAP - height > EDGE_MARGIN;
    setPlacement({ left: rect.left, width: rect.width, top: above ? rect.top - GAP - height : rect.bottom + GAP, above });
  }, [options.length]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  // The list follows its trigger while the panel scrolls, and goes once the trigger has scrolled
  // out of sight. A press anywhere else, or the window changing, puts it away too.
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      const target = event.target as Node;
      if (!list.current?.contains(target) && !trigger.current?.contains(target)) close(false);
    };
    const follow = (event: Event) => {
      if (list.current?.contains(event.target as Node)) return;
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) close(false);
      else place();
    };
    const dismiss = () => close(false);
    window.addEventListener('pointerdown', outside, true);
    window.addEventListener('scroll', follow, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('blur', dismiss);
    return () => {
      window.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('scroll', follow, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('blur', dismiss);
    };
  }, [open, close, place]);

  useEffect(() => {
    if (open) list.current?.focus();
  }, [open, placement]);

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, listId]);

  const onListKey = (event: KeyboardEvent) => {
    event.stopPropagation();
    const last = options.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key]);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(active);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      close(true);
    }
  };

  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => (open ? close(true) : show())}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          event.stopPropagation();
          show();
        }}
        className={cn(inputClass, 'flex items-center justify-between gap-2 text-start', open && 'border-accent bg-white/7')}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.icon}
          <span className="truncate">{selected?.label}</span>
        </span>
        <ChevronDown size={16} className={cn('shrink-0 text-fg-3 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && placement && (
            <motion.div
              ref={list}
              id={listId}
              role="listbox"
              tabIndex={-1}
              aria-activedescendant={`${listId}-${active}`}
              onKeyDown={onListKey}
              initial={{ opacity: 0, y: placement.above ? 4 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: placement.above ? 4 : -4 }}
              transition={{ duration: 0.14, ease: [0.2, 0.8, 0.2, 1] }}
              style={{ left: placement.left, top: placement.top, width: placement.width, maxHeight: MAX_HEIGHT }}
              className="fixed z-[130] overflow-y-auto overscroll-contain rounded-xl glass p-1 outline-none"
            >
              {options.map((option, index) => (
                <div
                  key={option.value}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  onPointerEnter={() => setActive(index)}
                  onClick={() => choose(index)}
                  className={cn(
                    'flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm transition-colors',
                    index === active ? 'bg-white/8 text-fg' : 'text-fg-2',
                  )}
                >
                  {option.icon}
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.value === value && <Check size={14} className="shrink-0 text-accent-strong" />}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
