import { useCallback } from 'react';
import { useMissionStore } from '@/store/missionStore';
import { useViewerStore } from '@/store/viewerStore';
import { aerialPose } from '@/lib/vec';
import type { MissionChange } from './useMissionSettings';
import type { MissionPlan } from '@/lib/mission/types';
import type { Actor } from '@/types/api';

/** How close the camera comes to look at a keyframe, metres. */
const KEY_VIEW = 16;

/**
 * What the ground panel and the timeline both do to the actors: change one, pick one of its
 * keyframes, and look at it. Picking a keyframe moves the clock to it, so the scene shows the
 * actor standing where that keyframe has it.
 */
export function useSceneEditor(plan: MissionPlan, update: (change: MissionChange) => void) {
  const changeActor = useCallback(
    (id: string, change: (actor: Actor) => Actor) =>
      update((current) => ({ actors: current.actors.map((actor) => (actor.id === id ? change(actor) : actor)) })),
    [update],
  );

  const selectKey = useCallback(
    (actor: Actor, key: number | null) => {
      const store = useMissionStore.getState();
      store.select({ actor: actor.id, key });
      if (key === null) return;
      store.pause();
      store.seek(plan.onsite + actor.keys[key].at);
    },
    [plan],
  );

  const viewKey = useCallback(
    (actor: Actor, key: number) => {
      const cameraApi = useViewerStore.getState().cameraApi;
      const { place, lift } = actor.keys[key];
      selectKey(actor, key);
      if (!cameraApi) return;
      useMissionStore.getState().setCamera('free');
      const u = plan.unitsPerMeter;
      const at = { ...place, y: place.y + lift * u };
      cameraApi.flyTo(aerialPose(cameraApi.getPose().position, at, (KEY_VIEW + lift) * u, 0.6));
    },
    [plan, selectKey],
  );

  return { changeActor, selectKey, viewKey };
}
