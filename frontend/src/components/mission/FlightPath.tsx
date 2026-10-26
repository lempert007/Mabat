import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { AdditiveBlending, Color, Vector3 } from 'three';
import type { Line2 } from 'three-stdlib';
import { missionLive } from '@/store/missionLive';
import { useMissionStore } from '@/store/missionStore';
import { setLinePoints } from '@/lib/liveLine';
import { PATH_STEP } from '@/lib/mission/plan';
import type { MissionPlan } from '@/lib/mission/types';

/** The trail covers this much of the flight behind the carrier, s. */
const TRAIL_SECONDS = 5;
const TRAIL_POINTS = Math.round(TRAIL_SECONDS / PATH_STEP);
/** The dashed path is drawn from one sample in this many. */
const PATH_STRIDE = 10;

/**
 * The whole flight as a faint dashed line, and a bright trail behind the carrier.
 *
 * The trail is read off the plan's own samples of the flight rather than recorded as it goes,
 * so it is right after a jump or while scrubbing backwards, not a streak across the scene.
 */
export function FlightPath({ plan, color }: { plan: MissionPlan; color: string }) {
  const trail = useRef<Line2>(null);
  const route = useMemo(() => plan.path.filter((_, i) => i % PATH_STRIDE === 0).concat(plan.path.at(-1)!), [plan]);
  const points = useMemo(() => Array.from({ length: TRAIL_POINTS }, () => new Vector3()), []);
  // Additive blending, so fading the colour to black fades the trail out.
  const colors = useMemo(() => {
    const head = new Color(color);
    return points.map((_, i) => {
      const faded = head.clone().multiplyScalar((i / (TRAIL_POINTS - 1)) ** 1.6);
      return [faded.r, faded.g, faded.b] as [number, number, number];
    });
  }, [points, color]);

  useFrame(() => {
    const frame = missionLive.frame;
    if (!frame || !trail.current) return;
    const now = Math.floor(useMissionStore.getState().time / PATH_STEP);
    points.forEach((point, i) => {
      const index = now - (TRAIL_POINTS - 1 - i);
      point.copy(plan.path[Math.min(Math.max(index, 0), plan.path.length - 1)]);
    });
    points[TRAIL_POINTS - 1].copy(frame.carrier);
    setLinePoints(trail.current, points);
  });

  return (
    <>
      <Line points={route} color="#ffffff" lineWidth={1} dashed dashSize={plan.unitsPerMeter * 4} gapSize={plan.unitsPerMeter * 4} transparent opacity={0.22} depthWrite={false} />
      <Line
        ref={trail}
        points={points}
        vertexColors={colors}
        lineWidth={3}
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        frustumCulled={false}
      />
    </>
  );
}
