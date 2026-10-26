import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/lib/cn';

interface AngleDialProps {
  label: string;
  /** Degrees, -180 to 180. */
  value: number;
  /** The value is not set and the dial shows what would happen anyway, dimmed. */
  implied?: boolean;
  onChange: (degrees: number) => void;
}

const wrap = (degrees: number) => ((((degrees + 180) % 360) + 360) % 360) - 180;
/** Dragging lands on whole multiples of this unless Shift is held, degrees. */
const SNAP = 15;

/**
 * A compass for an angle: drag the needle round, or use the arrow keys (5° a press, 15° with
 * Shift). Dragging snaps to 15° steps, which is what people reach for, and Shift frees it.
 */
export function AngleDial({ label, value, implied = false, onChange }: AngleDialProps) {
  const face = useRef<HTMLDivElement>(null);

  const angleAt = (event: PointerEvent<HTMLDivElement>) => {
    const rect = face.current!.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    const degrees = (Math.atan2(x, -y) * 180) / Math.PI;
    return wrap(event.shiftKey ? Math.round(degrees) : Math.round(degrees / SNAP) * SNAP);
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 15 : 5;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') onChange(wrap(value + step));
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') onChange(wrap(value - step));
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      ref={face}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={-180}
      aria-valuemax={180}
      aria-valuenow={Math.round(value)}
      onKeyDown={onKey}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onChange(angleAt(event));
      }}
      onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && onChange(angleAt(event))}
      className="relative h-16 w-16 shrink-0 cursor-grab touch-none rounded-full border border-line-strong bg-white/5 focus-ring active:cursor-grabbing"
    >
      {[0, 90, 180, 270].map((tick) => (
        <span key={tick} className="absolute inset-0" style={{ rotate: `${tick}deg` }}>
          <span className="absolute left-1/2 top-1 h-1.5 w-px -translate-x-1/2 bg-fg-4" />
        </span>
      ))}
      <span className="absolute inset-0 transition-[rotate] duration-75" style={{ rotate: `${value}deg` }}>
        <span className={cn('absolute bottom-1/2 left-1/2 h-6 w-0.5 -translate-x-1/2 rounded-full', implied ? 'bg-fg-3' : 'bg-accent')} />
        <span className={cn('absolute left-1/2 top-1.5 h-2 w-2 -translate-x-1/2 rounded-full', implied ? 'bg-fg-3' : 'bg-accent')} />
      </span>
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg-2" />
    </div>
  );
}
