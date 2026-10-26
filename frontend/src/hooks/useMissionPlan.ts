import { useMemo } from 'react';
import { buildPlan } from '@/lib/mission/plan';
import type { MissionPlan } from '@/lib/mission/types';
import { modelSite } from '@/lib/model';
import { useMissionStore } from '@/store/missionStore';
import type { Project } from '@/types/api';

/**
 * The project's mission, planned. Rebuilt only when something that moves changes: editing a
 * stage's title or caption leaves the plan, and everything drawn from it, as it was.
 */
export function useMissionPlan(project: Project): MissionPlan | null {
  const mission = project.settings.mission;
  const heights = useMissionStore((s) => s.heights);
  const flight = mission && JSON.stringify({ ...mission, stages: null, carrier: { ...mission.carrier, name: '' }, droid: { ...mission.droid, name: '' } });
  const { modelStats, settings } = project;

  return useMemo(
    () => (mission ? buildPlan(mission, modelSite(project), heights) : null),
    // `flight` stands for the mission minus its words.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flight, heights, modelStats, settings.modelRotation],
  );
}
