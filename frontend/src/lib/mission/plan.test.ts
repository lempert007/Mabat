import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { buildPlan, stageIndexAt } from './plan';
import type { MissionFrame, MissionPlan } from './types';
import { newMission } from './defaults';
import { telemetryAt } from './telemetry';
import type { Mission } from '@/types/api';

const SITE = { center: new Vector3(0, 0, 0), radius: 200 };

function plan(changes: Partial<Mission> = {}): MissionPlan {
  const built = buildPlan({ ...newMission(), drop: { x: 40, y: 2, z: -30 }, ...changes }, SITE);
  if (!built) throw new Error('a mission with a drop always has a plan');
  return built;
}

const moved = (a: MissionFrame, b: MissionFrame) =>
  Math.max(a.carrier.distanceTo(b.carrier), a.droid.distanceTo(b.droid), a.parcel.distanceTo(b.parcel));

describe('buildPlan', () => {
  it('waits for a drop before there is anything to play', () => {
    expect(buildPlan(newMission(), SITE)).toBeNull();
  });

  it('flies in from beyond the model when there is no hub, and takes off when there is', () => {
    expect(plan().stages.map((s) => s.kind)).toEqual(['cruise', 'approach', 'lower', 'deliver', 'raise', 'return']);
    expect(plan({ hub: { x: -80, y: 0, z: 60 } }).stages.map((s) => s.kind)).toEqual([
      'takeoff', 'cruise', 'approach', 'lower', 'deliver', 'raise', 'return', 'land',
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
    const mission = plan({ hub: { x: -80, y: 0, z: 60 }, waypoints: [{ x: 0, y: 0, z: 90 }], hover: { x: 48, y: 0, z: -30 } });
    const step = 1 / 60;
    let previous = mission.sample(0);
    for (let time = step; time <= mission.duration; time += step) {
      const frame = mission.sample(time);
      // At 1x a frame lasts 1/60 s; nothing in this mission moves faster than ~30 m/s.
      expect(moved(previous, frame)).toBeLessThan(0.75);
      expect(Number.isFinite(frame.heading + frame.bank + frame.pitch)).toBe(true);
      previous = frame;
    }
  });

  it('holds the parcel at release height over the drop, then leaves it on the ground', () => {
    const mission = plan();
    const deliver = mission.stages.find((s) => s.kind === 'deliver')!;
    const held = mission.sample(deliver.start + 0.1);
    expect(held.parcelState).toBe('carried');
    const parcelBottom = held.parcel.y - mission.halfHeight.parcel;
    expect(parcelBottom - mission.drop.y).toBeCloseTo(1.5, 1);
    expect(Math.hypot(held.droid.x - 40, held.droid.z + 30)).toBeLessThan(0.05);

    const after = mission.sample(mission.duration);
    expect(after.parcelState).toBe('delivered');
    expect(after.parcel.y - mission.halfHeight.parcel).toBeCloseTo(mission.drop.y);
  });

  it('stops the droid at the end of a tether too short for the drop', () => {
    const mission = plan({ hoverAltitude: 60, tetherLength: 40 });
    expect(mission.tetherNeeded).toBeGreaterThan(40);
    const deliver = mission.stages.find((s) => s.kind === 'deliver')!;
    expect(mission.sample(deliver.start).payout).toBeCloseTo(40);
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

  it('survives a waypoint placed right on the drop', () => {
    const mission = plan({ waypoints: [{ x: 40, y: 2, z: -30 }] });
    for (let time = 0; time <= mission.duration; time += 0.5) {
      const { carrier } = mission.sample(time);
      expect(Number.isFinite(carrier.x + carrier.y + carrier.z)).toBe(true);
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
