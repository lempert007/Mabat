import {
  ArrowDownToLine,
  Crosshair,
  Navigation,
  PackageOpen,
  PlaneLanding,
  PlaneTakeoff,
  Route,
  ChevronsUp,
  type LucideIcon,
} from 'lucide-react';
import { fill } from '@/lib/interpolate';
import { formatClock, formatMeasure } from '@/lib/format';
import { movers } from '@/lib/mission/names';
import type { MissionPlan } from '@/lib/mission/types';
import type { Mission, StageKind } from '@/types/api';
import { t } from '@/i18n/he';

export const STAGE_ICONS: Record<StageKind, LucideIcon> = {
  takeoff: PlaneTakeoff,
  cruise: Navigation,
  approach: Crosshair,
  lower: ArrowDownToLine,
  onsite: PackageOpen,
  raise: ChevronsUp,
  return: Route,
  land: PlaneLanding,
};

/** What the audience reads for a stage: the editor's words where they wrote some. */
export function stageTitle(mission: Mission, kind: StageKind): string {
  return mission.stages[kind]?.title || t.mission.stages[kind];
}

export function stageCaption(mission: Mission, kind: StageKind): string {
  return mission.stages[kind]?.caption || t.mission.captions[kind];
}

const facts = t.mission.facts;
const number = (value: number, decimals = 0) => formatMeasure(value, decimals);

/** The numbers behind a stage, worked out from the mission so they always match the flight. */
export function stageFacts(mission: Mission, plan: MissionPlan, kind: StageKind): string[] {
  const payout = Math.min(plan.tetherNeeded, mission.tetherLength);
  switch (kind) {
    case 'takeoff':
      return [fill(facts.altitude, { value: number(mission.cruiseAltitude) }), fill(facts.climb, { value: number(mission.climbRate) })];
    case 'cruise':
    case 'return':
      return [
        fill(facts.distance, { value: number(plan.routeLength / 1000, 2) }),
        fill(facts.speed, { value: number(mission.cruiseSpeed * 3.6) }),
        fill(facts.altitude, { value: number(mission.cruiseAltitude) }),
      ];
    case 'approach':
      return [fill(facts.hover, { value: number(mission.hoverAltitude) })];
    case 'lower':
      return [fill(facts.tether, { value: number(payout) }), fill(facts.winch, { value: number(mission.winchSpeed, 1) })];
    case 'onsite': {
      const moving = mission.actors.some((actor) => actor.keys.length > 0);
      const stage = plan.stages.find((s) => s.kind === 'onsite');
      return [...(moving ? [movers(mission)] : []), fill(facts.onsite, { value: formatClock(stage?.duration ?? 0) })];
    }
    case 'raise':
      return [fill(facts.winch, { value: number(mission.winchSpeed, 1) })];
    case 'land':
      return [];
  }
}
