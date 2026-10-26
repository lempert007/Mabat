import { Quaternion, Vector3 } from 'three';
import type { Site } from '@/lib/mission/types';
import type { Project } from '@/types/api';

/** Half of the model's bounding diagonal. Used to scale camera limits, fog and marker offsets. */
export function modelRadius(project: Project): number {
  const extents = project.modelStats.extents;
  if (!extents) return 50;
  const [x, y, z] = extents;
  const diagonal = Math.sqrt(x * x + y * y + z * z);
  return diagonal > 0 ? diagonal / 2 : 50;
}

/** The model's centre in the world, after the turn that stands it upright, and its radius. */
export function modelSite(project: Project): Site {
  const { boundsMin, boundsMax } = project.modelStats;
  const center = boundsMin && boundsMax
    ? new Vector3(...boundsMin).add(new Vector3(...boundsMax)).multiplyScalar(0.5)
    : new Vector3();
  const rotation = project.settings.modelRotation;
  if (rotation) center.applyQuaternion(new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));
  return { center, radius: modelRadius(project) };
}

/** The model's width across the ground, in its own units, whichever way it has been turned. */
export function modelWidth(project: Project): number {
  const extents = project.modelStats.extents;
  if (!extents) return 0;
  const rotation = project.settings.modelRotation;
  const size = new Vector3(...extents);
  if (rotation) size.applyQuaternion(new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));
  return Math.max(Math.abs(size.x), Math.abs(size.z));
}
