import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { buildPlan, stageIndexAt } from './plan';
import type { MissionFrame, MissionPlan } from './types';
import { newActor, newMission } from './defaults';
import { telemetryAt } from './telemetry';
import type { Actor, Mission } from '@/types/api';

const SITE = { center: new Vector3(0, 0, 0), radius: 200 };
const DROP = { x: 40, y: 2, z: -30 };

function plan(changes: Partial<Mission> = {}): MissionPlan {
  const built = buildPlan({ ...newMission(), drop: DROP, ...changes }, SITE);
  if (!built) throw new Error('a mission with a drop always has a plan');
  return built;
}

const actor = (kind: Actor['kind'], changes: Partial<Actor>): Actor => ({ ...newActor(kind, 'hook'), ...changes });

/** A rover lowered on the rope, which drives off with a parcel on its back and drops it at a door. */
const roverMission = (): Partial<Mission> => ({
  actors: [
    actor('rover', {
      id: 'rover',
      keys: [
        { at: 6, place: { x: 52, y: 2, z: -30 }, lift: 0, hold: 4 },
        { at: 14, place: { x: 52, y: 2, z: -18 }, lift: 0, hold: 0 },
      ],
    }),
    actor('parcel', {
      id: 'box',
      rides: 'rover',
      mount: 'above',
      leaves: 7,
      keys: [{ at: 8, place: { x: 53, y: 2, z: -30 }, lift: 0, hold: 0 }],
    }),
  ],
});

const moved = (a: MissionFrame, b: MissionFrame) =>
  Math.max(a.carrier.distanceTo(b.carrier), a.hook.distanceTo(b.hook), ...a.actors.map((pose, i) => pose.position.distanceTo(b.actors[i].position)));

const bottom = (mission: MissionPlan, frame: MissionFrame, index: number) => frame.actors[index].position.y - mission.cast[index].half;

describe('buildPlan', () => {
  it('waits for a drop before there is anything to play', () => {
    expect(buildPlan(newMission(), SITE)).toBeNull();
  });

  it('flies in from beyond the model when there is no hub, and takes off when there is', () => {
    expect(plan().stages.map((s) => s.kind)).toEqual(['cruise', 'approach', 'lower', 'onsite', 'raise', 'return']);
    expect(plan({ hub: { x: -80, y: 0, z: 60 } }).stages.map((s) => s.kind)).toEqual([
      'takeoff', 'cruise', 'approach', 'lower', 'onsite', 'raise', 'return', 'land',
    ]);
  });

  it('lays the stages end to end', () => {
    const { stages, duration } = plan({ hub: { x: -80, y: 0, z: 60 }, waypoints: [{ x: 0, y: 0, z: 90 }] });
    stages.forEach((stage, i) => {
      expect(stage.duration).toBeGreaterThan(0);
      if (i > 0) expect(stage.start).toBeCloseTo(stages[i - 1].start + stages[i - 1].duration);
    });
    const last = stages[stages.length - 1];
    expect(last.start + last.duration).toBeCloseTo(duration);
  });

  it('never jumps between one moment and the next, across every stage boundary', () => {
    const mission = plan({ hub: { x: -80, y: 0, z: 60 }, waypoints: [{ x: 0, y: 0, z: 90 }], hover: { x: 48, y: 0, z: -30 }, ...roverMission() });
    const step = 1 / 60;
    let previous = mission.sample(0);
    for (let time = step; time <= mission.duration; time += step) {
      const frame = mission.sample(time);
      // At 1x a frame lasts 1/60 s; nothing in this mission moves faster than ~30 m/s.
      expect(moved(previous, frame)).toBeLessThan(0.75);
      expect(Number.isFinite(frame.heading + frame.bank + frame.pitch + frame.actors[0].heading)).toBe(true);
      previous = frame;
    }
  });

  it('sets the load down on the drop, and the rope goes back up without it', () => {
    const mission = plan();
    const down = mission.sample(mission.onsite);
    expect(bottom(mission, down, 0) - DROP.y).toBeCloseTo(0, 3);
    expect(Math.hypot(down.actors[0].position.x - DROP.x, down.actors[0].position.z - DROP.z)).toBeLessThan(0.05);

    const end = mission.sample(mission.duration);
    expect(end.payout).toBe(0);
    expect(bottom(mission, end, 0) - DROP.y).toBeCloseTo(0, 3);
  });

  it('takes a load that stays on the rope back up with it', () => {
    const mission = plan({ actors: [actor('drone', { staysHooked: true })] });
    expect(mission.stages.map((s) => s.kind)).toContain('raise');
    const end = mission.sample(mission.duration);
    expect(end.actors[0].attached).toBe(true);
    expect(end.actors[0].position.distanceTo(end.carrier)).toBeLessThan(mission.carrier.size);
  });

  it('lets a load go at the release height', () => {
    const mission = plan({ releaseHeight: 12, actors: [actor('drone', {})] });
    expect(bottom(mission, mission.sample(mission.onsite + 1), 0) - DROP.y).toBeCloseTo(12, 3);
  });

  it('stops at the end of a rope too short for the drop', () => {
    const mission = plan({ hoverAltitude: 60, tetherLength: 40 });
    expect(mission.tetherNeeded).toBeGreaterThan(40);
    expect(mission.sample(mission.onsite).payout).toBeCloseTo(40);
  });

  it('waits on the ground until the last keyframe is done', () => {
    const mission = plan({ ...roverMission(), dwell: 3 });
    const onsite = mission.stages.find((s) => s.kind === 'onsite')!;
    expect(onsite.start).toBeCloseTo(mission.onsite);
    expect(onsite.duration).toBeCloseTo(14 + 3);
  });

  it('reaches every keyframe on time and waits there', () => {
    const mission = plan(roverMission());
    const at = (seconds: number) => mission.sample(mission.onsite + seconds).actors[0];
    for (const seconds of [6, 8, 10]) {
      expect(at(seconds).position.x).toBeCloseTo(52, 3);
      expect(at(seconds).position.z).toBeCloseTo(-30, 3);
    }
    expect(at(14).position.z).toBeCloseTo(-18, 3);
    expect(bottom(mission, mission.sample(mission.onsite + 14), 0)).toBeCloseTo(2, 3);
    // Driving off towards +x, then turning onto +z.
    expect(at(3).heading).toBeCloseTo(Math.PI / 2, 0);
    expect(at(13.9).heading).toBeCloseTo(0, 0);
  });

  it('carries a rider until it gets off, then leaves it where it was put', () => {
    const mission = plan(roverMission());
    const frame = (seconds: number) => mission.sample(mission.onsite + seconds);
    const riding = frame(3);
    expect(riding.actors[1].attached).toBe(true);
    expect(riding.actors[1].position.x).toBeCloseTo(riding.actors[0].position.x, 5);
    expect(riding.actors[1].position.y).toBeGreaterThan(riding.actors[0].position.y);

    const after = frame(20);
    expect(after.actors[1].attached).toBe(false);
    expect(after.actors[1].position.x).toBeCloseTo(53, 3);
    expect(bottom(mission, after, 1)).toBeCloseTo(2, 3);
  });

  it('watches whatever is moving on the ground', () => {
    const mission = plan(roverMission());
    const focus = (seconds: number) => mission.sample(mission.onsite + seconds).focus;
    expect(focus(3).distanceTo(mission.sample(mission.onsite + 3).actors[0].position)).toBeLessThan(1e-6);
    expect(focus(7.5).distanceTo(mission.sample(mission.onsite + 7.5).actors[1].position)).toBeLessThan(1e-6);
    expect(focus(12).distanceTo(mission.sample(mission.onsite + 12).actors[0].position)).toBeLessThan(1e-6);
  });

  it('lands back on the pad it took off from', () => {
    const hub = { x: -80, y: 3, z: 60 };
    const mission = plan({ hub });
    const first = mission.sample(0).carrier;
    const last = mission.sample(mission.duration).carrier;
    expect(first.distanceTo(last)).toBeLessThan(1e-6);
    expect(first.x).toBeCloseTo(hub.x);
    expect(first.z).toBeCloseTo(hub.z);
  });

  it('scales every distance with the model units', () => {
    const metres = plan();
    const centimetres = buildPlan(
      { ...newMission(100), drop: { x: 4000, y: 200, z: -3000 } },
      { center: new Vector3(), radius: 20000 },
    )!;
    expect(centimetres.duration).toBeCloseTo(metres.duration, 1);
    expect(centimetres.tetherNeeded).toBeCloseTo(metres.tetherNeeded, 3);
  });

  it('survives a waypoint placed right on the drop, and a ride that goes round in a circle', () => {
    const mission = plan({
      waypoints: [DROP],
      actors: [actor('rover', { id: 'a', rides: 'b' }), actor('rover', { id: 'b', rides: 'a' })],
    });
    for (let time = 0; time <= mission.duration; time += 0.5) {
      const { carrier, actors } = mission.sample(time);
      expect(Number.isFinite(carrier.x + carrier.y + carrier.z + actors[0].position.y + actors[1].position.y)).toBe(true);
    }
  });
});

describe('telemetry', () => {
  it('reads cruise speed and altitude off the flight', () => {
    const mission = plan();
    const cruise = mission.stages[stageIndexAt(mission, 0)];
    const middle = telemetryAt(mission, cruise.start + cruise.duration / 2);
    expect(middle.groundSpeed).toBeCloseTo(25, 0);
    expect(middle.altitude).toBeCloseTo(90, 0);
    expect(middle.payout).toBe(0);
  });
});
