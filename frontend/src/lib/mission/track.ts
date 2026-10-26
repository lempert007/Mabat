import { CatmullRomCurve3, MathUtils, Vector3 } from 'three';
import { lerpAngle } from './route';

/** A place an actor passes through, with when it gets there and when it moves on. */
export interface TrackNode {
  position: Vector3;
  arrive: number;
  leave: number;
  /** Waiting here, it is off the ground, so a drone keeps its rotors turning. */
  aloft: boolean;
}

/** Where an actor is on its own, at one moment. */
export interface TrackPose {
  position: Vector3;
  /** Radians about the vertical. Zero faces +Z. */
  heading: number;
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

/**
 * An actor's motion through its keyframes, as a pure function of time.
 *
 * Where it goes and when it gets there are worked out separately. The path is a centripetal
 * Catmull-Rom curve through the places, which turns smoothly and never loops back on itself.
 * The distance along it is a monotone cubic through each keyframe's moment, which arrives at
 * every keyframe exactly on time, never backs up, starts and ends at rest, and stands still for
 * a wait. So the editor only says where and when; the motion in between takes care of itself.
 *
 * It faces the way it is going, turning in from `heading` over the first stretch, unless
 * `turns` is off.
 */
export function makeTrack(nodes: TrackNode[], heading: number, turns: boolean, unitsPerMeter: number): Track {
  const u = unitsPerMeter;

  // The places, with any repeated one merged: its wait still counts, its distance does not.
  const places: Vector3[] = [];
  const along: number[] = [];
  for (const node of nodes) {
    if (places.length === 0 || node.position.distanceTo(places[places.length - 1]) > 1e-3 * u) places.push(node.position);
    along.push(places.length - 1);
  }

  // Sample the curve, segment by segment, so each place falls exactly on a sample.
  const samples: Vector3[] = [places[0].clone()];
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
      }
      placeDistance.push(distances[distances.length - 1]);
    }
  }

  // Headings along the path, turning in from where it started and held through any climb.
  const headings: number[] = [];
  const turnIn = 1.5 * u;
  let raw = heading;
  for (let i = 0; i < samples.length; i += 1) {
    const next = samples[Math.min(i + 1, samples.length - 1)];
    const here = samples[i === samples.length - 1 ? Math.max(i - 1, 0) : i];
    const dx = next.x - here.x;
    const dz = next.z - here.z;
    if (Math.hypot(dx, dz) > 1e-4 * u) raw = Math.atan2(dx, dz);
    headings.push(turns ? lerpAngle(heading, raw, MathUtils.smoothstep(distances[i], 0, turnIn)) : heading);
  }

  // The timing: distance against time, through every arrival and departure.
  const times: number[] = [];
  const reached: number[] = [];
  const rest: boolean[] = [];
  nodes.forEach((node, i) => {
    const s = placeDistance[along[i]];
    const arrive = times.length ? Math.max(node.arrive, times[times.length - 1] + MIN_GAP) : node.arrive;
    times.push(arrive);
    reached.push(s);
    rest.push(node.aloft);
    if (node.leave > arrive + MIN_GAP) {
      times.push(node.leave);
      reached.push(s);
      rest.push(node.aloft);
    }
  });
  const slopes = monotoneSlopes(times, reached);

  const moves: [number, number][] = [];
  for (let i = 0; i + 1 < times.length; i += 1) {
    if (reached[i + 1] - reached[i] > 1e-4 * u) moves.push([times[i], times[i + 1]]);
  }

  const last = times.length - 1;
  const pointAt = (s: number, out: Vector3) => {
    const i = Math.max(0, upperIndex(distances, s) - 1);
    const j = Math.min(i + 1, samples.length - 1);
    const span = distances[j] - distances[i];
    const f = span > 0 ? (s - distances[i]) / span : 0;
    out.copy(samples[i]).lerp(samples[j], f);
    return lerpAngle(headings[i], headings[j], f);
  };

  return {
    start: times[0],
    end: times[last],
    points: samples,
    moves,
    at: (time, out) => {
      let s: number;
      let speed = 0;
      let aloft: boolean;
      if (time <= times[0]) {
        s = reached[0];
        aloft = rest[0];
      } else if (time >= times[last]) {
        s = reached[last];
        aloft = rest[last];
      } else {
        const k = upperIndex(times, time) - 1;
        const h = times[k + 1] - times[k];
        const t = (time - times[k]) / h;
        const [y0, y1, m0, m1] = [reached[k], reached[k + 1], slopes[k], slopes[k + 1]];
        const t2 = t * t;
        const t3 = t2 * t;
        s = (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m1;
        speed = ((6 * t2 - 6 * t) * y0 + (-6 * t2 + 6 * t) * y1) / h + (3 * t2 - 4 * t + 1) * m0 + (3 * t2 - 2 * t) * m1;
        aloft = y1 === y0 ? rest[k] : true;
      }
      out.heading = pointAt(s, out.position);
      out.travelled = s;
      out.speed = Math.max(speed, 0);
      out.power = aloft ? 1 : MathUtils.smoothstep(out.speed, 0, 0.5 * u);
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
