import { fill } from '@/lib/interpolate';
import type { NoiseZone, Vec3 } from '@/types/api';
import { t } from '@/i18n/he';

/** Quietest contour first. The widest contour is where the flight is only just heard. */
export const NOISE_COLORS = ['#ffd166', '#ffa64d', '#ff7a45', '#ff4d5e', '#ff2d8a'];

/** What the study calls the contour, or its number when the editor has not named it. */
export const zoneName = (zone: NoiseZone, index: number) => zone.label || fill(t.mission.noise.zone, { index: index + 1 });

/** A contour needs three points before it encloses anything. */
export const isClosed = (zone: NoiseZone) => zone.points.length >= 3;

/** The ground area a contour encloses, in square world units. */
export function areaOf(points: Vec3[]): number {
  let twice = 0;
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length];
    twice += a.x * b.z - b.x * a.z;
  });
  return Math.abs(twice) / 2;
}

/** Whether a ground position is inside a contour, by the even-odd rule over x and z. */
export function contains(points: Vec3[], x: number, z: number): boolean {
  let inside = false;
  points.forEach((a, i) => {
    const b = points[(i + points.length - 1) % points.length];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  });
  return inside;
}

/** The middle of a contour, and how far its edge reaches from there across the ground. */
export function extentOf(points: Vec3[]): { center: Vec3; reach: number } {
  const sum = points.reduce((total, p) => ({ x: total.x + p.x, y: total.y + p.y, z: total.z + p.z }), { x: 0, y: 0, z: 0 });
  const center = { x: sum.x / points.length, y: sum.y / points.length, z: sum.z / points.length };
  const reach = Math.max(...points.map((p) => Math.hypot(p.x - center.x, p.z - center.z)));
  return { center, reach };
}

/** A colour for each zone, from the widest and quietest to the smallest and loudest. */
export function zoneColors(zones: NoiseZone[]): string[] {
  const colors: string[] = [];
  zones
    .map((zone, index) => ({ index, area: areaOf(zone.points) }))
    .sort((a, b) => b.area - a.area)
    .forEach(({ index }, rank) => (colors[index] = NOISE_COLORS[Math.min(rank, NOISE_COLORS.length - 1)]));
  return colors;
}
