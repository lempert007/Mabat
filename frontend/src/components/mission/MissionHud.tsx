import { StageCard } from './StageCard';
import { TelemetryPanel } from './TelemetryPanel';
import { MissionPlayer } from './MissionPlayer';
import { ViewerBottomBar } from '@/components/viewer/ViewerBottomBar';
import type { MissionPlan } from '@/lib/mission/types';
import type { Mission } from '@/types/api';

interface MissionHudProps {
  plan: MissionPlan;
  mission: Mission;
  stage: number;
  onStep: (delta: 1 | -1) => void;
  /** A point's panel is open on the side the telemetry uses. */
  telemetryHidden: boolean;
}

/** What the audience reads while the mission plays: the narration, the readout and the player. */
export function MissionHud({ plan, mission, stage, onStep, telemetryHidden }: MissionHudProps) {
  return (
    <>
      <StageCard plan={plan} mission={mission} current={stage} />
      {!telemetryHidden && <TelemetryPanel plan={plan} mission={mission} />}
      <ViewerBottomBar>
        <MissionPlayer plan={plan} mission={mission} current={stage} onStep={onStep} />
      </ViewerBottomBar>
    </>
  );
}
