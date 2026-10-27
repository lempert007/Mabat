import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/lib/cn';

interface AngleDialProps {
  label: string;
  /** Degrees, clockwise from the top. */
  value: number;
  /** The value is not set and the dial shows what would happen anyway, dimmed. */
  implied?: boolean;
  /** How far either way it turns, degrees. */
  limit?: number;
  /**
   * `compass` points a needle the way something faces, seen from above. `level` is a horizon
   * line seen side on, for a lean: clockwise lowers its right end, where the dot is.
   */
  look?: 'compass' | 'level';
  onChange: (degrees: number) => void;
}

const wrap = (degrees: number) => ((((degrees + 180) % 360) + 360) % 360) - 180;
/** Dragging lands on whole multiples of this unless Shift is held, degrees. */
const SNAP = 15;

/**
 * A round control for an angle: drag it round, or use the arrow keys (5° a press, 15° with
 * Shift). Dragging snaps to 15° steps, which is what people reach for, and Shift frees it.
 */
export function AngleDial({ label, value, implied = false, limit = 180, look = 'compass', onChange }: AngleDialProps) {
  const face = useRef<HTMLDivElement>(null);
  const set = (degrees: number) => onChange(Math.min(Math.max(wrap(degrees), -limit), limit));

  const angleAt = (event: PointerEvent<HTMLDivElement>) => {
    const rect = face.current!.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    const degrees = (Math.atan2(x, -y) * 180) / Math.PI;
    return event.shiftKey ? Math.round(degrees) : Math.round(degrees / SNAP) * SNAP;
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 15 : 5;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') set(value + step);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') set(value - step);
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  const tone = implied ? 'bg-fg-3' : 'bg-accent';
  return (
    <div
      ref={face}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={-limit}
      aria-valuemax={limit}
      aria-valuenow={Math.round(value)}
      onKeyDown={onKey}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        set(angleAt(event));
      }}
      onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && set(angleAt(event))}
      className="relative h-14 w-14 shrink-0 cursor-grab touch-none rounded-full border border-line-strong bg-white/5 focus-ring active:cursor-grabbing"
    >
      {[0, 90, 180, 270].map((tick) => (
        <span key={tick} className="absolute inset-0" style={{ rotate: `${tick}deg` }}>
          <span className="absolute left-1/2 top-1 h-1.5 w-px -translate-x-1/2 bg-fg-4" />
        </span>
      ))}
      <span className="absolute inset-0 transition-[rotate] duration-75" style={{ rotate: `${value}deg` }}>
        {look === 'compass' ? (
          <>
            <span className={cn('absolute bottom-1/2 left-1/2 h-5 w-0.5 -translate-x-1/2 rounded-full', tone)} />
            <span className={cn('absolute left-1/2 top-1.5 h-2 w-2 -translate-x-1/2 rounded-full', tone)} />
          </>
        ) : (
          <>
            <span className={cn('absolute left-2 right-2 top-1/2 h-0.5 -translate-y-1/2 rounded-full', tone)} />
            <span className={cn('absolute bottom-1/2 left-1/2 h-2.5 w-0.5 -translate-x-1/2 rounded-full', tone)} />
            <span className={cn('absolute right-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full', tone)} />
          </>
        )}
      </span>
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg-2" />
    </div>
  );
}
