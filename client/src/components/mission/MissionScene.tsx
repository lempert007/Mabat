import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { MissionClock } from './MissionClock';
import { MissionDirector } from './MissionDirector';
import { CursorPivot } from './CursorPivot';
import { VehicleModel } from './VehicleModel';
import { CarrierModel } from './CarrierModel';
import { MissionActors } from './MissionActors';
import { MissionTags } from './MissionTags';
import { ActorPaths } from './ActorPaths';
import { Tether } from './Tether';
import { FlightPath } from './FlightPath';
import { DropZone } from './DropZone';
import { HubPad } from './HubPad';
import { HoverMarker } from './HoverMarker';
import { GroundShadows } from './GroundShadows';
import { MissionHandles } from './MissionHandles';
import { MissionBackdrop } from './MissionBackdrop';
import { NoiseMap } from './NoiseMap';
import { missionLive } from '@/store/missionLive';
import { useMissionStore } from '@/store/missionStore';
import type { MissionPlan } from '@/lib/mission/types';
import type { Mission, Project } from '@/types/api';

interface MissionSceneProps {
  project: Project;
  mission: Mission;
  plan: MissionPlan;
}

/** Matches the interface accent, so the places on the model read as part of the interface. */
const MARKER_COLOR = '#5b9cff';

/**
 * The mission drawn over the model: the carrier and its rope, everything on the ground, the
 * path and the places, and the director at the camera. Every frame puts each thing where the
 * plan says it is at this moment; nothing here keeps any motion of its own.
 */
export function MissionScene({ project, mission, plan }: MissionSceneProps) {
  const carrier = useRef<Group>(null);
  const editing = useMissionStore((s) => s.editing);
  const noiseShown = useMissionStore((s) => s.noiseShown);
  const { carrier: vehicle } = mission;

  useFrame(() => {
    const frame = missionLive.frame;
    if (!frame || !carrier.current) return;
    carrier.current.position.copy(frame.carrier);
    carrier.current.rotation.set(frame.pitch, frame.heading, frame.bank, 'YXZ');
  });

  return (
    <>
      <MissionClock plan={plan} />
      <MissionBackdrop plan={plan} preset={project.settings.environment} />
      <group ref={carrier}>
        <group scale={plan.carrier.size}>
          <VehicleModel
            projectId={project.id}
            model={vehicle.model}
            rotation={vehicle.rotation}
            measures="carrier"
            builtIn={<CarrierModel color={vehicle.color} legs={plan.carrier.legs / plan.carrier.size} />}
          />
        </group>
      </group>
      <MissionActors projectId={project.id} plan={plan} />
      <MissionTags mission={mission} plan={plan} />
      <Tether />
      <FlightPath plan={plan} color={MARKER_COLOR} />
      <DropZone plan={plan} color={MARKER_COLOR} />
      <HoverMarker plan={plan} color={MARKER_COLOR} />
      {plan.hub && <HubPad at={plan.hub} unitsPerMeter={plan.unitsPerMeter} color={MARKER_COLOR} />}
      <GroundShadows plan={plan} />
      {noiseShown && <NoiseMap mission={mission} plan={plan} editing={editing} />}
      {editing && <MissionHandles mission={mission} plan={plan} color={MARKER_COLOR} />}
      {editing && <ActorPaths plan={plan} />}
      <MissionDirector plan={plan} mission={mission} />
      <CursorPivot />
    </>
  );
}
