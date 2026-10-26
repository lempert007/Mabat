import type { InterleavedBufferAttribute, Vector3 } from 'three';
import type { Line2 } from 'three-stdlib';

/**
 * Moves the points of a fat line in place.
 *
 * `setPositions` would build new GPU buffers on every call, and replaced buffers are never
 * freed, so a line redrawn each frame would leak for as long as the mission played. The point
 * count must stay the one the line was created with.
 */
export function setLinePoints(line: Line2, points: Vector3[]): void {
  const start = line.geometry.getAttribute('instanceStart') as InterleavedBufferAttribute;
  const data = start.data.array as Float32Array;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    data.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
  }
  start.data.needsUpdate = true;
}
