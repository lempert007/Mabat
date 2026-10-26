import type { MissionPlan } from './types';

/** What the ground station reads out. Metres and metres per second. */
export interface Telemetry {
  /** The carrier's height above the drop. */
  altitude: number;
  groundSpeed: number;
  /** Straight-line distance across the ground from the carrier to the drop. */
  toDrop: number;
  payout: number;
}

/** Speeds are measured over this much of the flight, s. */
const SPAN = 0.25;

/**
 * Read off the frames rather than worked out separately, so what the panel says is always what
 * the picture shows.
 */
export function telemetryAt(plan: MissionPlan, time: number): Telemetry {
  const u = plan.unitsPerMeter;
  const now = plan.frameAt(time);
  const early = time >= SPAN;
  const other = plan.sample(early ? time - SPAN : time + SPAN).carrier;
  const [from, to] = early ? [other, now.carrier] : [now.carrier, other];
  const across = Math.hypot(to.x - from.x, to.z - from.z);
  return {
    altitude: (now.carrier.y - plan.drop.y) / u,
    groundSpeed: across / SPAN / u,
    toDrop: Math.hypot(now.carrier.x - plan.drop.x, now.carrier.z - plan.drop.z) / u,
    payout: now.payout,
  };
}
