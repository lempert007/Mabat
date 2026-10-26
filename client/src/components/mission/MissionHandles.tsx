import { Line } from '@react-three/drei';
import { Vector3 } from 'three';
import { PlaceLabel } from './PlaceLabel';
import type { MissionPlan } from '@/lib/mission/types';
import type { Mission } from '@/types/api';
import { fill } from '@/lib/interpolate';
import { t } from '@/i18n/he';

interface MissionHandlesProps {
  mission: Mission;
  plan: MissionPlan;
  color: string;
}

/**
 * What the editor is placing, drawn while the mission panel is open. Each waypoint has a ring on
 * the spot that was clicked, carrying its number, and a stalk up to where the carrier passes at
 * cruise height. Every other place carries its name.
 */
export function MissionHandles({ mission, plan, color }: MissionHandlesProps) {
  const u = plan.unitsPerMeter;
  return (
    <>
      {mission.waypoints.map((point, index) => {
        const ground = new Vector3(point.x, point.y, point.z);
        const aloft = new Vector3(point.x, plan.cruiseY, point.z);
        return (
          <group key={index}>
            <mesh position={[ground.x, ground.y + 0.03 * u, ground.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.1 * u, 1.5 * u, 40]} />
              <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh position={aloft.toArray()}>
              <sphereGeometry args={[1.2 * u, 20, 14]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            <Line points={[ground, aloft]} color={color} lineWidth={1} dashed dashSize={2 * u} gapSize={2 * u} transparent opacity={0.6} />
            <PlaceLabel at={ground}>{fill(t.mission.panel.waypoint, { index: index + 1 })}</PlaceLabel>
          </group>
        );
      })}
      <PlaceLabel at={plan.drop}>{t.mission.places.drop}</PlaceLabel>
      {mission.hover && <PlaceLabel at={plan.hover}>{t.mission.places.hover}</PlaceLabel>}
      {plan.hub && <PlaceLabel at={plan.hub}>{t.mission.places.hub}</PlaceLabel>}
    </>
  );
}
