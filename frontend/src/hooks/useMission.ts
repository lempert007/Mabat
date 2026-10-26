import { useCallback } from 'react';
import { useMissionPlan } from './useMissionPlan';
import { useMissionSettings } from './useMissionSettings';
import { useMissionStore } from '@/store/missionStore';
import { useViewerStore } from '@/store/viewerStore';
import { stageIndexAt } from '@/lib/mission/plan';
import type { Project, Vec3 } from '@/types/api';

/**
 * The project's mission as the viewer runs it: the plan, the settings the panel edits, and the
 * actions the keyboard, the player, the intro and the panel share.
 */
export function useMission(project: Project) {
  const plan = useMissionPlan(project);
  const { mission, update, remove } = useMissionSettings(project);
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
    (position: Vec3) => {
      const store = useMissionStore.getState();
      const target = store.placing;
      if (target === null) return;
      if (target === 'waypoint') {
        update((current) => ({ waypoints: [...current.waypoints, position] }));
        return;
      }
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
    [mission?.drop, update, watch],
  );

  const removeMission = useCallback(() => {
    useMissionStore.getState().setView('explore');
    remove();
  }, [remove]);

  return { plan, mission, visible, stage, update, remove: removeMission, watch, step, togglePlay, preview, place };
}
