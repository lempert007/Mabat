import { useCallback } from 'react';
import { Vector3 } from 'three';
import { useMissionStore } from '@/store/missionStore';
import { useViewerStore } from '@/store/viewerStore';
import { aerialPose, fromVector3, toVector3 } from '@/lib/vec';
import { editActor } from '@/lib/mission/keys';
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
  const changeActor = useCallback((id: string, edit: (actor: Actor) => Actor) => update(editActor(id, edit)), [update]);

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
      const { place, lift, normal } = actor.keys[key];
      selectKey(actor, key);
      if (!cameraApi) return;
      useMissionStore.getState().setCamera('free');
      const u = plan.unitsPerMeter;
      const facing = normal ? toVector3(normal).normalize() : new Vector3(0, 1, 0);
      const at = toVector3(place).addScaledVector(facing, lift * u);
      const distance = (KEY_VIEW + lift) * u;
      // On the ground, from where the camera already is; on a wall, from in front of it.
      if (facing.y > 0.7) cameraApi.flyTo(aerialPose(cameraApi.getPose().position, fromVector3(at), distance, 0.6));
      else {
        const away = new Vector3(facing.x, 0, facing.z).normalize().setY(0.45).normalize();
        cameraApi.flyTo({ position: fromVector3(at.clone().addScaledVector(away, distance)), target: fromVector3(at) });
      }
    },
    [plan, selectKey],
  );

  return { changeActor, selectKey, viewKey };
}
