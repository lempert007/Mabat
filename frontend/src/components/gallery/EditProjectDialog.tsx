import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Segmented } from '@/components/ui/Segmented';
import { useUpdateProject } from '@/api/projects';
import { errorMessage } from '@/lib/errorMessage';
import { toast } from '@/store/toastStore';
import type { Project, ProjectStage } from '@/types/api';
import { t } from '@/i18n/he';

interface EditProjectDialogProps {
  project: Project | null;
  onClose: () => void;
}

export function EditProjectDialog({ project, onClose }: EditProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState<ProjectStage>('draft');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const update = useUpdateProject(project?.id ?? '');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description);
      setStage(project.stage);
    }
  }, [project]);

  const dirty =
    project !== null &&
    (name.trim() !== project.name || description.trim() !== project.description || stage !== project.stage);
  const close = () => (dirty ? setConfirmDiscard(true) : onClose());
  const save = () =>
    update.mutate(
      { name: name.trim(), description: description.trim(), stage },
      { onSuccess: onClose, onError: (error) => toast.error(errorMessage(error)) },
    );

  return (
    <Dialog
      open={Boolean(project)}
      onClose={close}
      title={t.gallery.rename}
      width="sm"
      footer={
        <>
          {dirty && <span className="me-auto self-center text-[12px] text-accent-strong">{t.common.unsaved}</span>}
          <Button variant="ghost" onClick={close}>
            {t.common.cancel}
          </Button>
          <Button variant="primary" loading={update.isPending} disabled={!dirty || !name.trim()} onClick={save}>
            {t.common.save}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={t.upload.name} htmlFor="edit-name">
          <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t.upload.description} htmlFor="edit-description">
          <TextArea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label={t.gallery.stage}>
          <Segmented<ProjectStage>
            value={stage}
            options={[
              { value: 'draft', label: t.gallery.stageDraft },
              { value: 'ready', label: t.gallery.stageReady },
            ]}
            onChange={setStage}
          />
        </Field>
      </div>
      <ConfirmDialog
        open={confirmDiscard}
        title={t.common.discardTitle}
        body={t.common.discardBody}
        confirmLabel={t.common.discardConfirm}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
      />
    </Dialog>
  );
}
