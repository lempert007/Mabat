import { Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DraggablePanel } from '@/components/ui/DraggablePanel';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Switch } from '@/components/ui/Switch';
import { TextArea } from '@/components/ui/TextArea';
import { PanelSection } from './PanelSection';
import { ModelOrientation } from './ModelOrientation';
import { CategoryManager } from './CategoryManager';
import { useSetProjectThumbnail, useUpdateProject } from '@/api/projects';
import { useProjectSettings } from '@/hooks/useProjectSettings';
import { useViewerStore } from '@/store/viewerStore';
import { errorMessage } from '@/lib/errorMessage';
import { toast } from '@/store/toastStore';
import type { Category, EnvironmentPreset, Project } from '@/types/api';
import { t } from '@/i18n/he';

interface SceneSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  project: Project;
  categories: Category[];
}

const ENVIRONMENTS: EnvironmentPreset[] = ['studio', 'night', 'dawn'];

export function SceneSettingsPanel({ open, onClose, project, categories }: SceneSettingsPanelProps) {
  const { settings, patch } = useProjectSettings(project);
  // Separate mutations, so saving the name does not spin the intro-camera button.
  const update = useUpdateProject(project.id);
  const updateDetails = useUpdateProject(project.id);
  const onError = (error: unknown) => toast.error(errorMessage(error));
  const setThumbnail = useSetProjectThumbnail(project.id);
  const cameraApi = useViewerStore((s) => s.cameraApi);

  const saveIntroCamera = () => {
    if (!cameraApi) return;
    update.mutate(
      { settings: { ...settings, introCamera: cameraApi.getPose() } },
      { onSuccess: () => toast.success(t.settings.introSaved), onError },
    );
  };

  const captureCover = async () => {
    const blob = await cameraApi?.capture();
    if (!blob) return;
    setThumbnail.mutate(blob, { onSuccess: () => toast.success(t.settings.coverSaved), onError });
  };

  return (
    <DraggablePanel open={open} onClose={onClose} title={t.settings.title} storageKey="scene-settings">
      <div className="flex flex-col gap-7">
        <PanelSection title={t.settings.orientation} hint={t.settings.orientationHint}>
          <ModelOrientation
            rotation={settings.modelRotation}
            onChange={(modelRotation) => patch({ modelRotation })}
          />
        </PanelSection>

        <PanelSection title={t.settings.lighting}>
          <Field label={t.settings.environment}>
            <Segmented<EnvironmentPreset>
              size="sm"
              value={settings.environment}
              options={ENVIRONMENTS.map((preset) => ({ value: preset, label: t.settings.environments[preset] }))}
              onChange={(environment) => patch({ environment })}
            />
          </Field>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-fg-2">{t.settings.grid}</span>
            <Switch label={t.settings.grid} checked={settings.showGrid} onChange={(showGrid) => patch({ showGrid })} />
          </div>
        </PanelSection>

        <PanelSection title={t.settings.currentView} hint={t.settings.currentViewHint}>
          <div className="flex flex-col gap-2">
            <Button size="sm" icon={<Camera size={14} />} onClick={saveIntroCamera} loading={update.isPending}>
              {t.settings.setIntro}
            </Button>
            <Button size="sm" icon={<ImageIcon size={14} />} loading={setThumbnail.isPending} onClick={captureCover}>
              {t.settings.setCover}
            </Button>
          </div>
        </PanelSection>

        <PanelSection title={t.settings.projectDetails}>
          <Field label={t.upload.name}>
            <Input
              defaultValue={project.name}
              onBlur={(event) => {
                const name = event.target.value.trim();
                // A project always has a name, so an emptied field goes back to the saved one.
                if (!name) event.target.value = project.name;
                else if (name !== project.name) updateDetails.mutate({ name }, { onError });
              }}
            />
          </Field>
          <Field label={t.upload.description}>
            <TextArea
              rows={2}
              defaultValue={project.description}
              onBlur={(event) => {
                if (event.target.value !== project.description) {
                  updateDetails.mutate({ description: event.target.value }, { onError });
                }
              }}
            />
          </Field>
        </PanelSection>

        <PanelSection title={t.categories.title}>
          <CategoryManager projectId={project.id} categories={categories} />
        </PanelSection>
      </div>
    </DraggablePanel>
  );
}
