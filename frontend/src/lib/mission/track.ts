import { CatmullRomCurve3, Euler, MathUtils, Quaternion, Vector3 } from 'three';
import { lerpAngle } from './route';

/** A place an actor passes through, with when it gets there, when it moves on, and how it stands. */
export interface TrackNode {
  position: Vector3;
  arrive: number;
  leave: number;
  /** Waiting here, it is off the ground, so a drone keeps its rotors turning. */
  aloft: boolean;
  /** Its up here: the surface it stands on, or straight up. Unit length. */
  up: Vector3;
  /** Radians it faces about that up, or null to face the way it is moving. */
  yaw: number | null;
  /** Radians, nose down and rolled to its right, on top of the rest. */
  pitch: number;
  roll: number;
}

/** Where an actor is on its own, at one moment. */
export interface TrackPose {
  position: Vector3;
  quaternion: Quaternion;
  /** Distance covered since the track began, world units. */
  travelled: number;
  /** World units per second. */
  speed: number;
  /** 0 to 1: how hard a drone's rotors are working. */
  power: number;
}

export interface Track {
  start: number;
  end: number;
  /** The path, sampled, for drawing it. */
  points: Vector3[];
  /** Every stretch of time in which it is moving. */
  moves: [number, number][];
  /** Writes the pose at a moment into `out`. */
  at: (time: number, out: TrackPose) => void;
}

/** The path is sampled about this often, metres. */
const SAMPLE = 1;
/** Neighbouring times closer than this are pulled apart, so nothing has to teleport, s. */
const MIN_GAP = 0.05;
export const UP = new Vector3(0, 1, 0);

const euler = new Euler(0, 0, 0, 'YXZ');
const turn = new Quaternion();

/**
 * How something stands: square to `up`, turned `yaw` about it, then leaned by `pitch` and
 * `roll`. With `up` straight up, `yaw` is a plain compass heading from +Z.
 */
function orient(up: Vector3, yaw: number, pitch: number, roll: number, out: Quaternion): Quaternion {
  return out.setFromUnitVectors(UP, up).multiply(turn.setFromEuler(euler.set(pitch, yaw, roll)));
}

/** The heading a direction has for something whose up is `up`, or null if it points along `up`. */
export function yawOf(direction: Vector3, up: Vector3): number | null {
  const local = direction.clone().applyQuaternion(turn.setFromUnitVectors(UP, up).invert());
  return Math.hypot(local.x, local.z) > 1e-6 * direction.length() ? Math.atan2(local.x, local.z) : null;
}

/**
 * An actor's motion through its keyframes, as a pure function of time.
 *
 * Where it goes and when it gets there are worked out separately. The path is a centripetal
 * Catmull-Rom curve through the places, which turns smoothly and never loops back on itself.
 * The distance along it is a monotone cubic through each keyframe's moment, which arrives at
 * every keyframe exactly on time, never backs up, starts and ends at rest, and stands still for
 * a wait. So the editor only says where and when; the motion in between takes care of itself.
 *
 * How it stands follows the same moments. Its up turns from one surface to the next as it goes,
 * so it can drive from a yard up a wall. Unless a keyframe says which way to face, it faces the
 * way it is going (turning in from `heading` over the first stretch); a keyframe that does say
 * is turned into on the way there and out of on the way off, and a keyframe in the same place as
 * the one before turns it on the spot.
 */
export function makeTrack(nodes: TrackNode[], heading: number, turns: boolean, unitsPerMeter: number): Track {
  const u = unitsPerMeter;

  // The places, with any repeated one merged: its wait still counts, its distance does not.
  const places: Vector3[] = [];
  const placeUp: Vector3[] = [];
  const along: number[] = [];
  for (const node of nodes) {
    if (places.length === 0 || node.position.distanceTo(places[places.length - 1]) > 1e-3 * u) {
      places.push(node.position);
      placeUp.push(node.up);
    }
    along.push(places.length - 1);
  }

  // Sample the curve, segment by segment, so each place falls exactly on a sample.
  const samples: Vector3[] = [places[0].clone()];
  const ups: Vector3[] = [placeUp[0].clone()];
  const distances = [0];
  const placeDistance = [0];
  if (places.length > 1) {
    const curve = new CatmullRomCurve3(places, false, 'centripetal');
    const segments = places.length - 1;
    for (let segment = 0; segment < segments; segment += 1) {
      const chord = places[segment].distanceTo(places[segment + 1]);
      const count = MathUtils.clamp(Math.ceil(chord / (SAMPLE * u)), 4, 96);
      for (let step = 1; step <= count; step += 1) {
        const point = curve.getPoint((segment + step / count) / segments);
        distances.push(distances[distances.length - 1] + point.distanceTo(samples[samples.length - 1]));
        samples.push(point);
        ups.push(placeUp[segment].clone().lerp(placeUp[segment + 1], step / count).normalize());
      }
      placeDistance.push(distances[distances.length - 1]);
    }
  }

  // Headings along the path, measured about the local up, turning in from where it started and
  // held through any stretch that goes straight along that up, like a climb.
  const headings: number[] = [];
  const turnIn = 1.5 * u;
  let raw = heading;
  const step = new Vector3();
  for (let i = 0; i < samples.length; i += 1) {
    const from = samples[i === samples.length - 1 ? Math.max(i - 1, 0) : i];
    const to = samples[Math.min(i + 1, samples.length - 1)];
    raw = yawOf(step.subVectors(to, from), ups[i]) ?? raw;
    headings.push(turns ? lerpAngle(heading, raw, MathUtils.smoothstep(distances[i], 0, turnIn)) : heading);
  }

  const sampleAt = (s: number) => {
    const i = Math.max(0, upperIndex(distances, s) - 1);
    const j = Math.min(i + 1, samples.length - 1);
    const span = distances[j] - distances[i];
    return { i, j, f: span > 0 ? (s - distances[i]) / span : 0 };
  };
  const yawAt = (s: number) => {
    const { i, j, f } = sampleAt(s);
    return lerpAngle(headings[i], headings[j], f);
  };

  // The timing: distance against time, through every arrival and departure, each moment with
  // the keyframe it belongs to.
  const times: number[] = [];
  const reached: number[] = [];
  const owner: TrackNode[] = [];
  nodes.forEach((node, i) => {
    const s = placeDistance[along[i]];
    const arrive = times.length ? Math.max(node.arrive, times[times.length - 1] + MIN_GAP) : node.arrive;
    times.push(arrive);
    reached.push(s);
    owner.push(node);
    if (node.leave > arrive + MIN_GAP) {
      times.push(node.leave);
      reached.push(s);
      owner.push(node);
    }
  });
  const slopes = monotoneSlopes(times, reached);

  // The way it faces at each moment: as told, or the way it is going, or as it was.
  const facing: number[] = [];
  owner.forEach((node, k) => {
    const free = turns ? yawAt(reached[k]) : (facing[k - 1] ?? heading);
    facing.push(node.yaw ?? free);
  });

  const moves: [number, number][] = [];
  for (let i = 0; i + 1 < times.length; i += 1) {
    if (reached[i + 1] - reached[i] > 1e-4 * u) moves.push([times[i], times[i + 1]]);
  }

  const last = times.length - 1;
  const up = new Vector3();

  return {
    start: times[0],
    end: times[last],
    points: samples,
    moves,
    at: (time, out) => {
      if (time <= times[0] || time >= times[last]) {
        const k = time <= times[0] ? 0 : last;
        const node = owner[k];
        const { i, j, f } = sampleAt(reached[k]);
        out.position.copy(samples[i]).lerp(samples[j], f);
        orient(node.up, facing[k], node.pitch, node.roll, out.quaternion);
        out.travelled = reached[k];
        out.speed = 0;
        out.power = node.aloft ? 1 : 0;
        return;
      }

      const k = upperIndex(times, time) - 1;
      const h = times[k + 1] - times[k];
      const t = (time - times[k]) / h;
      const [y0, y1, m0, m1] = [reached[k], reached[k + 1], slopes[k], slopes[k + 1]];
      const t2 = t * t;
      const t3 = t2 * t;
      const s = (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m1;
      const speed = Math.max(((6 * t2 - 6 * t) * y0 + (-6 * t2 + 6 * t) * y1) / h + (3 * t2 - 4 * t + 1) * m0 + (3 * t2 - 2 * t) * m1, 0);
      const [from, to] = [owner[k], owner[k + 1]];
      const moving = y1 - y0 > 1e-4 * u;
      const { i, j, f } = sampleAt(s);
      out.position.copy(samples[i]).lerp(samples[j], f);

      let yaw: number;
      let progress: number;
      if (moving) {
        progress = (s - y0) / (y1 - y0);
        up.copy(ups[i]).lerp(ups[j], f).normalize();
        if (turns) {
          const window = Math.min(1.5 * u, (y1 - y0) / 2);
          yaw = yawAt(s);
          if (from.yaw !== null) yaw = lerpAngle(facing[k], yaw, MathUtils.smoothstep(s - y0, 0, window));
          if (to.yaw !== null) yaw = lerpAngle(yaw, facing[k + 1], MathUtils.smoothstep(s, y1 - window, y1));
        } else yaw = lerpAngle(facing[k], facing[k + 1], progress);
      } else {
        // Waiting, or turning on the spot.
        progress = MathUtils.smoothstep(t, 0, 1);
        up.copy(from.up).lerp(to.up, progress).normalize();
        yaw = lerpAngle(facing[k], facing[k + 1], progress);
      }
      orient(up, yaw, MathUtils.lerp(from.pitch, to.pitch, progress), MathUtils.lerp(from.roll, to.roll, progress), out.quaternion);
      out.travelled = s;
      out.speed = speed;
      out.power = moving || from.aloft ? 1 : MathUtils.smoothstep(speed, 0, 0.5 * u);
    },
  };
}

/**
 * Tangents for a monotone cubic through the points (Fritsch and Butland), flat at both ends so
 * the motion starts and stops at rest, and flat wherever it waits.
 */
export function monotoneSlopes(x: number[], y: number[]): number[] {
  const n = x.length;
  const slopes = new Array<number>(n).fill(0);
  for (let k = 1; k < n - 1; k += 1) {
    const h0 = x[k] - x[k - 1];
    const h1 = x[k + 1] - x[k];
    const d0 = (y[k] - y[k - 1]) / h0;
    const d1 = (y[k + 1] - y[k]) / h1;
    if (d0 * d1 <= 0) continue;
    const w0 = 2 * h1 + h0;
    const w1 = h1 + 2 * h0;
    slopes[k] = (w0 + w1) / (w0 / d0 + w1 / d1);
  }
  return slopes;
}

/** The index of the first value above `value` in an ascending list, or its length. */
function upperIndex(values: number[], value: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (values[middle] <= value) low = middle + 1;
    else high = middle;
  }
  return low;
}
