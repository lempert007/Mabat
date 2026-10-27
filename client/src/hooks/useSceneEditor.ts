import { useCallback } from 'react';
import { Vector3 } from 'three';
import { useMissionStore } from '@/store/missionStore';
import { useViewerStore } from '@/store/viewerStore';
import { aerialPose, fromVector3 } from '@/lib/vec';
import { editActor, footOf, normalOf } from '@/lib/mission/keys';
import type { MissionChange } from './useMissionSettings';
import type { MissionPlan } from '@/lib/mission/types';
import type { Actor } from '@/types/api';

/** How close the camera comes to look at a keyframe, metres. */
const KEY_VIEW = 16;
/** How far off the camera stands to take in the ground around the drop, metres. */
const GROUND_VIEW = 45;

/**
 * What the ground panel and the timeline both do to the actors: change one, pick one of its
 * keyframes, and look at it. Picking a keyframe moves the clock to it, so the scene shows the
 * actor standing where that keyframe has it.
 *
 * Working on the ground starts at the ground: if the clock and the camera are off in the flight,
 * they are brought to the moment the load comes down and to the drop, so the places clicked next
 * land where the actors are rather than wherever the carrier happened to be.
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
      const spot = actor.keys[key];
      selectKey(actor, key);
      if (!cameraApi) return;
      useMissionStore.getState().setCamera('free');
      const u = plan.unitsPerMeter;
      const facing = normalOf(spot);
      const at = footOf(spot, u);
      const distance = (KEY_VIEW + spot.lift) * u;
      // On the ground, from where the camera already is; on a wall, from in front of it.
      if (facing.y > 0.7) cameraApi.flyTo(aerialPose(cameraApi.getPose().position, fromVector3(at), distance, 0.6));
      else {
        const away = new Vector3(facing.x, 0, facing.z).normalize().setY(0.45).normalize();
        cameraApi.flyTo({ position: fromVector3(at.clone().addScaledVector(away, distance)), target: fromVector3(at) });
      }
    },
    [plan, selectKey],
  );

  const showGround = useCallback(() => {
    const store = useMissionStore.getState();
    const ground = plan.stages.find((stage) => stage.kind === 'onsite');
    if (!ground || (store.time >= ground.start && store.time <= ground.start + ground.duration)) return;
    store.pause();
    store.seek(plan.onsite);
    const cameraApi = useViewerStore.getState().cameraApi;
    if (!cameraApi) return;
    store.setCamera('free');
    cameraApi.flyTo(aerialPose(cameraApi.getPose().position, fromVector3(plan.drop), GROUND_VIEW * plan.unitsPerMeter, 0.7));
  }, [plan]);

  return { changeActor, selectKey, viewKey, showGround };
}
