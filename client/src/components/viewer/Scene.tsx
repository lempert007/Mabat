import { Suspense } from 'react';
import { ModelMesh } from './ModelMesh';
import { CameraRig } from './CameraRig';
import { MarkerProjector } from './MarkerProjector';
import { ModelRightClick } from './ModelRightClick';
import { SceneEnvironment } from './SceneEnvironment';
import { SceneAtmosphere } from './SceneAtmosphere';
import { SceneEffects } from './SceneEffects';
import { Ground } from './Ground';
import { MissionScene } from '@/components/mission/MissionScene';
import { projectModelUrl } from '@/api/projects';
import { modelRadius } from '@/lib/model';
import { useMissionStore } from '@/store/missionStore';
import type { MissionPlan } from '@/lib/mission/types';
import type { Poi, Project, Vec3 } from '@/types/api';

interface SceneProps {
  project: Project;
  pois: Poi[];
  plan: MissionPlan | null;
  placing: boolean;
  onPlace: (position: Vec3, normal: Vec3) => void;
  onInspect: (position: Vec3) => void;
  onRightClick: ((position: Vec3, normal: Vec3, screen: { x: number; y: number }) => void) | null;
}

export function Scene({ project, pois, plan, placing, onPlace, onInspect, onRightClick }: SceneProps) {
  const radius = modelRadius(project);
  const { settings } = project;
  const showMission = useMissionStore((s) => s.view === 'mission');
  return (
    <>
      <SceneAtmosphere preset={settings.environment} radius={radius} />
      <SceneEnvironment preset={settings.environment} />
      <Suspense fallback={null}>
        <ModelMesh url={projectModelUrl(project.id, project.modelVersion)}
          rotation={settings.modelRotation} placing={placing} onPlace={onPlace} onInspect={onInspect} />
      </Suspense>
      <Ground radius={radius} visible={settings.showGrid} />
      <CameraRig radius={radius} introCamera={settings.introCamera} />
      <MarkerProjector pois={pois} radius={radius} />
      {onRightClick && <ModelRightClick onPick={onRightClick} />}
      {showMission && plan && settings.mission && (
        <MissionScene project={project} mission={settings.mission} plan={plan} />
      )}
      <SceneEffects />
    </>
  );
}
