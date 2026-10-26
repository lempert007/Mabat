import { useRef, useState } from 'react';
import { Box, Undo2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useUploadMissionModel } from '@/api/missionModels';
import { errorMessage } from '@/lib/errorMessage';
import { MODEL_ACCEPT, needsExport } from '@/lib/uploadFormats';
import { toast } from '@/store/toastStore';
import { t } from '@/i18n/he';

interface ModelUploadProps {
  projectId: string;
  /** The uploaded model in use, or null for the built-in one. */
  model: string | null;
  onChange: (model: string | null) => void;
}

const copy = t.mission.panel;

/**
 * Uploading a model of one's own, replacing it, or going back to the built-in one. A file
 * SketchUp has to export first is turned away before it is sent, with how to export it.
 */
export function ModelUpload({ projectId, model, onChange }: ModelUploadProps) {
  const upload = useUploadMissionModel(projectId);
  const picker = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const onPicked = (file: File | undefined) => {
    if (!file) return;
    if (needsExport(file)) {
      toast.error(t.upload.sketchup.title);
      return;
    }
    setProgress(0);
    upload.mutate(
      { file, onProgress: setProgress },
      {
        onSuccess: ({ id }) => {
          onChange(id);
          toast.success(copy.uploadDone);
        },
        onError: (error) => toast.error(errorMessage(error)),
        onSettled: () => setProgress(null),
      },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {progress !== null && <ProgressBar value={progress} />}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={model ? <Box size={14} /> : <Upload size={14} />} loading={upload.isPending} onClick={() => picker.current?.click()}>
          {model ? copy.replace : copy.upload}
        </Button>
        {model && (
          <Button size="sm" variant="ghost" icon={<Undo2 size={14} />} onClick={() => onChange(null)}>
            {copy.useBuiltIn}
          </Button>
        )}
      </div>
      <input
        ref={picker}
        type="file"
        className="hidden"
        accept={MODEL_ACCEPT}
        onChange={(event) => {
          onPicked(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
