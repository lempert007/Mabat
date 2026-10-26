import { describe, expect, it } from 'vitest';
import { MathUtils, Quaternion, Vector3 } from 'three';
import { makeTrack, monotoneSlopes, UP, yawOf, type TrackNode, type TrackPose } from './track';

const node = (x: number, z: number, arrive: number, hold = 0, more: Partial<TrackNode> = {}): TrackNode => ({
  position: new Vector3(x, more.position?.y ?? 0, z),
  arrive,
  leave: arrive + hold,
  aloft: false,
  up: UP.clone(),
  yaw: null,
  pitch: 0,
  roll: 0,
  ...more,
});

const pose = (): TrackPose => ({ position: new Vector3(), quaternion: new Quaternion(), travelled: 0, speed: 0, power: 0 });
const heading = (out: TrackPose) => yawOf(new Vector3(0, 0, 1).applyQuaternion(out.quaternion), UP) ?? NaN;
const upOf = (out: TrackPose) => UP.clone().applyQuaternion(out.quaternion);

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
    expect(at(99).position.distanceTo(new Vector3(0, 0, 10))).toBeLessThan(1e-6);
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
    expect(heading(at(0))).toBeCloseTo(0);
    // The curve rounds each corner rather than pivoting on it, so the heading leads a little.
    expect(Math.abs(heading(at(2)) - Math.PI / 2)).toBeLessThan(0.25);
    expect(Math.abs(heading(at(13.5)) + Math.PI / 2)).toBeLessThan(0.25);
    expect(heading(at(6.5))).toBeCloseTo(heading(at(5)), 6);
  });

  it('lists the stretches it moves in', () => {
    expect(track.moves).toEqual([
      [0, 5],
      [7, 10],
      [10, 14],
    ]);
  });

  it('keeps its heading when it does not turn, and when it climbs straight up', () => {
    const out = pose();
    makeTrack([node(0, 0, 0), node(10, 0, 5)], 1, false, 1).at(3, out);
    expect(heading(out)).toBeCloseTo(1);
    makeTrack([node(0, 0, 0), node(0, 0, 4, 0, { position: new Vector3(0, 6, 0), aloft: true })], 0.5, true, 1).at(2, out);
    expect(heading(out)).toBeCloseTo(0.5);
    expect(out.power).toBe(1);
  });

  it('copes with a single place and with keyframes at the same moment', () => {
    const out = pose();
    makeTrack([node(3, 3, 2, 1)], 0, true, 1).at(5, out);
    expect(out.position.x).toBe(3);
    makeTrack([node(0, 0, 1), node(5, 0, 1), node(5, 5, 1)], 0, true, 1).at(1.2, out);
    expect(Number.isFinite(out.position.x + out.position.z + out.quaternion.w)).toBe(true);
  });
});

describe('how an actor stands', () => {
  it('arrives facing the way its keyframe says, and turns on the spot for one in the same place', () => {
    const east = MathUtils.degToRad(90);
    const track = makeTrack([node(0, 0, 0), node(0, 10, 5, 0, { yaw: -east }), node(0, 10, 8, 0, { yaw: east })], 0, true, 1);
    const out = pose();
    track.at(1, out);
    expect(heading(out)).toBeCloseTo(0, 1);
    track.at(5, out);
    expect(heading(out)).toBeCloseTo(-east, 5);
    track.at(6.5, out);
    expect(out.position.distanceTo(new Vector3(0, 0, 10))).toBeLessThan(1e-6);
    track.at(8, out);
    expect(heading(out)).toBeCloseTo(east, 5);
  });

  it('climbs from the ground onto a wall, standing square to each', () => {
    const wall = new Vector3(1, 0, 0);
    const track = makeTrack(
      [node(0, 0, 0), node(-5, 0, 5, 1), node(-5, 0, 9, 0, { position: new Vector3(-5, 4, 0), up: wall })],
      -Math.PI / 2,
      true,
      1,
    );
    const out = pose();
    track.at(9, out);
    expect(upOf(out).distanceTo(wall)).toBeLessThan(1e-6);
    // Climbing straight up the wall, its nose points up.
    expect(new Vector3(0, 0, 1).applyQuaternion(out.quaternion).y).toBeGreaterThan(0.9);
    track.at(5.5, out);
    expect(upOf(out).distanceTo(UP)).toBeLessThan(1e-6);
  });

  it('leans by its keyframe on top of everything else', () => {
    const out = pose();
    makeTrack([node(0, 0, 0, 0, { yaw: 0, pitch: MathUtils.degToRad(30) })], 0, true, 1).at(0, out);
    expect(new Vector3(0, 0, 1).applyQuaternion(out.quaternion).y).toBeCloseTo(-0.5, 5);
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
