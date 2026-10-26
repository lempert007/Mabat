import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { buildPlan } from './plan';
import { newActor, newMission } from './defaults';
import { retimeKey, setHold, withNextKey } from './keys';
import type { Actor } from '@/types/api';

const SITE = { center: new Vector3(), radius: 200 };
const DROP = { x: 0, y: 0, z: 0 };

const planWith = (actors: Actor[]) => buildPlan({ ...newMission(), drop: DROP, actors }, SITE)!;

describe('withNextKey', () => {
  it('times a new keyframe at the pace the actor moves, from where it was let go', () => {
    const rover = { ...newActor('rover', 'hook'), id: 'rover' };
    const first = withNextKey(planWith([rover]), rover, 0, { x: 14, y: 0, z: 0 });
    // 14 m at 1.4 m/s.
    expect(first.keys[0]).toEqual({ at: 10, place: { x: 14, y: 0, z: 0 }, lift: 0, hold: 0 });

    const drone = { ...newActor('drone', 'hook'), id: 'drone' };
    expect(withNextKey(planWith([drone]), drone, 0, { x: 0, y: 0, z: 0 }).keys[0].lift).toBe(6);
  });

  it('stands something placed on the model at its first spot from the start', () => {
    const standing = { ...newActor('rover', null), id: 'standing' };
    const placed = withNextKey(planWith([newActor('parcel', 'hook'), standing]), standing, 1, { x: 30, y: 0, z: 0 });
    expect(placed.keys[0].at).toBe(0);
  });

  it('gets a rider off once its ride has stopped', () => {
    const rover = { ...newActor('rover', 'hook'), id: 'rover', keys: [{ at: 10, place: { x: 14, y: 0, z: 0 }, lift: 0, hold: 2 }] };
    const box = { ...newActor('parcel', 'rover'), id: 'box', mount: 'above' as const };
    const placed = withNextKey(planWith([rover, box]), box, 1, { x: 15, y: 0, z: 0 });
    expect(placed.leaves).toBe(12);
    expect(placed.keys[0].at).toBeGreaterThan(12);
  });
});

describe('editing keyframes', () => {
  const rover: Actor = {
    ...newActor('rover', 'hook'),
    keys: [
      { at: 4, place: DROP, lift: 0, hold: 2 },
      { at: 10, place: DROP, lift: 0, hold: 0 },
      { at: 15, place: DROP, lift: 0, hold: 0 },
    ],
  };

  it('moves a keyframe no further than its neighbours allow', () => {
    expect(retimeKey(rover, 1, 1).keys[1].at).toBeCloseTo(6.1);
    expect(retimeKey(rover, 1, 99).keys[1].at).toBeCloseTo(14.9);
    expect(retimeKey(rover, 1, 8).keys[1].at).toBe(8);
  });

  it('pushes everything after a longer wait back by the same amount', () => {
    const longer = setHold(rover, 0, 5);
    expect(longer.keys.map((key) => key.at)).toEqual([4, 13, 18]);
    expect(setHold(longer, 0, 0).keys.map((key) => key.at)).toEqual([4, 8, 13]);
  });
});
