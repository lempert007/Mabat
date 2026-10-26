import { Crosshair, ScanEye, X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { NumberField } from '@/components/ui/NumberField';
import { ACTOR_PRESETS } from '@/lib/mission/defaults';
import { keyBounds } from '@/lib/mission/keys';
import { formatCue, formatMeasure } from '@/lib/format';
import { fill } from '@/lib/interpolate';
import { cn } from '@/lib/cn';
import type { Actor } from '@/types/api';
import { t } from '@/i18n/he';

interface KeyRowProps {
  actor: Actor;
  index: number;
  color: string;
  selected: boolean;
  moving: boolean;
  /** Metres per second on the way here, or null where that means nothing. */
  pace: number | null;
  onSelect: () => void;
  onView: () => void;
  onMove: () => void;
  onRemove: () => void;
  onRetime: (at: number) => void;
  onLift: (lift: number) => void;
  onHold: (hold: number) => void;
}

const copy = t.mission.scene;
const units = t.mission.units;

/**
 * One keyframe: when the actor gets there, how high, and how long it waits. Collapsed it is a
 * line to scan; selected, it opens for exact numbers. The pace on the way there is worked out,
 * so a leg timed too tight says so.
 */
export function KeyRow({ actor, index, color, selected, moving, pace, onSelect, onView, onMove, onRemove, onRetime, onLift, onHold }: KeyRowProps) {
  const key = actor.keys[index];
  const [min, max] = keyBounds(actor, index);
  const tooFast = pace !== null && pace > ACTOR_PRESETS[actor.kind].speed * 3;
  const facts = [
    key.lift > 0.05 && `↑ ${formatMeasure(key.lift, 1)} ${units.m}`,
    key.hold > 0 && `${copy.hold} ${formatMeasure(key.hold, 1)} ${units.s}`,
  ].filter(Boolean);

  return (
    <div className={cn('rounded-xl border transition-colors duration-200', selected ? 'border-accent/60 bg-accent-soft' : 'border-line bg-white/3')}>
      <div className="flex items-center gap-2 py-1.5 pe-1.5 ps-2.5">
        <button type="button" onClick={onSelect} aria-expanded={selected} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-start focus-ring">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-black" style={{ background: color }}>
            <bdi>{index + 1}</bdi>
          </span>
          <bdi className="text-[13px] font-medium tabular-nums">{formatCue(key.at)}</bdi>
          {facts.length > 0 && <span className="truncate text-[12px] text-fg-3">{facts.join(' · ')}</span>}
        </button>
        <IconButton label={copy.viewKey} size="sm" onClick={onView}>
          <ScanEye size={14} />
        </IconButton>
        <IconButton label={copy.moveKey} size="sm" active={moving} onClick={onMove}>
          <Crosshair size={14} />
        </IconButton>
        <IconButton label={copy.removeKey} size="sm" tone="danger" onClick={onRemove}>
          <X size={14} />
        </IconButton>
      </div>
      {selected && (
        <div className="flex flex-col gap-3 px-3 pb-3 pt-1">
          <NumberField
            label={copy.at}
            value={key.at}
            min={min}
            max={Number.isFinite(max) ? max : min + 120}
            step={0.1}
            limits={[min, Number.isFinite(max) ? max : 3600]}
            unit={units.s}
            onChange={onRetime}
            hint={
              pace !== null && (
                <p className={cn('text-[12px]', tooFast ? 'text-warning' : 'text-fg-4')}>
                  {fill(copy.pace, { value: formatMeasure(pace * 3.6, 1) })}
                  {tooFast && ` · ${copy.tooFast}`}
                </p>
              )
            }
          />
          <NumberField label={copy.lift} value={key.lift} min={0} max={60} step={0.5} limits={[0, 500]} unit={units.m} onChange={onLift} />
          <NumberField label={copy.hold} value={key.hold} min={0} max={30} step={0.5} limits={[0, 600]} unit={units.s} onChange={onHold} />
        </div>
      )}
    </div>
  );
}
