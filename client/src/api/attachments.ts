import { useMutation } from '@tanstack/react-query';
import { uploadForm } from './client';
import type { Attachment } from '@/types/api';

export const attachmentFileUrl = (id: string) => `/api/attachments/${id}/file`;
export const attachmentThumbUrl = (id: string) => `/api/attachments/${id}/thumb`;

export function useUploadAttachment(projectId: string) {
  return useMutation({
    mutationFn: ({ file, poiId }: { file: File; poiId?: string }) => {
      const form = new FormData();
      form.append('file', file);
      if (poiId) form.append('poi_id', poiId);
      return uploadForm<Attachment>(`/projects/${projectId}/attachments`, form);
    },
  });
}
