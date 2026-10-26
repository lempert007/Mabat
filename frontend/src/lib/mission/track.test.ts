import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { makeTrack, monotoneSlopes, type TrackNode, type TrackPose } from './track';

const node = (x: number, z: number, arrive: number, hold = 0, y = 0): TrackNode => ({
  position: new Vector3(x, y, z),
  arrive,
  leave: arrive + hold,
  aloft: y > 0,
});

const pose = (): TrackPose => ({ position: new Vector3(), heading: 0, travelled: 0, speed: 0, power: 0 });

describe('makeTrack', () => {
  const track = makeTrack([node(0, 0, 0), node(10, 0, 5, 2), node(10, 10, 10), node(0, 10, 14)], 0, true, 1);
  const at = (time: number) => {
    const out = pose();
    track.at(time, out);
    return out;
  };

  it('is at each keyframe on time, and stands still while it waits', () => {
    expect(at(5).position.distanceTo(new Vector3(10, 0, 0))).toBeLessThan(1e-6);
    expect(at(6).position.distanceTo(new Vector3(10, 0, 0))).toBeLessThan(1e-6);
    expect(at(6).speed).toBe(0);
    expect(at(10).position.distanceTo(new Vector3(10, 0, 10))).toBeLessThan(1e-6);
    expect(at(99).position.distanceTo(new Vector3(0, 10, 14).setZ(10).setY(0))).toBeLessThan(1e-6);
  });

  it('never backs up, and starts and ends at rest', () => {
    let last = -1;
    for (let time = -1; time <= 15; time += 0.01) {
      const { travelled } = at(time);
      expect(travelled).toBeGreaterThanOrEqual(last - 1e-9);
      last = travelled;
    }
    expect(at(0).speed).toBe(0);
    expect(at(14).speed).toBe(0);
    expect(at(2.5).speed).toBeGreaterThan(0);
  });

  it('turns to face the way it goes, and keeps facing it while it waits', () => {
    expect(at(0).heading).toBeCloseTo(0);
    // The curve rounds each corner rather than pivoting on it, so the heading leads a little.
    expect(Math.abs(at(2).heading - Math.PI / 2)).toBeLessThan(0.25);
    expect(Math.abs(at(13.5).heading + Math.PI / 2)).toBeLessThan(0.25);
    expect(at(6.5).heading).toBe(at(5).heading);
  });

  it('lists the stretches it moves in', () => {
    expect(track.moves).toEqual([
      [0, 5],
      [7, 10],
      [10, 14],
    ]);
  });

  it('keeps its heading when it does not turn, and when it climbs straight up', () => {
    const fixed = makeTrack([node(0, 0, 0), node(10, 0, 5)], 1, false, 1);
    const out = pose();
    fixed.at(3, out);
    expect(out.heading).toBe(1);
    const climb = makeTrack([node(0, 0, 0), node(0, 0, 4, 0, 6)], 0.5, true, 1);
    climb.at(2, out);
    expect(out.heading).toBeCloseTo(0.5);
    expect(out.power).toBe(1);
  });

  it('copes with a single place and with keyframes at the same moment', () => {
    const still = makeTrack([node(3, 3, 2, 1)], 0, true, 1);
    const out = pose();
    still.at(5, out);
    expect(out.position.x).toBe(3);
    const crowded = makeTrack([node(0, 0, 1), node(5, 0, 1), node(5, 5, 1)], 0, true, 1);
    crowded.at(1.2, out);
    expect(Number.isFinite(out.position.x + out.position.z + out.heading)).toBe(true);
  });
});

describe('monotoneSlopes', () => {
  it('is flat at both ends and wherever the value stops changing', () => {
    expect(monotoneSlopes([0, 1, 2, 3], [0, 1, 1, 2])).toEqual([0, 0, 0, 0]);
    const slopes = monotoneSlopes([0, 1, 2, 3], [0, 1, 2, 3]);
    expect(slopes[0]).toBe(0);
    expect(slopes[1]).toBeCloseTo(1);
    expect(slopes[3]).toBe(0);
  });
});
