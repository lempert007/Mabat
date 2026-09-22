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
  onUploaded: (attachment: Attachment) => void;
}

export function AttachmentUploadButton({ projectId, poiId, accept, icon, label, onUploaded }: AttachmentUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAttachment(projectId);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        onUploaded(await upload.mutateAsync({ file, poiId }));
      } catch (error) {
        toast.error(`${t.blocks.uploadFailed}: ${errorMessage(error)}`);
      }
    }
    if (inputRef.current) inputRef.current.value = '';
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
