import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useMissionStore } from '@/store/missionStore';
import { missionLive } from '@/store/missionLive';
import type { MissionPlan } from '@/lib/mission/types';

/**
 * Runs the mission's clock and publishes the frame for this moment.
 *
 * It subscribes below the default priority, so it runs before every other frame callback and
 * whatever draws the mission sees the same moment. Negative priorities leave rendering to r3f;
 * only positive ones take it over.
 */
export function MissionClock({ plan }: { plan: MissionPlan }) {
  const invalidate = useThree((s) => s.invalidate);

  // Seeking, pausing and editing change the picture without anything asking for a frame.
  useEffect(() => useMissionStore.subscribe(() => invalidate()), [invalidate]);
  useEffect(() => invalidate(), [plan, invalidate]);
  useEffect(() => () => void (missionLive.frame = null), []);

  useFrame((_, delta) => {
    const store = useMissionStore.getState();
    store.tick(delta, plan);
    const { time, playing } = useMissionStore.getState();
    missionLive.frame = plan.frameAt(time);
    if (playing) invalidate();
  }, -1);

  return null;
}
