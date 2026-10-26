import { StageEditor } from './StageEditor';
import type { MissionChange } from '@/hooks/useMissionSettings';
import type { MissionPlan } from '@/lib/mission/types';
import type { Mission } from '@/types/api';
import { t } from '@/i18n/he';

interface StagesTabProps {
  plan: MissionPlan;
  mission: Mission;
  update: (change: MissionChange) => void;
  onPreview: (index: number) => void;
}

/** The story the audience is told, stage by stage. */
export function StagesTab({ plan, mission, update, onPreview }: StagesTabProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] leading-relaxed text-fg-4">{t.mission.panel.stagesHint}</p>
      {plan.stages.map((stage, index) => (
        <StageEditor key={stage.kind} stage={stage} index={index} mission={mission} update={update} onPreview={() => onPreview(index)} />
      ))}
    </div>
  );
}
