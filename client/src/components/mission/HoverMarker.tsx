import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Vector3, type Group } from 'three';
import { missionLive } from '@/store/missionLive';
import type { MissionPlan } from '@/lib/mission/types';

/** Shown until the rope is back in; after that the place has done its job. */
const MARKING = new Set(['takeoff', 'cruise', 'approach', 'lower', 'onsite', 'raise']);

/**
 * Where the carrier will hold: a ring in the air and a dashed plumb line down to the ground,
 * so the height of the hover reads at a glance before the carrier is even there.
 */
export function HoverMarker({ plan, color }: { plan: MissionPlan; color: string }) {
  const u = plan.unitsPerMeter;
  const group = useRef<Group>(null);
  const plumb = useMemo(
    () => [new Vector3(plan.hover.x, plan.drop.y, plan.hover.z), plan.hover.clone()],
    [plan],
  );

  useFrame(() => {
    const frame = missionLive.frame;
    if (frame && group.current) group.current.visible = MARKING.has(plan.stages[frame.stage].kind);
  });

  return (
    <group ref={group}>
      <mesh position={plan.hover.toArray()} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5 * u, 1.62 * u, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} depthWrite={false} toneMapped={false} />
      </mesh>
      <Line
        points={plumb}
        color={color}
        lineWidth={1}
        dashed
        dashSize={1.5 * u}
        gapSize={1.5 * u}
        transparent
        opacity={0.45}
        depthWrite={false}
      />
    </group>
  );
}
