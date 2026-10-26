import { areaOf, isClosed, zoneColors, zoneName } from '@/lib/mission/noise';
import { formatMeasure } from '@/lib/format';
import { fill } from '@/lib/interpolate';
import type { Mission } from '@/types/api';
import { t } from '@/i18n/he';

const copy = t.mission.noise;

/** What the colours on the ground mean: each contour and the ground it covers, then the quiet. */
export function NoiseLegend({ mission }: { mission: Mission }) {
  const colors = zoneColors(mission.noise);
  const zones = mission.noise.map((zone, index) => ({ zone, index })).filter(({ zone }) => isClosed(zone));
  if (zones.length === 0) return null;

  return (
    <section className="flex flex-col gap-1.5 border-t border-line pt-2.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-3">{copy.title}</h3>
      <ul className="flex flex-col gap-1 text-[12px]">
        {zones.map(({ zone, index }) => (
          <li key={index} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[index], boxShadow: `0 0 8px ${colors[index]}` }} />
            <bdi className="min-w-0 flex-1 truncate text-start text-fg-2">{zoneName(zone, index)}</bdi>
            <bdi className="tabular-nums text-fg-3">
              {fill(copy.area, { area: formatMeasure(areaOf(zone.points) / mission.unitsPerMeter ** 2 / 1000, 1) })}
            </bdi>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-fg-4" />
          <span className="flex-1 text-fg-3">{copy.quiet}</span>
          <span className="text-fg-3">{copy.quietNote}</span>
        </li>
      </ul>
    </section>
  );
}
