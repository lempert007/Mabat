import { MathUtils, Vector3 } from 'three';
import { profile, type Motion } from './profile';
import { BUILT_IN_HEIGHT } from './defaults';
import { animate, lineUp, newPose } from './cast';
import { entryPoint, lerpAngle, makeRoute, turnBetween, type Route } from './route';
import type { MissionFrame, MissionPlan, ModelHeights, PlannedStage, Site } from './types';
import { toVector3 } from '@/lib/vec';
import type { Mission, StageKind } from '@/types/api';

const GRAVITY = 9.81;
/** Horizontal acceleration of the carrier, m/s². */
const FLIGHT_ACCEL = 3;
/** Climbs, descents and the winch, m/s². */
const LIFT_ACCEL = 1.2;
/** Shortest climb back to cruise, so turning for home is never a snap, s. */
const MIN_TURN = 3;
/** Settling into the hover before the winch starts, s. */
const SETTLE = 2;
/** Rotors running up before takeoff and down after touchdown, s. */
const SPOOL = 1.5;
/** Blending from hovering on the lift rotors to flying on the pusher, s. */
const TRANSITION = 4;
/** Below this much rope the load still rides the carrier's bob, m. */
const RIDE = 5;
/** How far the load swings on a long rope, m. */
const SWING = 0.18;
const MAX_BANK = MathUtils.degToRad(28);
/** Stages shorter than this would be a sliver on the timeline, so they are left out, s. */
const MIN_STAGE = 0.05;
/** The flight path is sampled this often, s. */
export const PATH_STEP = 0.1;

type Sampler = (local: number, time: number, frame: MissionFrame) => void;

const smoothstep = (from: number, to: number, value: number) =>
  to <= from ? (value >= to ? 1 : 0) : MathUtils.smoothstep(value, from, to);

/**
 * Turns a mission into a timeline of stages and a function from time to everything that moves.
 *
 * The whole show is that pure function. Playing, scrubbing, jumping to a stage and looping are
 * all just asking for another moment, so nothing can drift, and the trail, the telemetry and
 * the cameras can each look at whatever moment they need.
 *
 * The flight is fixed: out along the route, down to the hover, the rope paid out until its load
 * touches down, and home again. What happens on the ground in between is the editor's, in each
 * actor's keyframes (`cast.ts`), and the carrier waits until all of it is done.
 */
export function buildPlan(mission: Mission, site: Site, heights: ModelHeights = {}): MissionPlan | null {
  if (!mission.drop) return null;
  const u = mission.unitsPerMeter;
  const carrierSize = mission.carrier.size * u;
  const carrierHalf = (carrierSize * (heights.carrier ?? BUILT_IN_HEIGHT.carrier)) / 2;
  const lineup = lineUp(mission.actors, heights, u);
  const stack = lineup.loadUp + lineup.loadDown;

  // The rope runs from the winch to the top of the load, and lets it go with its foot at the
  // release height.
  const drop = toVector3(mission.drop);
  const ground = drop.y;
  const releaseTop = drop.clone().setY(ground + mission.releaseHeight * u + stack);
  const hoverY = Math.max(ground + mission.hoverAltitude * u, releaseTop.y + carrierHalf + u);
  const cruiseY = Math.max(ground + mission.cruiseAltitude * u, hoverY);
  const hover = new Vector3(mission.hover?.x ?? drop.x, hoverY, mission.hover?.z ?? drop.z);
  const hub = mission.hub ? toVector3(mission.hub) : null;
  const atCruise = (point: { x: number; z: number }) => new Vector3(point.x, cruiseY, point.z);

  const via = [...mission.waypoints.map(atCruise), atCruise(hover)];
  const start = hub ? atCruise(hub) : entryPoint(via, site, cruiseY);
  const out = makeRoute([start, ...via]);
  const back = makeRoute([...via].reverse().concat(start));
  const arriving = out.heading(out.length);
  const sideways = new Vector3(Math.cos(arriving), 0, -Math.sin(arriving));

  // On the pad the load hangs under the carrier, so it stands on legs that tall.
  const legs = stack + 0.05 * u;
  const padY = (hub?.y ?? ground) + carrierHalf + legs;

  const winchAtHover = hover.clone().setY(hoverY - carrierHalf);
  const reach = winchAtHover.distanceTo(releaseTop);
  const payoutMax = Math.min(reach, mission.tetherLength * u);
  const lineDirection = releaseTop.clone().sub(winchAtHover).normalize();
  const swingPeriod = 2 * Math.PI * Math.sqrt(Math.max(reach / u, 1) / GRAVITY);

  const flight = (distance: number, speed: number) => profile(distance, speed * u, FLIGHT_ACCEL * u);
  const vertical = (distance: number, speed: number) => profile(distance, speed * u, LIFT_ACCEL * u);

  /* ---------------------------------------------------------------- frame helpers */

  /** The rope is wound in and its load hangs against the carrier's belly. */
  const stow = (frame: MissionFrame) => {
    frame.winch.copy(frame.carrier).y -= carrierHalf;
    frame.hook.copy(frame.winch);
    frame.payout = 0;
  };

  /** Flying a route: position, heading, a bank into turns and a nod with each change of speed. */
  const fly = (frame: MissionFrame, route: Route, motion: Motion, local: number, duration: number) => {
    const step = 2 * u;
    frame.carrier.copy(route.position(motion.distance));
    frame.heading = route.heading(motion.distance);
    const turn = turnBetween(route.heading(motion.distance - step), route.heading(motion.distance + step));
    const curvature = turn / ((2 * step) / u);
    const speed = motion.speed / u;
    frame.bank = MathUtils.clamp(-Math.atan((speed * speed * curvature) / GRAVITY), -MAX_BANK, MAX_BANK);
    const ends = smoothstep(0, 1.5, local) * (1 - smoothstep(duration - 1.5, duration, local));
    frame.pitch = Math.atan(motion.accel / u / GRAVITY) * 0.6 * ends;
    frame.thrust = smoothstep(0, TRANSITION, local) * (1 - smoothstep(duration - TRANSITION, duration, local));
    frame.lift = 1 - 0.92 * frame.thrust;
  };

  /** Hovering is never quite still: a slow bob and drift, faded in and out around the hold. */
  let hoverFrom = 0;
  let hoverTo = 0;
  const bob = (frame: MissionFrame, time: number) => {
    const scale = 0.7 * u * smoothstep(hoverFrom, hoverFrom + 2, time) * (1 - smoothstep(hoverTo - 2, hoverTo, time));
    frame.carrier.x += Math.sin(time * 0.37) * 0.22 * scale;
    frame.carrier.y += Math.sin(time * 0.9) * 0.1 * scale;
    frame.carrier.z += Math.cos(time * 0.29) * 0.22 * scale;
  };

  const holdOver = (frame: MissionFrame, time: number) => {
    frame.carrier.copy(hover);
    frame.heading = arriving;
    frame.lift = 1;
    bob(frame, time);
    frame.winch.copy(frame.carrier).y -= carrierHalf;
  };

  /**
   * Pays the rope out. Close under the carrier its load rides the carrier's bob; further down
   * it swings with the period of a pendulum that long, easing off as it settles over the drop.
   */
  const hang = (frame: MissionFrame, payout: number, settled: number, time: number) => {
    const meters = payout / u;
    const swing =
      SWING * u * Math.min(1, meters / 8) * (1 - settled) *
      (Math.sin((time / swingPeriod) * Math.PI * 2) + 0.3 * Math.sin(time * 8.2));
    frame.hook
      .copy(frame.winch)
      .lerp(winchAtHover, Math.min(1, meters / RIDE))
      .addScaledVector(lineDirection, payout)
      .addScaledVector(sideways, swing);
    frame.payout = meters;
  };

  /* ---------------------------------------------------------------- the stages */

  const specs: { kind: StageKind; duration: number; sample: Sampler }[] = [];
  const add = (kind: StageKind, duration: number, sample: Sampler) => {
    if (duration >= MIN_STAGE) specs.push({ kind, duration, sample });
  };

  if (hub) {
    const climb = vertical(cruiseY - padY, mission.climbRate);
    const heading = out.heading(0);
    add('takeoff', SPOOL + climb.duration, (local, _time, frame) => {
      frame.carrier.set(hub.x, padY + climb.at(local - SPOOL).distance, hub.z);
      frame.heading = heading;
      frame.lift = smoothstep(0, SPOOL, local);
      frame.gear = 1 - smoothstep(SPOOL + 2, SPOOL + 4, local);
      stow(frame);
    });
  }

  const cruise = flight(out.length, mission.cruiseSpeed);
  add('cruise', cruise.duration, (local, _time, frame) => {
    fly(frame, out, cruise.at(local), local, cruise.duration);
    stow(frame);
  });

  const descend = vertical(cruiseY - hoverY, mission.climbRate);
  add('approach', descend.duration + SETTLE, (local, time, frame) => {
    frame.carrier.set(hover.x, cruiseY - descend.at(local).distance, hover.z);
    frame.heading = arriving;
    frame.lift = 1;
    bob(frame, time);
    stow(frame);
  });

  const winch = vertical(payoutMax, mission.winchSpeed);
  add('lower', winch.duration, (local, time, frame) => {
    holdOver(frame, time);
    const payout = winch.at(local).distance;
    hang(frame, payout, smoothstep(0.75, 1, payout / payoutMax), time);
  });

  // The rope's end with the load touching down: wherever the rope reaches.
  const held = winchAtHover.clone().addScaledVector(lineDirection, payoutMax);
  const reelIn = (frame: MissionFrame, reeled: number, time: number) => {
    const payout = payoutMax - winch.at(reeled).distance;
    hang(frame, payout, 1 - smoothstep(0, winch.duration * 0.25, reeled), time);
  };

  // A load set free lets the rope go straight back up; one that stays on waits down there.
  const keepsLoad = lineup.load !== -1 && mission.actors[lineup.load].staysHooked;
  const onsite = lineup.showEnd + mission.dwell;
  add('onsite', onsite, (local, time, frame) => {
    holdOver(frame, time);
    if (keepsLoad) {
      frame.hook.copy(held);
      frame.payout = payoutMax / u;
    } else reelIn(frame, local, time);
  });

  add('raise', keepsLoad ? winch.duration : winch.duration - onsite, (local, time, frame) => {
    holdOver(frame, time);
    reelIn(frame, keepsLoad ? local : onsite + local, time);
  });

  const climbBack = vertical(cruiseY - hoverY, mission.climbRate);
  const climbTime = Math.max(climbBack.duration, MIN_TURN);
  const leaving = back.heading(0);
  const home = flight(back.length, mission.cruiseSpeed);
  add('return', climbTime + home.duration, (local, time, frame) => {
    if (local < climbTime) {
      frame.carrier.set(hover.x, hoverY + climbBack.at(local).distance, hover.z);
      frame.heading = lerpAngle(arriving, leaving, smoothstep(0, climbTime, local));
      frame.lift = 1;
      bob(frame, time);
    } else {
      fly(frame, back, home.at(local - climbTime), local - climbTime, home.duration);
    }
    stow(frame);
  });

  if (hub) {
    const settle = vertical(cruiseY - padY, mission.climbRate);
    const heading = back.heading(back.length);
    add('land', settle.duration + SPOOL, (local, _time, frame) => {
      frame.carrier.set(hub.x, cruiseY - settle.at(local).distance, hub.z);
      frame.heading = heading;
      frame.lift = 1 - smoothstep(settle.duration, settle.duration + SPOOL, local);
      frame.gear = smoothstep(settle.duration - 4, settle.duration - 1.5, local);
      stow(frame);
    });
  }

  /* ---------------------------------------------------------------- the timeline */

  const stages: PlannedStage[] = [];
  let clock = 0;
  for (const spec of specs) {
    stages.push({ kind: spec.kind, start: clock, duration: spec.duration });
    clock += spec.duration;
  }
  const duration = clock;
  const startOf = (kind: StageKind) => stages.find((stage) => stage.kind === kind);
  const lowered = startOf('lower');
  const touchdown = lowered ? lowered.start + lowered.duration : (startOf('onsite')?.start ?? 0);
  const wound = startOf('raise') ?? startOf('onsite');
  hoverFrom = (startOf('approach')?.start ?? 0) + descend.duration;
  hoverTo = wound ? wound.start + wound.duration : touchdown;

  /** The carrier and the rope at a moment, before anything on the ground is placed. */
  const base = (time: number): MissionFrame => {
    const at = MathUtils.clamp(time, 0, duration);
    const index = stageIndexAt({ stages }, at);
    const stage = stages[index];
    const frame: MissionFrame = {
      stage: index,
      carrier: new Vector3(),
      heading: 0,
      pitch: 0,
      bank: 0,
      lift: 1,
      thrust: 0,
      gear: 0,
      winch: new Vector3(),
      hook: new Vector3(),
      payout: 0,
      actors: mission.actors.map(newPose),
      focus: new Vector3(),
      subject: 'carrier',
      focusSize: carrierSize,
    };
    specs[index].sample(at - stage.start, at, frame);
    return frame;
  };

  const cast = animate(lineup, { onsite: touchdown, releasedAloft: mission.releaseHeight > 0.05, base, unitsPerMeter: u });

  const sample = (time: number): MissionFrame => {
    const at = MathUtils.clamp(time, 0, duration);
    const frame = base(at);
    cast.place(frame, at);
    // In the air the camera watches the carrier; once the rope goes down, the ground.
    const kind = stages[frame.stage].kind;
    const watched = kind === 'onsite' ? cast.focusAt(at) : kind === 'lower' ? lineup.load : null;
    if (watched !== null && watched >= 0) {
      frame.subject = watched;
      frame.focus.copy(frame.actors[watched].position);
      frame.focusSize = cast.members[watched].size;
    } else if (watched === -1 || kind === 'raise') {
      frame.subject = 'hook';
      frame.focus.copy(frame.hook);
      frame.focusSize = u;
    } else frame.focus.copy(frame.carrier);
    return frame;
  };

  let cached: { time: number; frame: MissionFrame } | null = null;
  const frameAt = (time: number) => {
    if (cached?.time !== time) cached = { time, frame: sample(time) };
    return cached.frame;
  };

  const path: Vector3[] = [];
  for (let step = 0; step * PATH_STEP < duration; step += 1) path.push(base(step * PATH_STEP).carrier);
  path.push(base(duration).carrier);

  return {
    stages,
    duration,
    frameAt,
    sample,
    path,
    drop,
    hover,
    cruiseY,
    hub,
    site,
    carrier: { size: carrierSize, half: carrierHalf, legs },
    cast: cast.members,
    onsite: touchdown,
    tetherNeeded: reach / u,
    routeLength: out.length / u,
    unitsPerMeter: u,
  };
}

/** The stage playing at a moment. */
export function stageIndexAt(plan: Pick<MissionPlan, 'stages'>, time: number): number {
  const index = plan.stages.findIndex((stage) => time < stage.start + stage.duration);
  return index === -1 ? plan.stages.length - 1 : index;
}
