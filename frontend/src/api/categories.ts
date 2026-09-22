import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './queryKeys';
import type { Category } from '@/types/api';

export function useCategories(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.categories(projectId ?? ''),
    queryFn: () => api.get<Category[]>(`/projects/${projectId}/categories`),
    enabled: Boolean(projectId),
  });
}

export function useCreateCategory(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      api.post<Category>(`/projects/${projectId}/categories`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories(projectId) }),
  });
}

export function useUpdateCategory(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; color?: string } }) =>
      api.patch<Category>(`/categories/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories(projectId) }),
  });
}

export function useDeleteCategory(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pois(projectId) });
    },
  });
}
