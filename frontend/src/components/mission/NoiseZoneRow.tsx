import { PenLine, ScanEye, X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { inputClass } from '@/components/ui/Input';
import { areaOf, isClosed } from '@/lib/mission/noise';
import { formatMeasure } from '@/lib/format';
import { fill } from '@/lib/interpolate';
import { cn } from '@/lib/cn';
import type { NoiseZone } from '@/types/api';
import { t } from '@/i18n/he';

interface NoiseZoneRowProps {
  zone: NoiseZone;
  index: number;
  color: string;
  unitsPerMeter: number;
  /** The editor's clicks are adding points to this contour. */
  drawing: boolean;
  onRename: (label: string) => void;
  onDraw: () => void;
  onView: () => void;
  onRemove: () => void;
}

const copy = t.mission.noise;

/** One noise contour: its name in the study, how much ground it covers, and its controls. */
export function NoiseZoneRow({ zone, index, color, unitsPerMeter, drawing, onRename, onDraw, onView, onRemove }: NoiseZoneRowProps) {
  const closed = isClosed(zone);
  const dunams = areaOf(zone.points) / unitsPerMeter ** 2 / 1000;
  const status = closed
    ? `${fill(copy.points, { count: zone.points.length })} · ${fill(copy.area, { area: formatMeasure(dunams, 1) })}`
    : copy.needsPoints;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors duration-200',
        drawing ? 'border-accent/60 bg-accent-soft' : 'border-line bg-white/3',
      )}
    >
      <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
      <div className="min-w-0 flex-1">
        <input
          aria-label={copy.label}
          dir="auto"
          value={zone.label}
          maxLength={40}
          placeholder={fill(copy.zone, { index: index + 1 })}
          onChange={(event) => onRename(event.target.value)}
          className={cn(inputClass, 'h-7 rounded-lg px-2 text-[13px] font-medium')}
        />
        <p className={cn('mt-0.5 truncate text-[12px]', closed ? 'text-fg-3' : 'text-warning')}>{status}</p>
      </div>
      {closed && (
        <IconButton label={t.mission.panel.view} size="sm" onClick={onView}>
          <ScanEye size={15} />
        </IconButton>
      )}
      <IconButton label={closed ? copy.redraw : copy.draw} size="sm" active={drawing} onClick={onDraw}>
        <PenLine size={15} />
      </IconButton>
      <IconButton label={copy.remove} size="sm" tone="danger" onClick={onRemove}>
        <X size={15} />
      </IconButton>
    </div>
  );
}
