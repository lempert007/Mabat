import { create } from 'zustand';
import { BUILT_IN_HEIGHT } from '@/lib/mission/defaults';
import type { MissionPlan } from '@/lib/mission/types';
import type { VehicleSlot } from '@/types/api';

/** Which showcase is on screen: the model with its points, or the mission playing over it. */
export type ShowcaseView = 'explore' | 'mission';

/**
 * Cinematic: the director picks the shots. Follow: the viewer orbits, the camera stays with the
 * action. Free: the camera is the viewer's alone.
 */
export type CameraMode = 'cinematic' | 'follow' | 'free';

/**
 * What the editor's next click on the model places. New waypoints keep coming until stopped;
 * a number moves the waypoint at that index.
 */
export type PlaceTarget = 'drop' | 'hover' | 'hub' | 'waypoint' | number;

export const PLAYBACK_RATES = [0.5, 1, 2, 4];

/** A long pause between frames, such as a background tab, is not flight time. */
const MAX_STEP = 0.1;

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
  /** How tall each drone model turned out, as a fraction of its size. Built-in until measured. */
  heights: Record<VehicleSlot, number>;

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
  setHeight: (slot: VehicleSlot, height: number) => void;
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
  heights: BUILT_IN_HEIGHT,
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
  // Aiming at a moving picture is hopeless, so placing anything stills the camera.
  setPlacing: (placing) => set(placing === null ? { placing } : { placing, camera: 'free' }),
  setEditing: (editing) => set({ editing, placing: editing ? get().placing : null }),
  setHeight: (slot, height) => set((state) => ({ heights: { ...state.heights, [slot]: height } })),
  reset: () => set({ ...initialState }),
}));
