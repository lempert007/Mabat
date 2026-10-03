import { Quaternion as ThreeQuaternion, Vector3 } from 'three';
import type { Poi, Quaternion, Vec3 } from '@/types/api';

export const IDENTITY: Quaternion = { x: 0, y: 0, z: 0, w: 1 };

/**
 * The three ways a model can be turned, named for what the viewer sees rather than for an axis.
 * Every turn is a quarter of a circle, which is the only thing a mis-exported model ever needs
 * and guarantees the result stays square to the world.
 */
const AXES = {
  tip: new Vector3(1, 0, 0),
  turn: new Vector3(0, 1, 0),
  lean: new Vector3(0, 0, 1),
} as const;

export type TurnAxis = keyof typeof AXES;

const toThree = (q: Quaternion | null) =>
  q ? new ThreeQuaternion(q.x, q.y, q.z, q.w) : new ThreeQuaternion();

/** Adds a quarter turn about a world axis, so each press turns what the viewer is looking at. */
export function quarterTurn(
  current: Quaternion | null,
  axis: TurnAxis,
  direction: 1 | -1,
): Quaternion {
  const step = new ThreeQuaternion().setFromAxisAngle(AXES[axis], (direction * Math.PI) / 2);
  const next = step.multiply(toThree(current)).normalize();
  return { x: next.x, y: next.y, z: next.z, w: next.w };
}

/** Quarter turns composed in floating point land a hair away from exact values. */
const TOLERANCE = 1e-9;

export function isUpright(rotation: Quaternion | null): boolean {
  if (!rotation) return true;
  const { x, y, z, w } = rotation;
  return Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) < TOLERANCE && Math.abs(Math.abs(w) - 1) < TOLERANCE;
}

/**
 * Points are stored in world space, so turning the model has to turn them by the same amount.
 * This is what the server does when the rotation is saved (`services/orientation.py`); doing it
 * here too keeps the markers on the model while that save is still on its way.
 */
export function turnPoints(pois: Poi[], from: Quaternion | null, to: Quaternion | null): Poi[] {
  const delta = toThree(to).multiply(toThree(from).invert());
  const turn = (v: Vec3): Vec3 => {
    const turned = new Vector3(v.x, v.y, v.z).applyQuaternion(delta);
    return { x: turned.x, y: turned.y, z: turned.z };
  };
  return pois.map((poi) => ({
    ...poi,
    position: turn(poi.position),
    normal: turn(poi.normal),
    camera: poi.camera && { position: turn(poi.camera.position), target: turn(poi.camera.target) },
  }));
}
