import { useCallback } from 'react';
import { useMissionPlan } from './useMissionPlan';
import { useMissionSettings } from './useMissionSettings';
import { actorTarget, isTracing, noiseTarget, useMissionStore } from '@/store/missionStore';
import { editActor, editKey, removeKey, withNextKey } from '@/lib/mission/keys';
import { useViewerStore } from '@/store/viewerStore';
import { stageIndexAt } from '@/lib/mission/plan';
import type { Project, Vec3 } from '@/types/api';

/**
 * The project's mission as the viewer runs it: the plan, the settings the panel edits, and the
 * actions the keyboard, the player, the intro and the panel share.
 */
export function useMission(project: Project) {
  const plan = useMissionPlan(project);
  const { mission, update, remove, undo, redo } = useMissionSettings(project);
  const visible = useMissionStore((s) => s.view === 'mission') && plan !== null;
  const stage = useMissionStore((s) => (plan ? stageIndexAt(plan, s.time) : 0));

  /** Opens the mission from its first moment, with the director at the camera. */
  const watch = useCallback(() => {
    const viewer = useViewerStore.getState();
    viewer.whenEditorClean(() => {
      viewer.dismissIntro();
      viewer.selectPoi(null);
      viewer.setTourPlaying(false);
      viewer.setListOpen(false);
      useMissionStore.getState().watch();
    });
  }, []);

  /**
   * A stage back or forward. Back from a little way into a stage starts it again, the way a
   * player's back button restarts a track. Presenting, forward from a stage waiting at its start
   * plays it rather than skipping it.
   */
  const step = useCallback(
    (delta: 1 | -1) => {
      if (!plan) return;
      const store = useMissionStore.getState();
      const index = stageIndexAt(plan, store.time);
      const current = plan.stages[index];
      if (delta === 1 && store.stepwise && !store.playing && store.time - current.start < 1e-3) {
        store.play(plan);
        return;
      }
      const target = delta === -1 && store.time - current.start > 1.5 ? index : index + delta;
      store.seek(plan.stages[Math.min(Math.max(target, 0), plan.stages.length - 1)].start);
    },
    [plan],
  );

  const togglePlay = useCallback(() => {
    if (!plan) return;
    const store = useMissionStore.getState();
    if (store.playing) store.pause();
    else store.play(plan);
  }, [plan]);

  /** Plays one stage from its start, the way the audience will see it. */
  const preview = useCallback(
    (index: number) => {
      if (!plan) return;
      const store = useMissionStore.getState();
      store.setView('mission');
      store.setCamera('cinematic');
      store.seek(plan.stages[index].start);
      store.play(plan);
    },
    [plan],
  );

  /** Puts whatever the panel is placing at the spot the editor clicked. */
  const place = useCallback(
    (position: Vec3, normal: Vec3) => {
      const store = useMissionStore.getState();
      const target = store.placing;
      if (target === null) return;
      if (target === 'waypoint') {
        update((current) => ({ waypoints: [...current.waypoints, position] }));
        return;
      }
      const actor = actorTarget(target);
      if (actor) {
        const index = mission?.actors.findIndex((a) => a.id === actor.actor) ?? -1;
        if (!plan || index === -1) return;
        if (actor.key !== undefined) store.setPlacing(null);
        let arrives = 0;
        update(
          editActor(actor.actor, (current) => {
            const next =
              actor.key === undefined ? withNextKey(plan, current, index, position, normal) : editKey(current, actor.key, { place: position, normal });
            arrives = next.keys[actor.key ?? next.keys.length - 1].at;
            return next;
          }),
        );
        // Shows it arriving where the click put it.
        store.pause();
        store.seek(plan.onsite + arrives);
        return;
      }
      const noise = noiseTarget(target);
      if (noise) {
        const { zone, vertex } = noise;
        if (vertex !== undefined) store.setPlacing(null);
        const moved = (points: Vec3[]) =>
          vertex === undefined ? [...points, position] : points.map((point, i) => (i === vertex ? position : point));
        update((current) => ({
          noise: current.noise.map((contour, i) => (i === zone ? { ...contour, points: moved(contour.points) } : contour)),
        }));
        return;
      }
      if (typeof target === 'object') return;
      store.setPlacing(null);
      if (typeof target === 'number') {
        update((current) => ({ waypoints: current.waypoints.map((point, i) => (i === target ? position : point)) }));
        return;
      }
      const first = target === 'drop' && !mission?.drop;
      update({ [target]: position });
      // The first drop is all a mission needs, so it starts playing straight away.
      if (first) watch();
    },
    [mission, plan, update, watch],
  );

  /** Takes back the last waypoint, contour point or keyframe while they are being added. */
  const undoPlace = useCallback(() => {
    const target = useMissionStore.getState().placing;
    if (!isTracing(target)) return;
    const noise = noiseTarget(target);
    const actor = actorTarget(target);
    if (target === 'waypoint') update((current) => ({ waypoints: current.waypoints.slice(0, -1) }));
    else if (noise) {
      update((current) => ({
        noise: current.noise.map((contour, i) => (i === noise.zone ? { ...contour, points: contour.points.slice(0, -1) } : contour)),
      }));
    } else if (actor) {
      update(editActor(actor.actor, (current) => removeKey(current, current.keys.length - 1)));
    }
  }, [update]);

  const removeMission = useCallback(() => {
    useMissionStore.getState().setView('explore');
    remove();
  }, [remove]);

  return { plan, mission, visible, stage, update, remove: removeMission, undo, redo, watch, step, togglePlay, preview, place, undoPlace };
}
