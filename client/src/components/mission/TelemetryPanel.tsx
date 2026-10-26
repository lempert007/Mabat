import { CircleCheck } from 'lucide-react';
import { TelemetryReading } from './TelemetryReading';
import { NoiseLegend } from './NoiseLegend';
import { useMissionStore } from '@/store/missionStore';
import { telemetryAt } from '@/lib/mission/telemetry';
import { formatClock, formatMeasure } from '@/lib/format';
import type { MissionPlan } from '@/lib/mission/types';
import type { Mission } from '@/types/api';
import { t } from '@/i18n/he';

const units = t.mission.units;
const labels = t.mission.telemetry;

/**
 * The ground station's readout. Read off the same frames the scene draws, so the numbers are
 * the flight on screen, scrubbing and all.
 */
export function TelemetryPanel({ plan, mission }: { plan: MissionPlan; mission: Mission }) {
  const time = useMissionStore((s) => s.time);
  const reading = telemetryAt(plan, time);
  const tether = Math.min(reading.payout / mission.tetherLength, 1);
  const delivered = time >= plan.onsite;
  const noiseShown = useMissionStore((s) => s.noiseShown);

  return (
    <aside className="pointer-events-none absolute end-4 top-20 z-20 hidden w-[232px] flex-col gap-3 rounded-2xl glass px-4 py-3.5 md:flex">
      <header className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-3">{labels.title}</h2>
        <span dir="ltr" className="text-[12px] font-medium tabular-nums text-accent-strong">
          T+{formatClock(time)}
        </span>
      </header>
      <dl className="flex flex-col gap-2">
        <TelemetryReading label={labels.altitude} value={formatMeasure(Math.max(reading.altitude, 0))} unit={units.m} />
        <TelemetryReading label={labels.speed} value={formatMeasure(reading.groundSpeed * 3.6)} unit={units.kmh} />
        <TelemetryReading label={labels.toDrop} value={formatMeasure(reading.toDrop)} unit={units.m} />
        <div className="flex flex-col gap-1.5">
          <TelemetryReading label={labels.tether} value={formatMeasure(reading.payout, 1)} unit={units.m} />
          <span className="h-1 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full bg-accent transition-[width] duration-100" style={{ width: `${tether * 100}%` }} />
          </span>
        </div>
      </dl>
      <footer className="flex items-center justify-between border-t border-line pt-2.5 text-[12px]">
        {delivered ? (
          <>
            <span className="inline-flex items-center gap-1.5 font-medium text-success">
              <CircleCheck size={13} />
              {labels.deliveredAt}
            </span>
            <bdi className="tabular-nums text-fg-2">{formatClock(plan.onsite)}</bdi>
          </>
        ) : (
          <>
            <span className="text-fg-3">{labels.deliveryIn}</span>
            <bdi className="font-semibold tabular-nums text-fg">{formatClock(plan.onsite - time)}</bdi>
          </>
        )}
      </footer>
      {noiseShown && <NoiseLegend mission={mission} />}
    </aside>
  );
}
