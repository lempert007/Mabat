import { useCallback } from 'react';
import { useProjectSettings } from './useProjectSettings';
import { useMissionStore } from '@/store/missionStore';
import { newMission } from '@/lib/mission/defaults';
import type { Mission, Project } from '@/types/api';

export type MissionChange = Partial<Mission> | ((mission: Mission) => Partial<Mission>);

/**
 * Edits the project's mission with the same live preview as the scene settings: the scene
 * changes under the editor's hand and the save follows once they pause. The first change to a
 * project without a mission starts one from the defaults.
 *
 * Every edit can be taken back. Edits in quick succession, like the steps of a drag or the
 * letters of a name, go back together.
 */
export function useMissionSettings(project: Project) {
  const { patch } = useProjectSettings(project);

  const update = useCallback(
    (change: MissionChange) =>
      patch((settings) => {
        useMissionStore.getState().record(settings.mission);
        const current = settings.mission ?? newMission();
        return { mission: { ...current, ...(typeof change === 'function' ? change(current) : change) } };
      }),
    [patch],
  );

  const remove = useCallback(
    () =>
      patch((settings) => {
        useMissionStore.getState().record(settings.mission);
        return { mission: null };
      }),
    [patch],
  );

  /** Steps back or forward through the edits, leaving any selection that no longer exists. */
  const travel = useCallback(
    (direction: 'undo' | 'redo') =>
      patch((settings) => {
        const store = useMissionStore.getState();
        const target = direction === 'undo' ? store.takeUndo(settings.mission) : store.takeRedo(settings.mission);
        if (target === undefined) return {};
        if (store.selected && !target?.actors.some((actor) => actor.id === store.selected?.actor)) store.select(null);
        return { mission: target };
      }),
    [patch],
  );
  const undo = useCallback(() => travel('undo'), [travel]);
  const redo = useCallback(() => travel('redo'), [travel]);

  return { mission: project.settings.mission, update, remove, undo, redo };
}
