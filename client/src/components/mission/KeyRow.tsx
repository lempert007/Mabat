import { useEffect, useRef } from 'react';
import { Crosshair, ScanEye, X } from 'lucide-react';
import { AngleField } from '@/components/ui/AngleField';
import { IconButton } from '@/components/ui/IconButton';
import { NumberField } from '@/components/ui/NumberField';
import { ACTOR_PRESETS } from '@/lib/mission/defaults';
import { editKey, keyBounds, retimeKey, setHold } from '@/lib/mission/keys';
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
  /** Which way it faces arriving here, degrees, whether the keyframe says or the motion does. */
  facing: number;
  onSelect: () => void;
  onView: () => void;
  onMove: () => void;
  onRemove: () => void;
  onEdit: (edit: (actor: Actor) => Actor) => void;
}

const copy = t.mission.scene;
const units = t.mission.units;
const LINK = 'rounded-md text-[12px] font-medium text-accent-strong hover:underline focus-ring';

/**
 * One keyframe: when the actor gets there, how high, how long it waits, and how it stands. Closed
 * it is a line to scan; selected, it opens for exact numbers. The pace on the way there is worked
 * out, so a leg timed too tight says so. How it stands is three dials: facing, which is left to
 * the motion until it is turned and shows the way it faces either way, then pitch and roll.
 */
export function KeyRow(props: KeyRowProps) {
  const { actor, index, color, selected, moving, pace, facing, onSelect, onView, onMove, onRemove, onEdit } = props;
  const key = actor.keys[index];
  const turn = (patch: Parameters<typeof editKey>[2]) => onEdit((current) => editKey(current, index, patch));
  const leaning = key.pitch !== 0 || key.roll !== 0;
  const row = useRef<HTMLDivElement>(null);
  // Picked in the scene or on the timeline, it comes into view in the panel.
  useEffect(() => {
    if (selected) row.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected]);
  const [min, max] = keyBounds(actor, index);
  const tooFast = pace !== null && pace > ACTOR_PRESETS[actor.kind].speed * 3;
  const facts = [
    key.lift > 0.05 && `↑ ${formatMeasure(key.lift, 1)} ${units.m}`,
    key.hold > 0 && `${copy.hold} ${formatMeasure(key.hold, 1)} ${units.s}`,
    key.heading !== null && `${copy.facing} ${Math.round(key.heading)}°`,
    leaning && copy.tilt,
  ].filter(Boolean);

  return (
    <div ref={row} className={cn('scroll-my-2 rounded-xl border transition-colors duration-200', selected ? 'border-accent/60 bg-accent-soft' : 'border-line bg-white/3')}>
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
            onChange={(at) => onEdit((current) => retimeKey(current, index, at))}
            hint={
              pace !== null && (
                <p className={cn('text-[12px]', tooFast ? 'text-warning' : 'text-fg-4')}>
                  {fill(copy.pace, { value: formatMeasure(pace * 3.6, 1) })}
                  {tooFast && ` · ${copy.tooFast}`}
                </p>
              )
            }
          />
          <NumberField label={copy.lift} value={key.lift} min={0} max={60} step={0.5} limits={[0, 500]} unit={units.m} onChange={(lift) => turn({ lift })} />
          <NumberField label={copy.hold} value={key.hold} min={0} max={30} step={0.5} limits={[0, 600]} unit={units.s} onChange={(hold) => onEdit((current) => setHold(current, index, hold))} />

          <div className="flex flex-col gap-2.5 rounded-xl bg-white/4 p-2.5">
            <span className="text-[13px] text-fg-2">{copy.stance}</span>
            <div className="grid grid-cols-3">
              <AngleField label={copy.facing} value={facing} implied={key.heading === null} onChange={(heading) => turn({ heading })} />
              <AngleField label={copy.pitch} value={key.pitch} limit={90} look="level" onChange={(pitch) => turn({ pitch })} />
              <AngleField label={copy.roll} value={key.roll} look="level" onChange={(roll) => turn({ roll })} />
            </div>
            <p className="text-[12px] leading-snug text-fg-3">{key.heading === null ? copy.facingAuto : copy.facingSet}</p>
            {(key.heading !== null || leaning) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {key.heading !== null && (
                  <button type="button" onClick={() => turn({ heading: null })} className={LINK}>
                    {copy.facingReset}
                  </button>
                )}
                {leaning && (
                  <button type="button" onClick={() => turn({ pitch: 0, roll: 0 })} className={LINK}>
                    {copy.level}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
