/** Where a move has got to at a moment: distance covered, speed, and acceleration. */
export interface Motion {
  distance: number;
  speed: number;
  accel: number;
}

export interface Profile {
  duration: number;
  at: (time: number) => Motion;
}

/**
 * A move that starts and ends at rest: speed up at `accel`, hold `maxSpeed`, slow down at
 * `accel`. A move too short to reach full speed becomes a triangle instead of a trapezoid.
 *
 * Every motion in a mission is one of these, so climbs, flights and the winch all start and
 * stop the way a real machine does, and the speed shown on screen is the speed being flown.
 */
export function profile(distance: number, maxSpeed: number, accel: number): Profile {
  if (distance <= 1e-6 || maxSpeed <= 0 || accel <= 0) {
    return { duration: 0, at: () => ({ distance: 0, speed: 0, accel: 0 }) };
  }
  let rampTime = maxSpeed / accel;
  let rampDistance = 0.5 * accel * rampTime * rampTime;
  let top = maxSpeed;
  if (2 * rampDistance > distance) {
    rampTime = Math.sqrt(distance / accel);
    rampDistance = distance / 2;
    top = accel * rampTime;
  }
  const holdTime = (distance - 2 * rampDistance) / top;
  const duration = 2 * rampTime + holdTime;

  return {
    duration,
    at: (time) => {
      const t = Math.min(Math.max(time, 0), duration);
      if (t < rampTime) return { distance: 0.5 * accel * t * t, speed: accel * t, accel };
      if (t < rampTime + holdTime) {
        return { distance: rampDistance + top * (t - rampTime), speed: top, accel: 0 };
      }
      const left = duration - t;
      return { distance: distance - 0.5 * accel * left * left, speed: accel * left, accel: -accel };
    },
  };
}
