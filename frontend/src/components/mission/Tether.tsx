import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Vector3 } from 'three';
import type { Line2 } from 'three-stdlib';
import { missionLive } from '@/store/missionLive';
import { setLinePoints } from '@/lib/liveLine';
import type { MissionPlan } from '@/lib/mission/types';

/** The winch line from the carrier's belly to the droid, and the parcel's cord while it goes down. */
export function Tether({ plan }: { plan: MissionPlan }) {
  const tether = useRef<Line2>(null);
  const cord = useRef<Line2>(null);
  const points = useMemo(() => [new Vector3(), new Vector3()], []);
  const cordPoints = useMemo(() => [new Vector3(), new Vector3()], []);

  useFrame(() => {
    const frame = missionLive.frame;
    if (!frame || !tether.current || !cord.current) return;

    tether.current.visible = frame.payout > 0.02;
    if (tether.current.visible) {
      points[0].copy(frame.winch);
      points[1].copy(frame.droid).y += plan.halfHeight.droid;
      setLinePoints(tether.current, points);
    }

    cord.current.visible = frame.parcelState === 'lowering';
    if (cord.current.visible) {
      cordPoints[0].copy(frame.droid).y -= plan.halfHeight.droid;
      cordPoints[1].copy(frame.parcel).y += plan.halfHeight.parcel;
      setLinePoints(cord.current, cordPoints);
    }
  });

  return (
    <>
      <Line ref={tether} points={points} color="#f2f4f8" lineWidth={1.6} frustumCulled={false} />
      <Line ref={cord} points={cordPoints} color="#d8dde6" lineWidth={1} frustumCulled={false} />
    </>
  );
}
