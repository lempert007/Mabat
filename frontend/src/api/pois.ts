import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './queryKeys';
import type { Poi, PoiCreate, PoiUpdate } from '@/types/api';

export function usePois(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.pois(projectId ?? ''),
    queryFn: () => api.get<Poi[]>(`/projects/${projectId}/pois`),
    enabled: Boolean(projectId),
  });
}

function replacePoi(list: Poi[] | undefined, poi: Poi): Poi[] {
  if (!list) return [poi];
  const index = list.findIndex((item) => item.id === poi.id);
  if (index === -1) return [...list, poi];
  const next = list.slice();
  next[index] = poi;
  return next;
}

export function useCreatePoi(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PoiCreate) => api.post<Poi>(`/projects/${projectId}/pois`, data),
    onSuccess: (poi) => {
      queryClient.setQueryData<Poi[]>(queryKeys.pois(projectId), (list) => replacePoi(list, poi));
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useUpdatePoi(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PoiUpdate }) =>
      api.patch<Poi>(`/pois/${id}`, data),
    onSuccess: (poi) =>
      queryClient.setQueryData<Poi[]>(queryKeys.pois(projectId), (list) => replacePoi(list, poi)),
  });
}

export function useDeletePoi(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/pois/${id}`),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Poi[]>(queryKeys.pois(projectId), (list) =>
        list?.filter((poi) => poi.id !== id),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useReorderPois(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.put<Poi[]>(`/projects/${projectId}/pois/order`, { ids }),
    onSuccess: (pois) => queryClient.setQueryData(queryKeys.pois(projectId), pois),
  });
}
