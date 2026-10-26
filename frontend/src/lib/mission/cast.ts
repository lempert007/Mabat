import { Vector3 } from 'three';
import { BUILT_IN_HEIGHT } from './defaults';
import { makeTrack, type TrackNode, type TrackPose } from './track';
import type { ActorPose, CastMember, MissionFrame, ModelHeights } from './types';
import { toVector3 } from '@/lib/vec';
import type { Actor } from '@/types/api';

type Ride = 'hook' | number | null;

/** The actors sized and connected: who rides what, and how tall each one's load stands. */
export interface Lineup {
  members: Omit<CastMember, 'track'>[];
  ride: Ride[];
  /** Parents before the actors riding them. */
  order: number[];
  /** The actor on the rope, or -1 for a bare hook. */
  load: number;
  /** Everything stacked on the load reaches this far above its centre, and this far below. */
  loadUp: number;
  loadDown: number;
  /** When the last keyframe is done, seconds after the load is set down. */
  showEnd: number;
}

/** Moving a fraction of a second early, the camera is already there when something sets off, s. */
const LEAD = 0.6;
/** A rider leaves at least this long before its first keyframe, s. */
const GETTING_OFF = 0.3;

/** When a rider gets off: when the editor said, but never after its first keyframe. */
export const leaveTime = (actor: Actor) => Math.max(0, Math.min(actor.leaves, (actor.keys[0]?.at ?? 0) - GETTING_OFF));

/**
 * Works out what each actor rides and how big everything is. A ride that points nowhere, or
 * round in a circle, stands the actor on the model instead, and only the first actor that asks
 * for the rope gets it.
 */
export function lineUp(actors: Actor[], heights: ModelHeights, unitsPerMeter: number): Lineup {
  const index = new Map(actors.map((actor, i) => [actor.id, i]));
  let load = -1;
  const ride: Ride[] = actors.map((actor, i) => {
    if (actor.rides === 'hook') {
      if (load !== -1) return null;
      load = i;
      return 'hook';
    }
    return actor.rides === null ? null : (index.get(actor.rides) ?? null);
  });
  // Break any circle: an actor that ends up riding itself stands on the model.
  ride.forEach((_, i) => {
    const seen = new Set([i]);
    for (let at = ride[i]; typeof at === 'number'; at = ride[at]) {
      if (seen.has(at)) {
        ride[i] = null;
        break;
      }
      seen.add(at);
    }
  });

  const members = actors.map((actor) => {
    const size = actor.size * unitsPerMeter;
    return { actor, kind: actor.kind, size, half: (size * (heights[actor.id] ?? BUILT_IN_HEIGHT[actor.kind])) / 2 };
  });
  const riders = (parent: number, mount: Actor['mount']) =>
    actors.flatMap((actor, i) => (ride[i] === parent && actor.mount === mount ? [i] : []));
  const reach = (i: number, mount: Actor['mount']): number =>
    members[i].half + Math.max(0, ...riders(i, mount).map((r) => members[r].half + reach(r, mount)));

  const order: number[] = [];
  const visit = (i: number) => {
    order.push(i);
    actors.forEach((_, r) => ride[r] === i && visit(r));
  };
  ride.forEach((parent, i) => typeof parent !== 'number' && visit(i));

  const showEnd = Math.max(0, ...actors.map((actor) => {
    const last = actor.keys[actor.keys.length - 1];
    return last ? last.at + last.hold : 0;
  }));

  return {
    members,
    ride,
    order,
    load,
    loadUp: load === -1 ? 0 : reach(load, 'above'),
    loadDown: load === -1 ? 0 : reach(load, 'below'),
    showEnd,
  };
}

export interface Cast {
  members: CastMember[];
  /** Fills in `frame.actors` for the moment, given where the carrier and the hook are. */
  place: (frame: MissionFrame, time: number) => void;
  /** The actor the camera should be watching on the ground, or -1 for the hook. */
  focusAt: (time: number) => number;
}

export interface Stage {
  /** When the load is set down, s. */
  onsite: number;
  /** The load is let go in mid air, so a drone on the rope flies off rather than lands. */
  releasedAloft: boolean;
  /** The carrier and the hook at a moment, before any actor is placed. */
  base: (time: number) => MissionFrame;
  unitsPerMeter: number;
}

export const newPose = (): ActorPose => ({ position: new Vector3(), heading: 0, travelled: 0, power: 0, attached: true });

/** Each actor's motion, built in riding order so a rider knows where its ride is when it gets off. */
export function animate(lineup: Lineup, stage: Stage): Cast {
  const { members: sized, ride, order, load } = lineup;
  const u = stage.unitsPerMeter;
  const members: CastMember[] = sized.map((member) => ({ ...member, track: null }));
  const scratch: TrackPose = { position: new Vector3(), heading: 0, travelled: 0, speed: 0, power: 0 };

  const placeOne = (frame: MissionFrame, time: number, i: number) => {
    const member = members[i];
    const out = frame.actors[i];
    const track = member.track;
    const parent = ride[i];
    if (track && (parent === null || time >= track.start)) {
      track.at(time, scratch);
      out.position.copy(scratch.position);
      out.heading = scratch.heading;
      out.travelled = scratch.travelled;
      out.power = scratch.power;
      out.attached = false;
      return;
    }
    out.travelled = 0;
    out.attached = parent !== null;
    if (parent === 'hook') {
      out.position.copy(frame.hook).y -= lineup.loadUp;
      out.heading = frame.heading;
      // A drone on the rope steadies itself on the way down.
      out.power = member.kind === 'drone' && frame.payout > 0.05 ? 0.85 : 0;
    } else if (parent === null) {
      // Standing on the model with nowhere set yet: wait at the drop until it is placed.
      out.position.copy(frame.hook);
      out.heading = 0;
      out.power = 0;
    } else {
      const under = frame.actors[parent];
      const offset = members[parent].half + member.half;
      out.position.copy(under.position).y += member.actor.mount === 'above' ? offset : -offset;
      out.heading = under.heading;
      out.power = 0;
    }
  };

  const placeUpTo = (frame: MissionFrame, time: number, count: number) => {
    for (let k = 0; k < count; k += 1) placeOne(frame, time, order[k]);
  };

  order.forEach((i, k) => {
    const { actor, half } = members[i];
    const parent = ride[i];
    const keyNodes: TrackNode[] = actor.keys.map((key) => ({
      position: toVector3(key.place).setY(key.place.y + key.lift * u + half),
      arrive: stage.onsite + key.at,
      leave: stage.onsite + key.at + key.hold,
      aloft: key.lift > 0.05,
    }));

    if (parent === null) {
      if (keyNodes.length === 0) return;
      const [first, second] = keyNodes;
      const heading = second ? Math.atan2(second.position.x - first.position.x, second.position.z - first.position.z) : 0;
      members[i].track = makeTrack(keyNodes, heading, actor.turns, u);
      return;
    }
    if (parent === 'hook' ? actor.staysHooked : keyNodes.length === 0) return;

    // Set free from the rope as it touches down, or getting off its ride when it is told to.
    const leave = parent === 'hook' ? stage.onsite : stage.onsite + leaveTime(actor);
    const frame = stage.base(leave);
    placeUpTo(frame, leave, k + 1);
    const from = frame.actors[i];
    const start: TrackNode = {
      position: from.position.clone(),
      arrive: leave,
      leave,
      aloft: parent === 'hook' ? stage.releasedAloft : true,
    };
    members[i].track = makeTrack([start, ...keyNodes], from.heading, actor.turns, u);
  });

  const moves = members.flatMap((member, i) => member.track?.moves.map(([from, to]) => ({ from: from - LEAD, to, i })) ?? []);

  return {
    members,
    place: (frame, time) => placeUpTo(frame, time, order.length),
    // Whatever set off most recently, while it is moving; otherwise whatever moved last.
    focusAt: (time) => {
      let moving: (typeof moves)[number] | null = null;
      let stopped: (typeof moves)[number] | null = null;
      for (const move of moves) {
        if (move.from <= time && time < move.to) {
          if (!moving || move.from > moving.from) moving = move;
        } else if (move.to <= time && (!stopped || move.to > stopped.to)) stopped = move;
      }
      return moving?.i ?? stopped?.i ?? load;
    },
  };
}
