import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, uploadForm } from './client';
import { queryKeys, refreshProjectList } from './queryKeys';
import { deepEqual } from '@/lib/deepEqual';
import type { Project, ProjectStage, ProjectUpdate } from '@/types/api';

const isBusy = (project: Project) => project.status === 'uploaded' || project.status === 'processing';

/** The version keeps a reprocessed model from being served from cache. */
export const projectModelUrl = (id: string, version: string | null) =>
  version ? `/api/projects/${id}/model?v=${encodeURIComponent(version)}` : `/api/projects/${id}/model`;
export const projectThumbnailUrl = (id: string, version: string) =>
  `/api/projects/${id}/thumbnail?v=${encodeURIComponent(version)}`;

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => api.get<Project[]>('/projects'),
    refetchInterval: (query) => (query.state.data?.some(isBusy) ? 2500 : false),
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project(id ?? ''),
    queryFn: () => api.get<Project>(`/projects/${id}`),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data && isBusy(query.state.data) ? 2000 : false),
  });
}

export interface CreateProjectInput {
  name: string;
  description: string;
  file: File;
  onProgress?: (fraction: number) => void;
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, description, file, onProgress }: CreateProjectInput) => {
      const form = new FormData();
      form.append('name', name);
      form.append('description', description);
      form.append('file', file);
      return uploadForm<Project>('/projects', form, { onProgress });
    },
    onSuccess: () => refreshProjectList(queryClient),
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProjectUpdate) => api.patch<Project>(`/projects/${id}`, data),
    onSuccess: (project, sent) => {
      // Settings preview in the cache before they are saved. If the editor has moved on since
      // this request left, keep what they see now rather than snapping back to what was sent.
      queryClient.setQueryData<Project>(queryKeys.project(id), (current) =>
        current && sent.settings && !deepEqual(current.settings, sent.settings)
          ? { ...project, settings: current.settings }
          : project,
      );
      void refreshProjectList(queryClient);
    },
  });
}

export function useReprocessProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Project>(`/projects/${id}/reprocess`),
    onSuccess: () => refreshProjectList(queryClient),
  });
}

/** Flips a project between draft and ready to show. */
export function useSetProjectStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: ProjectStage }) =>
      api.patch<Project>(`/projects/${id}`, { stage }),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.project(project.id), project);
      void refreshProjectList(queryClient);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => refreshProjectList(queryClient),
  });
}

export function useSetProjectThumbnail(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blob: Blob) => {
      const form = new FormData();
      form.append('file', blob, 'cover.jpg');
      return uploadForm<Project>(`/projects/${id}/thumbnail`, form, { method: 'PUT' });
    },
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.project(id), project);
      void refreshProjectList(queryClient);
    },
  });
}
