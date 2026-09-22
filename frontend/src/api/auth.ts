import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './client';
import { queryKeys } from './queryKeys';
import type { SessionInfo, User } from '@/types/api';

export function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: async (): Promise<SessionInfo | null> => {
      try {
        return await api.get<SessionInfo>('/auth/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: { username: string; password: string }) =>
      api.post<SessionInfo>('/auth/login', credentials),
    onSuccess: (session) => queryClient.setQueryData(queryKeys.session, session),
  });
}

export function useJoinAsGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<SessionInfo>('/auth/guest'),
    onSuccess: (session) => queryClient.setQueryData(queryKeys.session, session),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.session, null);
      queryClient.removeQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useUsers(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.users, queryFn: () => api.get<User[]>('/users'), enabled });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { username: string; displayName: string; password: string }) =>
      api.post<User>('/users', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
  });
}
