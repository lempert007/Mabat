import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './client';
import { queryKeys, refreshProjectList } from './queryKeys';
import type { ImportMode, ImportResult, PointsDocument } from '@/types/api';

export const POINTS_DOCUMENT_FORMAT = 'mabat.points';

/** Fetches the export and hands it to the browser as a file. Everything stays on this machine. */
export async function downloadPoints(projectId: string, projectName: string): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}/points/export`, {
    credentials: 'same-origin',
  });
  if (!response.ok) throw new ApiError(response.status, response.statusText);

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName || 'project'} - points.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Reads a picked file and checks it really is a points export before anything is sent. */
export async function readPointsDocument(file: File): Promise<PointsDocument> {
  const parsed: unknown = JSON.parse(await file.text());
  const document = parsed as Partial<PointsDocument>;
  if (document?.format !== POINTS_DOCUMENT_FORMAT || !Array.isArray(document.points)) {
    throw new Error('not-a-points-document');
  }
  return document as PointsDocument;
}

export function useImportPoints(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ document, mode }: { document: PointsDocument; mode: ImportMode }) =>
      api.post<ImportResult>(`/projects/${projectId}/points/import`, { document, mode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pois(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories(projectId) });
      void refreshProjectList(queryClient);
    },
  });
}
