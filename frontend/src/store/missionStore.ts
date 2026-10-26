import { create } from 'zustand';
import type { MissionPlan, ModelHeights } from '@/lib/mission/types';
import type { Mission } from '@/types/api';

/** Which showcase is on screen: the model with its points, or the mission playing over it. */
export type ShowcaseView = 'explore' | 'mission';

/**
 * Cinematic: the director picks the shots. Follow: the viewer orbits, the camera stays with the
 * action. Free: the camera is the viewer's alone.
 */
export type CameraMode = 'cinematic' | 'follow' | 'free';

/** A noise contour being traced point by point, or one of its points being moved. */
export interface NoiseTarget {
  zone: number;
  vertex?: number;
}

/** An actor's keyframes being added one after another, or one of them being moved. */
export interface ActorTarget {
  actor: string;
  key?: number;
}

/**
 * What the editor's next click on the model places. New waypoints, like the points of a noise
 * contour and an actor's keyframes, keep coming until stopped; a number moves the waypoint at
 * that index.
 */
export type PlaceTarget = 'drop' | 'hover' | 'hub' | 'waypoint' | number | NoiseTarget | ActorTarget;

export const noiseTarget = (target: PlaceTarget | null): NoiseTarget | null =>
  typeof target === 'object' && target !== null && 'zone' in target ? target : null;

export const actorTarget = (target: PlaceTarget | null): ActorTarget | null =>
  typeof target === 'object' && target !== null && 'actor' in target ? target : null;

/** The placements that add point after point, where the last one can be taken back. */
export function isTracing(target: PlaceTarget | null): boolean {
  if (target === 'waypoint') return true;
  const noise = noiseTarget(target);
  if (noise) return noise.vertex === undefined;
  const actor = actorTarget(target);
  return actor !== null && actor.key === undefined;
}

/** The mission panel's tabs. The timeline of the ground shows while its tab is open. */
export type MissionTab = 'route' | 'flight' | 'scene' | 'stages' | 'noise';

/** The ground's tab is open, so its timeline docks in the player and takes the room around it. */
export const selectSceneOpen = (s: { editing: boolean; tab: MissionTab }) => s.editing && s.tab === 'scene';

/** The actor being edited, and which of its keyframes, if one. */
export interface Selection {
  actor: string;
  key: number | null;
}

export const PLAYBACK_RATES = [0.5, 1, 2, 4];

/** A long pause between frames, such as a background tab, is not flight time. */
const MAX_STEP = 0.1;
/** Edits closer together than this are one step to undo, so a drag is undone in one go, ms. */
const GESTURE = 700;
const HISTORY = 100;

interface MissionState {
  view: ShowcaseView;
  /** Seconds into the mission. */
  time: number;
  playing: boolean;
  rate: number;
  camera: CameraMode;
  /** Presenting: playback stops at the end of each stage until someone moves it on. */
  stepwise: boolean;
  /** Plays the current stage over and over. */
  loopStage: boolean;
  placing: PlaceTarget | null;
  /** The mission panel is open, so the handles for editing are drawn. */
  editing: boolean;
  /** How tall each uploaded model turned out. Anything else stands at its built-in height. */
  heights: ModelHeights;
  /** The noise contours are drawn on the ground. Off until someone asks for them. */
  noiseShown: boolean;
  tab: MissionTab;
  selected: Selection | null;
  /** The mission as it was before each edit, and as it was before each undo. Null: no mission. */
  past: (Mission | null)[];
  future: (Mission | null)[];
  lastEdit: number;

  setView: (view: ShowcaseView) => void;
  /** Opens the mission from its first moment, playing, with the director at the camera. */
  watch: () => void;
  seek: (time: number) => void;
  play: (plan: MissionPlan) => void;
  pause: () => void;
  /** Advances the clock by a frame's worth of real time. */
  tick: (delta: number, plan: MissionPlan) => void;
  setRate: (rate: number) => void;
  setCamera: (camera: CameraMode) => void;
  setStepwise: (stepwise: boolean) => void;
  setLoopStage: (loop: boolean) => void;
  setPlacing: (placing: PlaceTarget | null) => void;
  setEditing: (editing: boolean) => void;
  /** Null forgets a height, once its model is gone. */
  setHeight: (measures: string, height: number | null) => void;
  setNoiseShown: (shown: boolean) => void;
  setTab: (tab: MissionTab) => void;
  select: (selection: Selection | null) => void;
  /** Notes the mission as it stands, before an edit changes it. */
  record: (mission: Mission | null) => void;
  /** The mission to go back to, or forward to, given the one now; undefined when there is none. */
  takeUndo: (current: Mission | null) => Mission | null | undefined;
  takeRedo: (current: Mission | null) => Mission | null | undefined;
  clearHistory: () => void;
  reset: () => void;
}

const initialState = {
  view: 'explore' as ShowcaseView,
  time: 0,
  playing: false,
  rate: 1,
  camera: 'cinematic' as CameraMode,
  stepwise: false,
  loopStage: false,
  placing: null as PlaceTarget | null,
  editing: false,
  heights: {} as ModelHeights,
  noiseShown: false,
  tab: 'route' as MissionTab,
  selected: null as Selection | null,
  past: [] as (Mission | null)[],
  future: [] as (Mission | null)[],
  lastEdit: 0,
};

/** The stage a moment belongs to. A moment exactly on a boundary starts the next stage. */
const stageAround = (plan: MissionPlan, time: number) =>
  plan.stages.find((stage) => stage.start + stage.duration > time + 1e-6) ?? plan.stages[plan.stages.length - 1];

export const useMissionStore = create<MissionState>((set, get) => ({
  ...initialState,
  setView: (view) => set({ view, placing: null }),
  watch: () => set({ view: 'mission', time: 0, playing: true, camera: 'cinematic' }),
  seek: (time) => set({ time: Math.max(0, time) }),
  play: (plan) => {
    const { time } = get();
    set({ playing: true, time: time >= plan.duration - 1e-6 ? 0 : time });
  },
  pause: () => set({ playing: false }),
  tick: (delta, plan) => {
    const { time, rate, stepwise, loopStage, playing } = get();
    if (!playing) return;
    const stage = stageAround(plan, time);
    const stageEnd = stage.start + stage.duration;
    const next = time + Math.min(delta, MAX_STEP) * rate;
    if (loopStage && next >= stageEnd) set({ time: stage.start });
    else if (stepwise && next >= stageEnd) set({ time: stageEnd, playing: false });
    else if (next >= plan.duration) set({ time: plan.duration, playing: false });
    else set({ time: next });
  },
  setRate: (rate) => set({ rate }),
  setCamera: (camera) => set({ camera }),
  setStepwise: (stepwise) => set({ stepwise }),
  setLoopStage: (loopStage) => set({ loopStage }),
  // Aiming at a moving picture is hopeless, so placing anything stills the camera. Tracing a
  // noise contour blind would be just as hopeless, so it brings the noise map up.
  setPlacing: (placing) =>
    set(
      placing === null
        ? { placing }
        : { placing, camera: 'free', ...(noiseTarget(placing) && { noiseShown: true }) },
    ),
  // Editing, the camera is a working tool, so the director lets go of it.
  setEditing: (editing) =>
    set({
      editing,
      placing: editing ? get().placing : null,
      selected: editing ? get().selected : null,
      ...(editing && get().camera === 'cinematic' && { camera: 'free' as CameraMode }),
    }),
  setHeight: (measures, height) =>
    set((state) => {
      const heights = { ...state.heights };
      if (height === null) delete heights[measures];
      else heights[measures] = height;
      return { heights };
    }),
  setNoiseShown: (noiseShown) => set({ noiseShown }),
  setTab: (tab) => set({ tab }),
  select: (selected) => set({ selected }),
  record: (mission) => {
    const now = performance.now();
    const { past, lastEdit } = get();
    if (now - lastEdit < GESTURE) return set({ lastEdit: now });
    set({ past: [...past.slice(1 - HISTORY), mission], future: [], lastEdit: now });
  },
  takeUndo: (current) => {
    const { past, future } = get();
    if (past.length === 0) return undefined;
    set({ past: past.slice(0, -1), future: [...future, current], lastEdit: 0, placing: null });
    return past[past.length - 1];
  },
  takeRedo: (current) => {
    const { past, future } = get();
    if (future.length === 0) return undefined;
    set({ future: future.slice(0, -1), past: [...past, current], lastEdit: 0, placing: null });
    return future[future.length - 1];
  },
  clearHistory: () => set({ past: [], future: [], lastEdit: 0 }),
  reset: () => set({ ...initialState }),
}));
