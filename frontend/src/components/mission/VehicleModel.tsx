import { Suspense, type ReactNode } from 'react';
import { UploadedModel } from './UploadedModel';
import { FallbackBoundary } from './FallbackBoundary';
import { missionModelUrl } from '@/api/missionModels';
import type { Quaternion } from '@/types/api';

interface VehicleModelProps {
  projectId: string;
  /** The editor's upload, or null for the built-in model. */
  model: string | null;
  rotation: Quaternion | null;
  measures: string;
  builtIn: ReactNode;
}

/**
 * The model drawn for the carrier or an actor: the editor's upload when there is one, otherwise
 * the built-in model. The built-in one also stands in while an upload loads, and for good if it
 * never does.
 */
export function VehicleModel({ projectId, model, rotation, measures, builtIn }: VehicleModelProps) {
  if (!model) return builtIn;
  return (
    <FallbackBoundary fallback={builtIn} resetKey={model}>
      <Suspense fallback={builtIn}>
        <UploadedModel url={missionModelUrl(projectId, model)} rotation={rotation} measures={measures} />
      </Suspense>
    </FallbackBoundary>
  );
}
