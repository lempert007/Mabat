import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { MissionClock } from './MissionClock';
import { MissionDirector } from './MissionDirector';
import { VehicleModel } from './VehicleModel';
import { VehicleTag } from './VehicleTag';
import { Tether } from './Tether';
import { FlightPath } from './FlightPath';
import { DropZone } from './DropZone';
import { HubPad } from './HubPad';
import { HoverMarker } from './HoverMarker';
import { GroundShadows } from './GroundShadows';
import { MissionHandles } from './MissionHandles';
import { MissionBackdrop } from './MissionBackdrop';
import { missionLive } from '@/store/missionLive';
import { useMissionStore } from '@/store/missionStore';
import type { MissionPlan } from '@/lib/mission/types';
import type { Mission, Project } from '@/types/api';
import { t } from '@/i18n/he';

interface MissionSceneProps {
  project: Project;
  mission: Mission;
  plan: MissionPlan;
}

/** Matches the interface accent, so the places on the model read as part of the interface. */
const MARKER_COLOR = '#5b9cff';

const droidAboard = () => (missionLive.frame?.payout ?? 0) < 0.05;

/**
 * The mission drawn over the model: the three vehicles, the tether, the path and the places,
 * and the director at the camera. Every frame puts the vehicles where the plan says they are
 * at this moment; nothing here keeps any motion of its own.
 */
export function MissionScene({ project, mission, plan }: MissionSceneProps) {
  const carrier = useRef<Group>(null);
  const droid = useRef<Group>(null);
  const parcel = useRef<Group>(null);
  const editing = useMissionStore((s) => s.editing);
  const legs = (2 * plan.halfHeight.droid + 2 * plan.halfHeight.parcel + 0.05 * plan.unitsPerMeter) / plan.size.carrier;
  const name = (slot: 'carrier' | 'droid') => mission[slot].name || t.mission.vehicles[slot];

  useFrame(() => {
    const frame = missionLive.frame;
    if (!frame || !carrier.current || !droid.current || !parcel.current) return;
    carrier.current.position.copy(frame.carrier);
    carrier.current.rotation.set(frame.pitch, frame.heading, frame.bank, 'YXZ');
    droid.current.position.copy(frame.droid);
    droid.current.rotation.set(0, frame.heading, 0);
    parcel.current.position.copy(frame.parcel);
    if (frame.parcelState !== 'delivered') parcel.current.rotation.set(0, frame.heading, 0);
  });

  return (
    <>
      <MissionClock plan={plan} />
      <MissionBackdrop plan={plan} preset={project.settings.environment} />
      <group ref={carrier}>
        <group scale={plan.size.carrier}>
          <VehicleModel slot="carrier" project={project} mission={mission} legs={legs} />
        </group>
        <VehicleTag label={name('carrier')} size={plan.size.carrier} color={mission.carrier.color} />
      </group>
      <group ref={droid}>
        <group scale={plan.size.droid}>
          <VehicleModel slot="droid" project={project} mission={mission} legs={0} />
        </group>
        <VehicleTag label={name('droid')} size={plan.size.droid} color={mission.droid.color} hidden={droidAboard} />
      </group>
      <group ref={parcel}>
        <group scale={plan.size.parcel}>
          <VehicleModel slot="parcel" project={project} mission={mission} legs={0} />
        </group>
      </group>
      <Tether plan={plan} />
      <FlightPath plan={plan} color={MARKER_COLOR} />
      <DropZone plan={plan} color={MARKER_COLOR} />
      <HoverMarker plan={plan} color={MARKER_COLOR} />
      {plan.hub && <HubPad at={plan.hub} unitsPerMeter={plan.unitsPerMeter} color={MARKER_COLOR} />}
      <GroundShadows plan={plan} />
      {editing && <MissionHandles mission={mission} plan={plan} color={MARKER_COLOR} />}
      <MissionDirector plan={plan} mission={mission} />
    </>
  );
}
