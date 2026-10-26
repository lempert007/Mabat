import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, uploadForm } from './client';
import { queryKeys } from './queryKeys';
import type { Project, VehicleSlot } from '@/types/api';

/** The version keeps a replaced drone model from being served from cache. */
export const vehicleModelUrl = (projectId: string, slot: VehicleSlot, version: string) =>
  `/api/projects/${projectId}/vehicles/${slot}?v=${encodeURIComponent(version)}`;

export function useUploadVehicle(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slot, file, onProgress }: { slot: VehicleSlot; file: File; onProgress?: (fraction: number) => void }) => {
      const form = new FormData();
      form.append('file', file);
      return uploadForm<Project>(`/projects/${projectId}/vehicles/${slot}`, form, { method: 'PUT', onProgress });
    },
    // Only the fleet changed on the server. Keeping the cached settings keeps any change the
    // editor made while the upload was on its way.
    onSuccess: (project) =>
      queryClient.setQueryData<Project>(queryKeys.project(projectId), (current) =>
        current ? { ...current, vehicles: project.vehicles } : project,
      ),
  });
}

export function useRemoveVehicle(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slot: VehicleSlot) => api.delete<Project>(`/projects/${projectId}/vehicles/${slot}`),
    onSuccess: (project) =>
      queryClient.setQueryData<Project>(queryKeys.project(projectId), (current) =>
        current ? { ...current, vehicles: project.vehicles } : project,
      ),
  });
}
