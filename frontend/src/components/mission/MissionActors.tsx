import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { VehicleModel } from './VehicleModel';
import { VehicleTag } from './VehicleTag';
import { DroneModel } from './DroneModel';
import { RoverModel } from './RoverModel';
import { ParcelModel } from './ParcelModel';
import { missionLive } from '@/store/missionLive';
import { actorName } from '@/lib/mission/names';
import type { MissionPlan } from '@/lib/mission/types';
import type { Mission } from '@/types/api';

interface MissionActorsProps {
  projectId: string;
  mission: Mission;
  plan: MissionPlan;
}

/** Everything on the rope and on the ground, each put where the plan says it is this moment. */
export function MissionActors({ projectId, mission, plan }: MissionActorsProps) {
  const groups = useRef<(Group | null)[]>([]);

  useFrame(() => {
    const frame = missionLive.frame;
    if (!frame) return;
    groups.current.forEach((group, i) => {
      const pose = frame.actors[i];
      if (!group || !pose) return;
      group.position.copy(pose.position);
      group.rotation.set(0, pose.heading, 0);
    });
  });

  return (
    <>
      {plan.cast.map(({ actor, size }, i) => {
        const pose = () => missionLive.frame?.actors[i];
        const builtIn =
          actor.kind === 'drone' ? (
            <DroneModel color={actor.color} power={() => pose()?.power ?? 0} />
          ) : actor.kind === 'rover' ? (
            <RoverModel color={actor.color} size={size} travelled={() => pose()?.travelled ?? 0} />
          ) : (
            <ParcelModel color={actor.color} />
          );
        return (
          <group key={actor.id} ref={(group) => void (groups.current[i] = group)}>
            <group scale={size}>
              <VehicleModel projectId={projectId} model={actor.model} rotation={actor.rotation} measures={actor.id} builtIn={builtIn} />
            </group>
            <VehicleTag
              label={actorName(mission, i)}
              size={size}
              color={actor.color}
              hidden={() => (pose()?.attached ?? true) && (missionLive.frame?.payout ?? 0) < 0.05}
            />
          </group>
        );
      })}
    </>
  );
}
