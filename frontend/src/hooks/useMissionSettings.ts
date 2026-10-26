import { useCallback } from 'react';
import { useProjectSettings } from './useProjectSettings';
import { newMission } from '@/lib/mission/defaults';
import type { Mission, Project } from '@/types/api';

export type MissionChange = Partial<Mission> | ((mission: Mission) => Partial<Mission>);

/**
 * Edits the project's mission with the same live preview as the scene settings: the scene
 * changes under the editor's hand and the save follows once they pause. The first change to a
 * project without a mission starts one from the defaults.
 */
export function useMissionSettings(project: Project) {
  const { patch } = useProjectSettings(project);

  const update = useCallback(
    (change: MissionChange) =>
      patch((settings) => {
        const current = settings.mission ?? newMission();
        return { mission: { ...current, ...(typeof change === 'function' ? change(current) : change) } };
      }),
    [patch],
  );

  const remove = useCallback(() => patch({ mission: null }), [patch]);

  return { mission: project.settings.mission, update, remove };
}
