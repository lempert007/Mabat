import { createId } from '@/lib/id';
import type { Actor, ActorKind, CameraShot, Mission, StageKind, Vehicle } from '@/types/api';

/** The camera each stage gets unless the editor picks another. */
export const DEFAULT_SHOTS: Record<StageKind, CameraShot> = {
  takeoff: 'orbit',
  cruise: 'chase',
  approach: 'side',
  lower: 'ground',
  onsite: 'close',
  raise: 'wide',
  return: 'chase',
  land: 'orbit',
};

/** Height of each built-in model as a fraction of its size, which is its longest side. */
export const BUILT_IN_HEIGHT: Record<'carrier' | ActorKind, number> = {
  carrier: 0.17,
  drone: 0.5,
  rover: 0.53,
  parcel: 0.7,
};

export const ACTOR_KINDS: ActorKind[] = ['drone', 'rover', 'parcel'];

/**
 * What each kind of actor starts out as. `speed` is the pace a new keyframe is timed at, in
 * metres per second, and `lift` how high a new one is set, so a rover drives and a drone flies
 * without the editor having to say so.
 */
export const ACTOR_PRESETS: Record<
  ActorKind,
  { size: number; color: string; speed: number; lift: number; turns: boolean; followsSurface: boolean }
> = {
  drone: { size: 0.8, color: '#34c76f', speed: 4, lift: 6, turns: true, followsSurface: false },
  rover: { size: 0.9, color: '#e8ecf2', speed: 1.4, lift: 0, turns: true, followsSurface: true },
  parcel: { size: 0.45, color: '#c9a27a', speed: 0.8, lift: 0, turns: false, followsSurface: true },
};

/** One colour per actor, for its path on the model and its row on the timeline. */
export const TRACK_COLORS = ['#ffb347', '#5bd1ff', '#ff6fae', '#9cff6b', '#b48cff', '#ffe066', '#ff8a5b', '#6bffd8'];

export function newActor(kind: ActorKind, rides: string | null, taken: string[] = []): Actor {
  const preset = ACTOR_PRESETS[kind];
  let id = createId();
  while (taken.includes(id)) id = createId();
  return {
    id,
    name: '',
    kind,
    size: preset.size,
    color: preset.color,
    rotation: null,
    model: null,
    rides,
    mount: 'below',
    leaves: 0,
    staysHooked: false,
    turns: preset.turns,
    followsSurface: preset.followsSurface,
    keys: [],
  };
}

const carrier = (size: number, color: string): Vehicle => ({ name: '', size, rotation: null, color, model: null });

/** A mission as the editor first sees it. The same defaults as the server's `schemas/mission.py`. */
export function newMission(unitsPerMeter = 1): Mission {
  return {
    unitsPerMeter,
    hub: null,
    waypoints: [],
    drop: null,
    hover: null,
    cruiseAltitude: 90,
    cruiseSpeed: 25,
    climbRate: 5,
    hoverAltitude: 70,
    tetherLength: 80,
    winchSpeed: 3,
    releaseHeight: 0,
    dwell: 3,
    carrier: carrier(3.6, '#5b9cff'),
    // A parcel on the rope, set down at the drop: the delivery everything else builds on.
    actors: [{ ...newActor('parcel', 'hook'), id: 'load' }],
    stages: {},
    noise: [],
  };
}
