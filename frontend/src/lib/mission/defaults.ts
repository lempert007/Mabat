import type { CameraShot, Mission, StageKind, Vehicle, VehicleSlot } from '@/types/api';

/** The camera each stage gets unless the editor picks another. */
export const DEFAULT_SHOTS: Record<StageKind, CameraShot> = {
  takeoff: 'orbit',
  cruise: 'chase',
  approach: 'side',
  lower: 'ground',
  deliver: 'droid',
  raise: 'top',
  return: 'chase',
  land: 'orbit',
};

export const VEHICLE_SLOTS: VehicleSlot[] = ['carrier', 'droid', 'parcel'];

/** Height of each built-in model as a fraction of its size, which is its longest side. */
export const BUILT_IN_HEIGHT: Record<VehicleSlot, number> = {
  carrier: 0.17,
  droid: 0.5,
  parcel: 0.7,
};

const vehicle = (size: number, color: string): Vehicle => ({ name: '', size, rotation: null, color });

/** A mission as the editor first sees it. The same defaults as the server's `schemas/mission.py`. */
export function newMission(unitsPerMeter = 1): Mission {
  return {
    unitsPerMeter,
    hub: null,
    waypoints: [],
    drop: null,
    hover: null,
    cruiseAltitude: 90,
    cruiseSpeed: 25,
    climbRate: 5,
    hoverAltitude: 70,
    tetherLength: 80,
    winchSpeed: 3,
    releaseHeight: 1.5,
    dwell: 5,
    carrier: vehicle(3.6, '#5b9cff'),
    droid: vehicle(0.8, '#34c76f'),
    parcel: vehicle(0.45, '#c9a27a'),
    stages: {},
    noise: [],
  };
}
