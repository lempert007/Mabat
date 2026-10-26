import type { QueryClient } from '@tanstack/react-query';

export const queryKeys = {
  session: ['session'] as const,
  users: ['users'] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  categories: (projectId: string) => ['projects', projectId, 'categories'] as const,
  pois: (projectId: string) => ['projects', projectId, 'pois'] as const,
  attachments: (projectId: string) => ['projects', projectId, 'attachments'] as const,
};

/**
 * Refreshes the gallery list alone. Every project key starts with `projects`, so without
 * `exact` this would also refetch each open project and all of its points and categories.
 */
export function refreshProjectList(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.projects, exact: true });
}
