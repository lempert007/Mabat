import type { Vector3 } from 'three';
import type { Track } from './track';
import type { Actor, ActorKind, StageKind } from '@/types/api';

/** One actor at one moment. */
export interface ActorPose {
  /** The centre of its model, world space. */
  position: Vector3;
  heading: number;
  /** Distance covered on its own, world units, for turning a rover's wheels. */
  travelled: number;
  /** 0 to 1: how hard a drone's rotors are working. */
  power: number;
  /** Still riding the rope or another actor. */
  attached: boolean;
}

/** Everything that moves, at one moment. Positions are world space; models sit at their centre. */
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
  /** Where the rope leaves the carrier. */
  winch: Vector3;
  /** The rope's end. */
  hook: Vector3;
  /** Rope paid out, metres. */
  payout: number;
  /** In the order of `mission.actors`. */
  actors: ActorPose[];
  /** What the camera watches: the carrier in the air, the action on the ground. */
  focus: Vector3;
  /** Who that is: an actor's index, `hook` for the rope's end, or `carrier`. */
  subject: number | 'hook' | 'carrier';
  /** How big the thing being watched is, world units, so a close shot keeps it in frame. */
  focusSize: number;
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

/**
 * How tall each model turned out, as a fraction of its size, by `carrier` or an actor's id.
 * Anything not measured yet stands at its built-in model's height.
 */
export type ModelHeights = Record<string, number>;

/** One actor as the plan resolved it. */
export interface CastMember {
  actor: Actor;
  kind: ActorKind;
  /** Its size, its longest side, and half its height, world units. */
  size: number;
  half: number;
  /** Its own motion once it is free, or null while it never leaves what it rides. */
  track: Track | null;
}

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
  /** Where the carrier holds while the rope is down. */
  hover: Vector3;
  /** The height the carrier cruises at, world Y. */
  cruiseY: number;
  hub: Vector3 | null;
  site: Site;
  /** The carrier's size and half its height, and how tall its landing legs stand, world units. */
  carrier: { size: number; half: number; legs: number };
  /** In the order of `mission.actors`. */
  cast: CastMember[];
  /** The moment the rope sets its load down, which is when keyframe time starts, s. */
  onsite: number;
  /** How much rope the drop needs from the hover point, metres. */
  tetherNeeded: number;
  /** One way, metres. */
  routeLength: number;
  unitsPerMeter: number;
}
