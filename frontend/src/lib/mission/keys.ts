import { Vector3 } from 'three';
import { ACTOR_PRESETS } from './defaults';
import type { MissionPlan } from './types';
import { toVector3 } from '@/lib/vec';
import type { Actor, Keyframe, Vec3 } from '@/types/api';

/** Keyframe times are kept to a tenth of a second, which is as fine as anyone times a show. */
const STEP = 0.1;
/** The shortest move between two keyframes, s. */
export const GAP = 0.1;

export const roundTime = (time: number) => Number((Math.round(time / STEP) * STEP).toFixed(1));

const end = (key: Keyframe) => key.at + key.hold;

/** When a keyframe can be: after the one before has finished waiting, before the next arrives. */
export function keyBounds(actor: Actor, index: number): [number, number] {
  const before = actor.keys[index - 1];
  const after = actor.keys[index + 1];
  const start = actor.rides === null ? 0 : actor.rides === 'hook' ? GAP : actor.leaves + GAP;
  const min = before ? end(before) + GAP : start;
  const max = after ? after.at - actor.keys[index].hold - GAP : Infinity;
  return [min, Math.max(min, max)];
}

/** Where an actor is ready to set off from next, and when: its last keyframe, or its start. */
export function readyAt(plan: MissionPlan, actor: Actor, index: number): { position: Vector3; time: number } {
  const { half } = plan.cast[index];
  const u = plan.unitsPerMeter;
  const last = actor.keys[actor.keys.length - 1];
  if (last) return { position: toVector3(last.place).setY(last.place.y + last.lift * u), time: end(last) };

  // A rider is ready once its ride has stopped; anything else from the moment the load is down.
  const ride = plan.cast.find((member) => member.actor.id === actor.rides);
  const rideLast = ride?.actor.keys[ride.actor.keys.length - 1];
  const time = rideLast ? end(rideLast) : 0;
  const position = plan.sample(plan.onsite + time).actors[index].position.clone();
  position.y -= half;
  return { position, time };
}

/**
 * The actor with one more keyframe, at a spot the editor clicked. It is timed at the pace that
 * kind of actor moves at and set at the height of the one before, so tracing a route gives a
 * believable drive or flight before anyone touches a number. Something standing on the model
 * stands at its first spot from the start.
 */
export function withNextKey(plan: MissionPlan, actor: Actor, index: number, place: Vec3): Actor {
  const preset = ACTOR_PRESETS[actor.kind];
  const last = actor.keys[actor.keys.length - 1];
  const standing = actor.rides === null && !last;
  const lift = last?.lift ?? (standing ? 0 : preset.lift);
  const from = readyAt(plan, actor, index);
  const target = toVector3(place).setY(place.y + lift * plan.unitsPerMeter);
  const travel = standing ? 0 : Math.max(1, from.position.distanceTo(target) / plan.unitsPerMeter / preset.speed);
  const key: Keyframe = { at: roundTime(from.time + travel), place, lift, hold: 0 };
  const rider = actor.rides !== null && actor.rides !== 'hook';
  return {
    ...actor,
    // The first keyframe of a rider is where it gets off, once its ride has come to a stop.
    leaves: rider && !last ? from.time : actor.leaves,
    keys: [...actor.keys, key],
  };
}

export function moveKey(actor: Actor, index: number, place: Vec3): Actor {
  return { ...actor, keys: actor.keys.map((key, i) => (i === index ? { ...key, place } : key)) };
}

/** Moves a keyframe in time, as far as its neighbours allow. */
export function retimeKey(actor: Actor, index: number, at: number): Actor {
  const [min, max] = keyBounds(actor, index);
  const clamped = roundTime(Math.min(Math.max(at, min), max));
  return { ...actor, keys: actor.keys.map((key, i) => (i === index ? { ...key, at: clamped } : key)) };
}

/** A longer or shorter wait, which moves everything after it by the same amount. */
export function setHold(actor: Actor, index: number, hold: number): Actor {
  const shift = roundTime(Math.max(0, hold)) - actor.keys[index].hold;
  return {
    ...actor,
    keys: actor.keys.map((key, i) =>
      i === index ? { ...key, hold: key.hold + shift } : i > index ? { ...key, at: roundTime(key.at + shift) } : key,
    ),
  };
}

export function setLift(actor: Actor, index: number, lift: number): Actor {
  return { ...actor, keys: actor.keys.map((key, i) => (i === index ? { ...key, lift: Math.max(0, lift) } : key)) };
}

export function removeKey(actor: Actor, index: number): Actor {
  return { ...actor, keys: actor.keys.filter((__, i) => i !== index) };
}

/** When a rider gets off its ride: before its first keyframe. */
export function setLeaves(actor: Actor, leaves: number): Actor {
  const first = actor.keys[0];
  const max = first ? first.at - GAP : Infinity;
  return { ...actor, leaves: roundTime(Math.min(Math.max(leaves, 0), max)) };
}

/** Metres per second on the way to a keyframe, so a rover timed to cross a car park in a second shows. */
export function legSpeed(plan: MissionPlan, index: number, key: number): number | null {
  const { actor } = plan.cast[index];
  const target = actor.keys[key];
  const before = actor.keys[key - 1];
  const u = plan.unitsPerMeter;
  const to = toVector3(target.place).setY(target.place.y + target.lift * u);
  let from: Vector3;
  let leftAt: number;
  if (before) {
    from = toVector3(before.place).setY(before.place.y + before.lift * u);
    leftAt = end(before);
  } else if (actor.rides === null) return null;
  else {
    leftAt = actor.rides === 'hook' ? 0 : actor.leaves;
    from = plan.sample(plan.onsite + leftAt).actors[index].position.clone();
    from.y -= plan.cast[index].half;
  }
  const time = target.at - leftAt;
  return time > 0 ? from.distanceTo(to) / u / time : null;
}
