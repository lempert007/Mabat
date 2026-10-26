import type { Vector3 } from 'three';
import type { StageKind, VehicleSlot } from '@/types/api';

export type ParcelState = 'carried' | 'lowering' | 'delivered';

/** Everything that moves, at one moment. Positions are world space; vehicles sit at their centre. */
export interface MissionFrame {
  /** Index into the plan's stages. */
  stage: number;
  carrier: Vector3;
  /** Radians about the vertical. Zero flies the nose along +Z. */
  heading: number;
  pitch: number;
  bank: number;
  /** 0 to 1: how hard the lift rotors and the pusher propeller are working. */
  lift: number;
  thrust: number;
  /** 0 to 1: how far the carrier's landing legs are down. */
  gear: number;
  /** Where the tether leaves the carrier. */
  winch: Vector3;
  droid: Vector3;
  /** Tether paid out, metres. */
  payout: number;
  parcel: Vector3;
  parcelState: ParcelState;
}

export interface PlannedStage {
  kind: StageKind;
  start: number;
  duration: number;
}

/** The model the mission flies over: its centre and half its bounding diagonal. */
export interface Site {
  center: Vector3;
  radius: number;
}

/** Each vehicle's height as a fraction of its size, measured from the model that will be drawn. */
export type VehicleHeights = Record<VehicleSlot, number>;

export interface MissionPlan {
  stages: PlannedStage[];
  duration: number;
  /** The frame at a moment. Everything drawn asks for the same moment, so the last answer is kept. */
  frameAt: (time: number) => MissionFrame;
  /** A frame of its own, for looking at another moment without disturbing `frameAt`. */
  sample: (time: number) => MissionFrame;
  /** Carrier positions every PATH_STEP seconds, for the flight path and its trail. */
  path: Vector3[];
  drop: Vector3;
  /** Where the carrier holds while the droid is down. */
  hover: Vector3;
  /** The height the carrier cruises at, world Y. */
  cruiseY: number;
  hub: Vector3 | null;
  site: Site;
  /** Each vehicle's size, its longest side, and half its height, world units. */
  size: Record<VehicleSlot, number>;
  halfHeight: Record<VehicleSlot, number>;
  /** The moment the parcel touches the ground, s. */
  deliveredAt: number;
  /** How much tether the drop needs from the hover point, metres. */
  tetherNeeded: number;
  /** One way, metres. */
  routeLength: number;
  unitsPerMeter: number;
}
