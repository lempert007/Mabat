import { MathUtils, Vector3 } from 'three';
import { ACTOR_PRESETS } from './defaults';
import { UP, yawOf } from './track';
import type { MissionPlan } from './types';
import { toVector3 } from '@/lib/vec';
import type { Actor, Keyframe, Mission, Vec3 } from '@/types/api';

/** Keyframe times are kept to a tenth of a second, which is as fine as anyone times a show. */
const STEP = 0.1;
/** The shortest move between two keyframes, s. */
export const GAP = 0.1;

export const roundTime = (time: number) => Number((Math.round(time / STEP) * STEP).toFixed(1));

/** An angle in degrees, brought round into -180 to 180. */
export const wrapDegrees = (degrees: number) => MathUtils.euclideanModulo(degrees + 180, 360) - 180;

const end = (key: Keyframe) => key.at + key.hold;

/** The surface a keyframe was set on faces this way; straight up if it was not recorded. */
export const normalOf = (key: Pick<Keyframe, 'normal'>) => (key.normal ? toVector3(key.normal).normalize() : UP.clone());

/** Where a keyframe holds an actor's foot: off its surface by its lift. */
export const footOf = (key: Pick<Keyframe, 'place' | 'normal' | 'lift'>, u: number) => toVector3(key.place).addScaledVector(normalOf(key), key.lift * u);

/** Where an actor's foot is at a moment of the ground's own time. */
function footAt(plan: MissionPlan, index: number, time: number): Vector3 {
  const pose = plan.sample(plan.onsite + time).actors[index];
  return pose.position.clone().addScaledVector(UP.clone().applyQuaternion(pose.quaternion), -plan.cast[index].half);
}

export const newKey = (at: number, place: Vec3, normal: Vec3 | null, lift: number): Keyframe => ({
  at,
  place,
  normal,
  lift,
  hold: 0,
  heading: null,
  pitch: 0,
  roll: 0,
});

/** The change that edits one actor of a mission. */
export const editActor =
  (id: string, edit: (actor: Actor) => Actor) =>
  (mission: Mission): Partial<Mission> => ({ actors: mission.actors.map((actor) => (actor.id === id ? edit(actor) : actor)) });

/** One keyframe changed, for anything that cannot upset the order of time. */
export function editKey(actor: Actor, index: number, patch: Partial<Omit<Keyframe, 'at' | 'hold'>>): Actor {
  return { ...actor, keys: actor.keys.map((key, i) => (i === index ? { ...key, ...patch } : key)) };
}

export function removeKey(actor: Actor, index: number): Actor {
  return { ...actor, keys: actor.keys.filter((__, i) => i !== index) };
}

/** When a keyframe can be: after the one before has finished waiting, before the next arrives. */
export function keyBounds(actor: Actor, index: number): [number, number] {
  const before = actor.keys[index - 1];
  const after = actor.keys[index + 1];
  const start = actor.rides === null ? 0 : actor.rides === 'hook' ? GAP : actor.leaves + GAP;
  const min = before ? end(before) + GAP : start;
  const max = after ? after.at - actor.keys[index].hold - GAP : Infinity;
  return [min, Math.max(min, max)];
}

/** Moves a keyframe in time, as far as its neighbours allow. */
export function retimeKey(actor: Actor, index: number, at: number): Actor {
  const [min, max] = keyBounds(actor, index);
  return { ...actor, keys: actor.keys.map((key, i) => (i === index ? { ...key, at: roundTime(MathUtils.clamp(at, min, max)) } : key)) };
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

/** When a rider gets off its ride: before its first keyframe. */
export function setLeaves(actor: Actor, leaves: number): Actor {
  const first = actor.keys[0];
  return { ...actor, leaves: roundTime(MathUtils.clamp(leaves, 0, first ? first.at - GAP : Infinity)) };
}

/**
 * The actor with one more keyframe, at a spot the editor clicked. It is timed at the pace that
 * kind of actor moves at, from where it last was, and set at the height of the one before, so
 * tracing a route gives a believable drive or flight before anyone touches a number. A rider's
 * first keyframe comes once its ride has stopped; something standing on the model stands at its
 * first spot from the start.
 */
export function withNextKey(plan: MissionPlan, actor: Actor, index: number, place: Vec3, normal: Vec3 | null): Actor {
  const preset = ACTOR_PRESETS[actor.kind];
  const u = plan.unitsPerMeter;
  const last = actor.keys[actor.keys.length - 1];
  const rider = actor.rides !== null && actor.rides !== 'hook';
  if (!last && actor.rides === null) return { ...actor, keys: [newKey(0, place, normal, 0)] };

  const ride = plan.cast.find((member) => member.actor.id === actor.rides)?.actor.keys.at(-1);
  const from = last ? end(last) : rider && ride ? end(ride) : 0;
  const start = last ? footOf(last, u) : footAt(plan, index, from);
  const lift = last?.lift ?? preset.lift;
  const travel = Math.max(1, start.distanceTo(footOf({ place, normal, lift }, u)) / u / preset.speed);
  return {
    ...actor,
    leaves: rider && !last ? from : actor.leaves,
    keys: [...actor.keys, newKey(roundTime(from + travel), place, normal, lift)],
  };
}

/** Which way the actor faces as it reaches a keyframe, degrees, whether or not the keyframe says. */
export function facingAt(plan: MissionPlan, index: number, key: number): number {
  const { actor } = plan.cast[index];
  const stated = actor.keys[key].heading;
  if (stated !== null) return stated;
  const { quaternion } = plan.sample(plan.onsite + actor.keys[key].at).actors[index];
  const yaw = yawOf(new Vector3(0, 0, 1).applyQuaternion(quaternion), UP.clone().applyQuaternion(quaternion)) ?? 0;
  return Math.round(MathUtils.radToDeg(yaw));
}

/** Metres per second on the way to a keyframe, so a rover timed to cross a car park in a second shows. */
export function legSpeed(plan: MissionPlan, index: number, key: number): number | null {
  const { actor } = plan.cast[index];
  const target = actor.keys[key];
  const before = actor.keys[key - 1];
  if (!before && actor.rides === null) return null;
  const u = plan.unitsPerMeter;
  const leftAt = before ? end(before) : actor.rides === 'hook' ? 0 : actor.leaves;
  const from = before ? footOf(before, u) : footAt(plan, index, leftAt);
  const time = target.at - leftAt;
  return time > 0 ? from.distanceTo(footOf(target, u)) / u / time : null;
}
