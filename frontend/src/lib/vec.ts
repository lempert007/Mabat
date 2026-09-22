import { Vector3 } from 'three';
import type { CameraPose, Vec3 } from '@/types/api';

export const toVector3 = (v: Vec3) => new Vector3(v.x, v.y, v.z);
export const fromVector3 = (v: Vector3): Vec3 => ({ x: v.x, y: v.y, z: v.z });

/** Camera pose that looks at a point from along its surface normal. Used when a point has no saved view. */
export function poseFromNormal(position: Vec3, normal: Vec3, distance: number): CameraPose {
  const target = toVector3(position);
  const dir = toVector3(normal);
  if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
  dir.normalize();
  // Lift the camera a little so the view is never perfectly edge-on.
  dir.add(new Vector3(0, 0.35, 0)).normalize();
  const cameraPosition = target.clone().addScaledVector(dir, distance);
  return { position: fromVector3(cameraPosition), target: fromVector3(target) };
}

/**
 * A view of `point` from the direction the camera is already looking, pulled in to `distance`.
 * Keeps the current orientation so a zoom reads as moving closer, not as jumping somewhere new.
 */
export function closeUpPose(cameraPosition: Vec3, point: Vec3, distance: number): CameraPose {
  const target = toVector3(point);
  const direction = toVector3(cameraPosition).sub(target);
  if (direction.lengthSq() < 1e-6) direction.set(0, 0.35, 1);
  direction.normalize();
  return {
    position: fromVector3(target.clone().addScaledVector(direction, distance)),
    target: fromVector3(target),
  };
}
