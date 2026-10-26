import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Vector3 } from 'three';
import type { Line2 } from 'three-stdlib';
import { missionLive } from '@/store/missionLive';
import { setLinePoints } from '@/lib/liveLine';

/** The rope from the carrier's winch to its end, wherever its load is. */
export function Tether() {
  const rope = useRef<Line2>(null);
  const points = useMemo(() => [new Vector3(), new Vector3()], []);

  useFrame(() => {
    const frame = missionLive.frame;
    if (!frame || !rope.current) return;
    rope.current.visible = frame.payout > 0.02;
    if (!rope.current.visible) return;
    points[0].copy(frame.winch);
    points[1].copy(frame.hook);
    setLinePoints(rope.current, points);
  });

  return <Line ref={rope} points={points} color="#f2f4f8" lineWidth={1.6} frustumCulled={false} />;
}
