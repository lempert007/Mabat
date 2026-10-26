import { describe, expect, it } from 'vitest';
import { areaOf, contains, extentOf, NOISE_COLORS, zoneColors } from './noise';
import type { Vec3 } from '@/types/api';

const square = (size: number, y = 0): Vec3[] => [
  { x: 0, y, z: 0 },
  { x: size, y, z: 0 },
  { x: size, y, z: size },
  { x: 0, y, z: size },
];

describe('noise contours', () => {
  it('measure the ground they enclose, whichever way they were traced', () => {
    expect(areaOf(square(10))).toBe(100);
    expect(areaOf(square(10).reverse())).toBe(100);
  });

  it('tell a spot inside from one outside', () => {
    const shape: Vec3[] = [...square(10).slice(0, 3), { x: 5, y: 0, z: 4 }, { x: 0, y: 0, z: 10 }];
    expect(contains(shape, 2, 2)).toBe(true);
    // The notch the fourth point cuts into the square is outside.
    expect(contains(shape, 5, 8)).toBe(false);
    expect(contains(shape, 12, 5)).toBe(false);
  });

  it('know their middle and how far they reach from it', () => {
    const { center, reach } = extentOf(square(10, 3));
    expect(center).toEqual({ x: 5, y: 3, z: 5 });
    expect(reach).toBeCloseTo(Math.hypot(5, 5));
  });

  it('colour the widest contour as the quietest', () => {
    const zones = [{ label: 'loud', points: square(4) }, { label: 'faint', points: square(20) }];
    expect(zoneColors(zones)).toEqual([NOISE_COLORS[1], NOISE_COLORS[0]]);
  });
});
