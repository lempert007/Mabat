import { useMutation } from '@tanstack/react-query';
import { uploadForm } from './client';
import type { MissionModel } from '@/types/api';

/** A stored model never changes behind its id, so the id alone keeps it out of a stale cache. */
export const missionModelUrl = (projectId: string, modelId: string) => `/api/projects/${projectId}/mission-models/${modelId}`;

/**
 * Converts and stores a model for the mission, and answers with its id. Nothing on the project
 * changes until the mission is pointed at that id, which saves with the rest of the mission.
 */
export function useUploadMissionModel(projectId: string) {
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (fraction: number) => void }) => {
      const form = new FormData();
      form.append('file', file);
      return uploadForm<MissionModel>(`/projects/${projectId}/mission-models`, form, { onProgress });
    },
  });
}
