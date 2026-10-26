import { StageCard } from './StageCard';
import { TelemetryPanel } from './TelemetryPanel';
import { MissionPlayer } from './MissionPlayer';
import { ViewerBottomBar } from '@/components/viewer/ViewerBottomBar';
import { useMissionStore } from '@/store/missionStore';
import type { MissionChange } from '@/hooks/useMissionSettings';
import type { MissionPlan } from '@/lib/mission/types';
import type { Mission } from '@/types/api';

interface MissionHudProps {
  plan: MissionPlan;
  mission: Mission;
  stage: number;
  onStep: (delta: 1 | -1) => void;
  /** A point's panel is open on the side the telemetry uses. */
  telemetryHidden: boolean;
  /** For an editor, who can retime the ground from the player. */
  update?: (change: MissionChange) => void;
}

/** What the audience reads while the mission plays: the narration, the readout and the player. */
export function MissionHud({ plan, mission, stage, onStep, telemetryHidden, update }: MissionHudProps) {
  // The ground's timeline takes the room the narration sits in while it is open.
  const sceneOpen = useMissionStore((s) => s.editing && s.tab === 'scene');
  return (
    <>
      {!sceneOpen && <StageCard plan={plan} mission={mission} current={stage} />}
      {!telemetryHidden && <TelemetryPanel plan={plan} mission={mission} />}
      <ViewerBottomBar>
        <MissionPlayer plan={plan} mission={mission} current={stage} onStep={onStep} update={update} />
      </ViewerBottomBar>
    </>
  );
}
