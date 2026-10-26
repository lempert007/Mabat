import { CatmullRomCurve3, MathUtils, Vector3 } from 'three';
import type { Site } from './types';

export const headingOf = (direction: Vector3) => Math.atan2(direction.x, direction.z);

/** The signed turn from one heading to another, the shorter way round. */
export const turnBetween = (from: number, to: number) =>
  MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;

export const lerpAngle = (from: number, to: number, amount: number) => from + turnBetween(from, to) * amount;

export interface Route {
  /** End to end, world units. */
  length: number;
  position: (distance: number) => Vector3;
  heading: (distance: number) => number;
}

/** A smooth curve through points at cruise altitude, looked up by distance flown. */
export function makeRoute(points: Vector3[]): Route {
  const unique = points.filter((point, i) => i === 0 || point.distanceTo(points[i - 1]) > 1e-3);
  const curve = unique.length > 1 ? new CatmullRomCurve3(unique, false, 'centripetal') : null;
  const length = curve ? curve.getLength() : 0;
  const along = (distance: number) => MathUtils.clamp(distance / length, 0, 1);
  return {
    length,
    position: (distance) => (curve && length > 0 ? curve.getPointAt(along(distance)) : unique[0].clone()),
    heading: (distance) => (curve && length > 0 ? headingOf(curve.getTangentAt(along(distance))) : 0),
  };
}

/**
 * Where the carrier enters when it has no hub on the model: beyond the first point it heads for,
 * on the far side of the site, so the flight in crosses the scene.
 */
export function entryPoint(route: Vector3[], site: Site, cruiseY: number): Vector3 {
  const [first, next] = route;
  const away = next ? first.clone().sub(next) : site.center.clone().sub(first);
  away.y = 0;
  if (away.lengthSq() < 1e-6) away.set(-0.8, 0, -0.6);
  away.normalize();
  const origin = next ? first : site.center;
  const reach = next ? site.radius * 0.6 : site.radius * 1.05;
  return new Vector3(origin.x, cruiseY, origin.z).addScaledVector(away, reach);
}
