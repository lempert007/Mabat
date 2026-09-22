import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Segmented } from '@/components/ui/Segmented';
import { useUpdateProject } from '@/api/projects';
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
  const update = useUpdateProject(project?.id ?? '');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description);
      setStage(project.stage);
    }
  }, [project]);

  return (
    <Dialog
      open={Boolean(project)}
      onClose={onClose}
      title={t.gallery.rename}
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button
            variant="primary"
            loading={update.isPending}
            disabled={!name.trim()}
            onClick={() => update.mutate({ name, description, stage }, { onSuccess: onClose })}
          >
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
    </Dialog>
  );
}
