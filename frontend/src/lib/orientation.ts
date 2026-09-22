import { Quaternion as ThreeQuaternion, Vector3 } from 'three';
import type { Quaternion } from '@/types/api';

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

export function isUpright(rotation: Quaternion | null): boolean {
  return !rotation || (rotation.x === 0 && rotation.y === 0 && rotation.z === 0 && Math.abs(rotation.w) === 1);
}
