import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { useUpdateProject } from '@/api/projects';
import { useDebouncedCallback } from './useDebouncedCallback';
import type { Project, ProjectSettings } from '@/types/api';

/** Continuous controls fire many times per drag, so the save is delayed until they settle. */
const SAVE_DELAY_MS = 400;

/**
 * Scene settings with live preview. Every change is written to the query cache straight away so
 * the 3D view updates under the user's cursor, while the request to the server is debounced.
 */
export function useProjectSettings(project: Project) {
  const queryClient = useQueryClient();
  const update = useUpdateProject(project.id);
  const settingsRef = useRef(project.settings);
  settingsRef.current = project.settings;

  const save = useDebouncedCallback(
    (next: ProjectSettings) => update.mutate({ settings: next }),
    SAVE_DELAY_MS,
  );

  const patch = useCallback(
    (partial: Partial<ProjectSettings>) => {
      const next = { ...settingsRef.current, ...partial };
      queryClient.setQueryData<Project>(queryKeys.project(project.id), (current) =>
        current ? { ...current, settings: next } : current,
      );
      save(next);
    },
    [queryClient, project.id, save],
  );

  return { settings: project.settings, patch };
}
