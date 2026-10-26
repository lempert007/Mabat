import type { ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Vector3 } from 'three';
import { NoiseContour } from './NoiseContour';
import { isTracing, noiseTarget, useMissionStore } from '@/store/missionStore';
import { isClosed, zoneColors, zoneName } from '@/lib/mission/noise';
import type { MissionPlan } from '@/lib/mission/types';
import type { Mission, NoiseZone } from '@/types/api';

interface NoiseMapProps {
  mission: Mission;
  plan: MissionPlan;
  /** The mission panel is open, so each contour's points can be picked up and moved. */
  editing: boolean;
}

/** Every noise contour of the mission, and while editing, the points they are traced through. */
export function NoiseMap({ mission, plan, editing }: NoiseMapProps) {
  const colors = zoneColors(mission.noise);
  return (
    <>
      {mission.noise.map((zone, index) => (
        <group key={index}>
          {isClosed(zone) && <NoiseContour points={zone.points} name={zoneName(zone, index)} color={colors[index]} plan={plan} />}
          {editing && <ContourPoints zone={zone} index={index} color={colors[index]} unitsPerMeter={plan.unitsPerMeter} />}
        </group>
      ))}
    </>
  );
}

interface ContourPointsProps {
  zone: NoiseZone;
  index: number;
  color: string;
  unitsPerMeter: number;
}

/**
 * The points of one contour, as handles. Clicking one picks it up and the next click on the
 * ground puts it down. While the contour is being traced, clicking its first point closes it.
 */
function ContourPoints({ zone, index, color, unitsPerMeter: u }: ContourPointsProps) {
  const placing = useMissionStore((s) => s.placing);
  const target = noiseTarget(placing);
  const moving = target?.zone === index ? target.vertex : undefined;
  const tracingThis = isTracing(placing) && target?.zone === index;
  const path = zone.points.map((p) => new Vector3(p.x, p.y + 0.3 * u, p.z));

  const pick = (vertex: number) => (event: ThreeEvent<MouseEvent>) => {
    const store = useMissionStore.getState();
    if (tracingThis && vertex === 0 && isClosed(zone)) {
      event.stopPropagation();
      store.setPlacing(null);
    } else if (!isTracing(store.placing)) {
      // While another contour or the waypoints are being traced, the click belongs to them.
      event.stopPropagation();
      store.setPlacing({ zone: index, vertex });
    }
  };

  return (
    <>
      {!isClosed(zone) && path.length > 1 && <Line points={path} color={color} lineWidth={2} dashed dashSize={1.5 * u} gapSize={1 * u} />}
      {path.map((point, vertex) => (
        <mesh key={vertex} position={point} onClick={pick(vertex)}>
          <sphereGeometry args={[(moving === vertex || (tracingThis && vertex === 0) ? 1.1 : 0.7) * u, 16, 12]} />
          <meshBasicMaterial color={moving === vertex ? '#ffffff' : color} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}
