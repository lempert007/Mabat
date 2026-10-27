import { useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import type { Group } from 'three';
import { VehicleModel } from './VehicleModel';
import { DroneModel } from './DroneModel';
import { RoverModel } from './RoverModel';
import { ParcelModel } from './ParcelModel';
import { missionLive } from '@/store/missionLive';
import { useMissionStore } from '@/store/missionStore';
import type { MissionPlan } from '@/lib/mission/types';

interface MissionActorsProps {
  projectId: string;
  plan: MissionPlan;
}

/**
 * Everything on the rope and on the ground, each put where the plan says it is this moment.
 * While the mission is edited, clicking one opens it in the panel.
 */
export function MissionActors({ projectId, plan }: MissionActorsProps) {
  const groups = useRef<(Group | null)[]>([]);
  const editing = useMissionStore((s) => s.editing);
  const canvas = useThree((s) => s.gl.domElement);

  const pick = (id: string) => (event: ThreeEvent<MouseEvent>) => {
    const store = useMissionStore.getState();
    if (store.placing !== null || event.delta > 4) return;
    event.stopPropagation();
    store.setTab('scene');
    store.select({ actor: id, key: null });
  };
  const hover = (on: boolean) => () => {
    if (useMissionStore.getState().placing === null) canvas.style.cursor = on ? 'pointer' : '';
  };

  useFrame(() => {
    const frame = missionLive.frame;
    if (!frame) return;
    groups.current.forEach((group, i) => {
      const pose = frame.actors[i];
      if (!group || !pose) return;
      group.position.copy(pose.position);
      group.quaternion.copy(pose.quaternion);
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
          <group
            key={actor.id}
            ref={(group) => void (groups.current[i] = group)}
            {...(editing && { onClick: pick(actor.id), onPointerOver: hover(true), onPointerOut: hover(false) })}
          >
            <group scale={size}>
              <VehicleModel projectId={projectId} model={actor.model} rotation={actor.rotation} measures={actor.id} builtIn={builtIn} />
            </group>
          </group>
        );
      })}
    </>
  );
}
