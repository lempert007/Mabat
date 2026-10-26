import { Suspense } from 'react';
import { CarrierModel } from './CarrierModel';
import { DroidModel } from './DroidModel';
import { ParcelModel } from './ParcelModel';
import { UploadedVehicle } from './UploadedVehicle';
import { FallbackBoundary } from './FallbackBoundary';
import { vehicleModelUrl } from '@/api/vehicles';
import type { Mission, Project, VehicleSlot } from '@/types/api';

interface VehicleModelProps {
  slot: VehicleSlot;
  project: Project;
  mission: Mission;
  /** Landing legs for the built-in carrier, as a fraction of its wingspan. */
  legs: number;
}

/**
 * The model drawn for one vehicle at its real size: the editor's upload when there is one,
 * otherwise the built-in model. The built-in one also stands in while an upload loads, and for
 * good if it never does.
 */
export function VehicleModel({ slot, project, mission, legs }: VehicleModelProps) {
  const { color, rotation } = mission[slot];
  const version = project.vehicles[slot];
  const builtIn =
    slot === 'carrier' ? <CarrierModel color={color} legs={legs} /> : slot === 'droid' ? <DroidModel color={color} /> : <ParcelModel color={color} />;

  if (!version) return builtIn;
  return (
    <FallbackBoundary fallback={builtIn} resetKey={version}>
      <Suspense fallback={builtIn}>
        <UploadedVehicle slot={slot} url={vehicleModelUrl(project.id, slot, version)} rotation={rotation} />
      </Suspense>
    </FallbackBoundary>
  );
}
