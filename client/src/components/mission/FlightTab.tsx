import { AlertTriangle, Check } from 'lucide-react';
import { NumberField } from '@/components/ui/NumberField';
import { PanelSection } from '@/components/viewer/PanelSection';
import { CarrierCard } from './CarrierCard';
import { fill } from '@/lib/interpolate';
import { formatMeasure } from '@/lib/format';
import type { MissionChange } from '@/hooks/useMissionSettings';
import type { MissionPlan } from '@/lib/mission/types';
import type { Mission } from '@/types/api';
import { t } from '@/i18n/he';

interface FlightTabProps {
  projectId: string;
  mission: Mission;
  plan: MissionPlan | null;
  update: (change: MissionChange) => void;
}

const copy = t.mission.panel;
const units = t.mission.units;

/** The carrier and how it flies. Every change is visible in the scene at once. */
export function FlightTab({ projectId, mission, plan, update }: FlightTabProps) {
  const tetherCheck = plan && (
    mission.tetherLength >= plan.tetherNeeded ? (
      <p className="flex items-center gap-1.5 text-[12px] text-success">
        <Check size={13} />
        {fill(copy.tetherOk, { needed: formatMeasure(plan.tetherNeeded), length: formatMeasure(mission.tetherLength) })}
      </p>
    ) : (
      <p className="flex items-start gap-1.5 text-[12px] leading-snug text-warning">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
        {fill(copy.tetherShort, { missing: formatMeasure(plan.tetherNeeded - mission.tetherLength) })}
      </p>
    )
  );

  return (
    <div className="flex flex-col gap-7">
      <CarrierCard projectId={projectId} mission={mission} update={update} />
      <PanelSection title={copy.onTheWay}>
        <NumberField label={copy.cruiseAltitude} value={mission.cruiseAltitude} min={10} max={300} limits={[5, 1000]} unit={units.m} onChange={(cruiseAltitude) => update({ cruiseAltitude })} />
        <NumberField
          label={copy.cruiseSpeed}
          value={Math.round(mission.cruiseSpeed * 3.6)}
          min={20}
          max={220}
          limits={[1, 430]}
          unit={units.kmh}
          onChange={(kmh) => update({ cruiseSpeed: kmh / 3.6 })}
        />
        <NumberField label={copy.climbRate} value={mission.climbRate} min={1} max={12} step={0.5} limits={[0.1, 30]} unit={units.ms} onChange={(climbRate) => update({ climbRate })} />
      </PanelSection>

      <PanelSection title={copy.overTheDrop}>
        <NumberField label={copy.hoverAltitude} value={mission.hoverAltitude} min={5} max={200} limits={[3, 1000]} unit={units.m} onChange={(hoverAltitude) => update({ hoverAltitude })} />
        <NumberField
          label={copy.tetherLength}
          value={mission.tetherLength}
          min={5}
          max={250}
          limits={[1, 1000]}
          unit={units.m}
          hint={tetherCheck}
          onChange={(tetherLength) => update({ tetherLength })}
        />
        <NumberField label={copy.winchSpeed} value={mission.winchSpeed} min={0.5} max={8} step={0.1} limits={[0.1, 20]} unit={units.ms} onChange={(winchSpeed) => update({ winchSpeed })} />
        <NumberField
          label={copy.releaseHeight}
          value={mission.releaseHeight}
          min={0}
          max={30}
          step={0.5}
          limits={[0, 200]}
          unit={units.m}
          hint={<p className="text-[12px] leading-snug text-fg-4">{copy.releaseHint}</p>}
          onChange={(releaseHeight) => update({ releaseHeight })}
        />
        <NumberField label={copy.dwell} value={mission.dwell} min={0} max={30} limits={[0, 120]} unit={units.s} onChange={(dwell) => update({ dwell })} />
      </PanelSection>
    </div>
  );
}
