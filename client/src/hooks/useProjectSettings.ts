import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { useUpdateProject } from '@/api/projects';
import { deepEqual } from '@/lib/deepEqual';
import { errorMessage } from '@/lib/errorMessage';
import { turnMission, turnPoints } from '@/lib/orientation';
import { toast } from '@/store/toastStore';
import { useMissionStore } from '@/store/missionStore';
import { useDebouncedCallback } from './useDebouncedCallback';
import type { Poi, Project, ProjectSettings } from '@/types/api';

/** Continuous controls fire many times per drag, so the save is delayed until they settle. */
const SAVE_DELAY_MS = 400;

/**
 * Scene settings with live preview. Every change is written to the query cache straight away so
 * the 3D view updates under the user's cursor, while the request to the server is debounced.
 *
 * Turning the model turns the cached points and the mission's places with it, so nothing comes
 * away from the geometry. Should the save fail, both are read back from the server.
 */
export function useProjectSettings(project: Project) {
  const queryClient = useQueryClient();
  const update = useUpdateProject(project.id);
  const settingsRef = useRef(project.settings);
  settingsRef.current = project.settings;

  const save = useDebouncedCallback(
    (next: ProjectSettings) =>
      update.mutate(
        { settings: next },
        {
          onError: (error) => {
            toast.error(errorMessage(error));
            void queryClient.invalidateQueries({ queryKey: queryKeys.project(project.id), exact: true });
            void queryClient.invalidateQueries({ queryKey: queryKeys.pois(project.id) });
          },
        },
      ),
    SAVE_DELAY_MS,
  );

  /** Takes the change itself, or a function of the latest settings for one built on them. */
  const patch = useCallback(
    (change: Partial<ProjectSettings> | ((current: ProjectSettings) => Partial<ProjectSettings>)) => {
      const previous = settingsRef.current;
      const next = { ...previous, ...(typeof change === 'function' ? change(previous) : change) };
      if (!deepEqual(previous.modelRotation, next.modelRotation)) {
        queryClient.setQueryData<Poi[]>(queryKeys.pois(project.id), (pois) =>
          pois && turnPoints(pois, previous.modelRotation, next.modelRotation),
        );
        if (next.mission) next.mission = turnMission(next.mission, previous.modelRotation, next.modelRotation);
        // Earlier versions of the mission stand where the model used to be.
        useMissionStore.getState().clearHistory();
      }
      settingsRef.current = next;
      queryClient.setQueryData<Project>(queryKeys.project(project.id), (current) =>
        current ? { ...current, settings: next } : current,
      );
      save(next);
    },
    [queryClient, project.id, save],
  );

  return { settings: project.settings, patch };
}
