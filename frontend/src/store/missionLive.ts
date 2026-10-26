import type { MissionFrame } from '@/lib/mission/types';

/**
 * The frame being drawn, set once per rendered frame by MissionClock before anything else runs.
 * Everything animated in the canvas reads it from here rather than through React state, so a
 * playing mission re-renders no components.
 */
export const missionLive: { frame: MissionFrame | null } = { frame: null };
