import type { KeyboardEvent, PointerEvent } from 'react';
import { cn } from '@/lib/cn';
import { formatCue } from '@/lib/format';
import { fill } from '@/lib/interpolate';
import type { Actor } from '@/types/api';
import { t } from '@/i18n/he';

/** What on a lane is being dragged: a keyframe, the end of its wait, or the moment a rider gets off. */
export type Grip = { actor: string; key: number; part: 'key' | 'hold' } | { actor: string; part: 'leave' };

interface TimelineLaneProps {
  actor: Actor;
  name: string;
  color: string;
  /** Where a moment falls across the lane, 0 to 100. */
  x: (seconds: number) => number;
  /** When it gets off its ride, or null when it is not riding anything it leaves. */
  leaves: number | null;
  /** What it rides until then, for the bar. */
  ridingLabel: string | null;
  /** This actor is the one open in the panel. */
  chosen: boolean;
  selectedKey: number | null;
  onChoose: () => void;
  onView: (key: number) => void;
  onGrab: (grip: Grip, event: PointerEvent<HTMLElement>) => void;
  onNudge: (key: number, by: number) => void;
  onRemove: (key: number) => void;
}

const copy = t.mission.scene;

/**
 * One actor against time: a bar while it rides something, a line for each move, a block for
 * each wait, and a diamond on each keyframe. Diamonds, the ends of waits and the moment a rider
 * gets off can all be dragged; a focused diamond also moves with the arrow keys.
 */
export function TimelineLane(props: TimelineLaneProps) {
  const { actor, name, color, x, leaves, ridingLabel, chosen, selectedKey, onChoose, onView, onGrab, onNudge, onRemove } = props;
  const start = leaves ?? (actor.rides === null ? actor.keys[0]?.at : 0) ?? 0;

  const onKey = (key: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const by = event.shiftKey ? 1 : 0.1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') onNudge(key, event.key === 'ArrowRight' ? by : -by);
    else if (event.key === 'Delete' || event.key === 'Backspace') onRemove(key);
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className={cn('flex h-7 items-center gap-2 rounded-md', chosen && 'bg-white/5')}>
      <button
        type="button"
        dir="auto"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onChoose}
        className={cn('flex w-28 shrink-0 items-center gap-1.5 truncate rounded-md px-1 text-start text-[12px] focus-ring', chosen ? 'font-medium text-fg' : 'text-fg-2 hover:text-fg')}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
        <span className="truncate">{name}</span>
      </button>
      <div className="relative h-full flex-1">
        <span className="absolute inset-x-0 top-1/2 h-px bg-white/8" />

        {ridingLabel && (
          <span
            className="absolute top-1/2 flex h-3.5 -translate-y-1/2 items-center overflow-hidden rounded-full bg-white/10 px-1.5 text-[10px] text-fg-3"
            style={{ left: 0, width: `${x(leaves ?? Infinity)}%` }}
          >
            <span dir="rtl" className="truncate">{ridingLabel}</span>
          </span>
        )}

        {actor.keys.map((key, k) => {
          const from = k === 0 ? start : actor.keys[k - 1].at + actor.keys[k - 1].hold;
          return (
            <span key={`leg${k}`} className="absolute top-1/2 h-0.5 -translate-y-1/2 opacity-70" style={{ left: `${x(from)}%`, width: `${x(key.at) - x(from)}%`, background: color }} />
          );
        })}

        {actor.keys.map((key, k) =>
          key.hold > 0 ? (
            <span key={`hold${k}`} className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-sm opacity-45" style={{ left: `${x(key.at)}%`, width: `${x(key.at + key.hold) - x(key.at)}%`, background: color }}>
              <span
                role="presentation"
                onPointerDown={(event) => onGrab({ actor: actor.id, key: k, part: 'hold' }, event)}
                className="absolute -end-1 inset-y-[-3px] w-2 cursor-ew-resize touch-none"
              />
            </span>
          ) : null,
        )}

        {leaves !== null && (
          <span
            role="presentation"
            title={copy.leaves}
            onPointerDown={(event) => onGrab({ actor: actor.id, part: 'leave' }, event)}
            className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none rounded-full bg-fg-2 hover:bg-fg"
            style={{ left: `${x(leaves)}%` }}
          />
        )}

        {actor.keys.map((key, k) => (
          <button
            key={`key${k}`}
            type="button"
            aria-label={fill(copy.cue, { index: k + 1, time: formatCue(key.at) })}
            title={fill(copy.cue, { index: k + 1, time: formatCue(key.at) })}
            onPointerDown={(event) => onGrab({ actor: actor.id, key: k, part: 'key' }, event)}
            onKeyDown={onKey(k)}
            onDoubleClick={() => onView(k)}
            className={cn(
              'absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 cursor-grab touch-none rounded-[2px] border transition-[scale] duration-150 hover:scale-125 focus-ring active:cursor-grabbing',
              selectedKey === k ? 'scale-125 border-white' : 'border-black/40',
            )}
            style={{ left: `${x(key.at)}%`, background: color }}
          />
        ))}
      </div>
    </div>
  );
}
