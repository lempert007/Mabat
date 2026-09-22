export const queryKeys = {
  session: ['session'] as const,
  users: ['users'] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  categories: (projectId: string) => ['projects', projectId, 'categories'] as const,
  pois: (projectId: string) => ['projects', projectId, 'pois'] as const,
  attachments: (projectId: string) => ['projects', projectId, 'attachments'] as const,
};
