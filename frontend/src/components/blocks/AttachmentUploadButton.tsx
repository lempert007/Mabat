import { useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { useUploadAttachment } from '@/api/attachments';
import { errorMessage } from '@/lib/errorMessage';
import { toast } from '@/store/toastStore';
import type { Attachment } from '@/types/api';
import { t } from '@/i18n/he';

interface AttachmentUploadButtonProps {
  projectId: string;
  poiId: string;
  accept: string;
  icon: ReactNode;
  label: string;
  /** Called once per batch, with every file that made it, in the order they were picked. */
  onUploaded: (attachments: Attachment[]) => void;
}

export function AttachmentUploadButton({ projectId, poiId, accept, icon, label, onUploaded }: AttachmentUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAttachment(projectId);

  const onFiles = async (files: FileList | null) => {
    const picked = Array.from(files ?? []);
    if (inputRef.current) inputRef.current.value = '';
    if (picked.length === 0) return;
    const results = await Promise.allSettled(picked.map((file) => upload.mutateAsync({ file, poiId })));
    const uploaded: Attachment[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') uploaded.push(result.value);
      else toast.error(`${t.blocks.uploadFailed}: ${errorMessage(result.reason)}`);
    }
    if (uploaded.length > 0) onUploaded(uploaded);
  };

  return (
    <>
      <input ref={inputRef} type="file" accept={accept} multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      <Button size="sm" variant="ghost" icon={icon} loading={upload.isPending} className="self-start" onClick={() => inputRef.current?.click()}>
        {upload.isPending ? t.blocks.uploading : label}
      </Button>
    </>
  );
}
