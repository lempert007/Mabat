import { VehicleCard } from './VehicleCard';
import { VEHICLE_SLOTS } from '@/lib/mission/defaults';
import type { MissionChange } from '@/hooks/useMissionSettings';
import type { Mission, Project } from '@/types/api';

interface FleetTabProps {
  project: Project;
  mission: Mission;
  update: (change: MissionChange) => void;
}

/** The carrier, the droid and the parcel. Built-in models fly until the editor uploads their own. */
export function FleetTab({ project, mission, update }: FleetTabProps) {
  return (
    <div className="flex flex-col gap-3">
      {VEHICLE_SLOTS.map((slot) => (
        <VehicleCard key={slot} slot={slot} project={project} mission={mission} update={update} />
      ))}
    </div>
  );
}
