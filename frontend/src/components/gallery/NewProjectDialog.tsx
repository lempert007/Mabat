import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { UploadDropzone } from './UploadDropzone';
import { SketchUpNotice } from './SketchUpNotice';
import { useCreateProject } from '@/api/projects';
import { ApiError } from '@/api/client';
import { errorMessage } from '@/lib/errorMessage';
import { needsExport } from '@/lib/uploadFormats';
import { toast } from '@/store/toastStore';
import { t } from '@/i18n/he';

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewProjectDialog({ open, onClose }: NewProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const create = useCreateProject();
  // A file we cannot read never leaves the browser; the notice below says what to do instead.
  const blocked = needsExport(file);

  const reset = () => {
    setName('');
    setDescription('');
    setFile(null);
    setProgress(0);
    create.reset();
  };

  const close = () => {
    if (create.isPending) return;
    reset();
    onClose();
  };

  const submit = () => {
    if (!file || blocked) return;
    create.mutate(
      { name: name || file.name.replace(/\.[^.]+$/, ''), description, file, onProgress: setProgress },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
        onError: (error) =>
          toast.error(
            error instanceof ApiError && error.status === 413
              ? t.upload.tooLarge
              : errorMessage(error),
          ),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t.upload.title}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={create.isPending}>
            {t.common.cancel}
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            loading={create.isPending}
            disabled={!file || blocked}
          >
            {t.upload.create}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <UploadDropzone file={file} onFile={setFile} disabled={create.isPending} />
        {blocked && <SketchUpNotice onPickAnother={() => setFile(null)} />}
        <Field label={t.upload.name} htmlFor="project-name">
          <Input
            id="project-name"
            placeholder={file ? file.name.replace(/\.[^.]+$/, '') : t.upload.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={create.isPending}
          />
        </Field>
        <Field label={t.upload.description} htmlFor="project-description">
          <TextArea
            id="project-description"
            placeholder={t.upload.descriptionPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={create.isPending}
          />
        </Field>
        {create.isPending && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[12px] text-fg-3">
              <span>{t.upload.uploading}</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <ProgressBar value={progress} indeterminate={progress >= 1} />
          </div>
        )}
      </div>
    </Dialog>
  );
}
