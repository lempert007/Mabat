import { useState } from 'react';
import { Goal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DraggablePanel } from '@/components/ui/DraggablePanel';
import { Segmented } from '@/components/ui/Segmented';
import { RouteTab } from './RouteTab';
import { FlightTab } from './FlightTab';
import { SceneTab } from './SceneTab';
import { StagesTab } from './StagesTab';
import { NoiseTab } from './NoiseTab';
import { useMissionStore, type MissionTab } from '@/store/missionStore';
import { newMission } from '@/lib/mission/defaults';
import { formatClock } from '@/lib/format';
import type { MissionChange } from '@/hooks/useMissionSettings';
import type { MissionPlan } from '@/lib/mission/types';
import type { Mission, Project } from '@/types/api';
import { t } from '@/i18n/he';

const TABS: MissionTab[] = ['route', 'flight', 'scene', 'stages', 'noise'];

interface MissionPanelProps {
  open: boolean;
  onClose: () => void;
  project: Project;
  mission: Mission | null;
  plan: MissionPlan | null;
  update: (change: MissionChange) => void;
  remove: () => void;
  onPreviewStage: (index: number) => void;
}

const copy = t.mission.panel;

/**
 * Where the editor builds the mission. Like the scene settings it floats over the model without
 * a backdrop, so every change can be watched taking effect, and it saves as it goes.
 *
 * A project without a mission starts from one question: where does the rope set down. Everything
 * else has a sensible default, so one click makes a mission that plays.
 */
export function MissionPanel({ open, onClose, project, mission, plan, update, remove, onPreviewStage }: MissionPanelProps) {
  const tab = useMissionStore((s) => s.tab);
  const setTab = useMissionStore((s) => s.setTab);
  const [confirming, setConfirming] = useState(false);
  const placing = useMissionStore((s) => s.placing);
  const setPlacing = useMissionStore((s) => s.setPlacing);
  const playable = mission && plan;
  const shown = mission ?? newMission();

  return (
    <>
      <DraggablePanel
        open={open}
        onClose={onClose}
        title={copy.title}
        storageKey="mission-panel"
        side="end"
        footer={
          playable ? (
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-fg-3">
                {copy.duration} <bdi className="ms-1 font-semibold tabular-nums text-fg">{formatClock(plan.duration)}</bdi>
              </span>
              <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={() => setConfirming(true)}>
                {copy.remove}
              </Button>
            </div>
          ) : undefined
        }
      >
        {!playable ? (
          <div className="flex flex-col items-center gap-4 px-2 py-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
              <Goal size={26} />
            </span>
            <p className="max-w-[17rem] text-[14px] leading-relaxed text-fg-2 text-balance">{copy.start}</p>
            <Button variant="primary" icon={<Goal size={16} />} onClick={() => setPlacing(placing === 'drop' ? null : 'drop')}>
              {copy.startButton}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <Segmented<MissionTab>
              size="sm"
              value={tab}
              onChange={setTab}
              options={TABS.map((value) => ({ value, label: copy.tabs[value] }))}
            />
            {tab === 'route' && <RouteTab project={project} mission={shown} plan={plan} update={update} />}
            {tab === 'flight' && <FlightTab projectId={project.id} mission={shown} plan={plan} update={update} />}
            {tab === 'scene' && <SceneTab projectId={project.id} mission={shown} plan={plan} update={update} />}
            {tab === 'stages' && <StagesTab plan={plan} mission={shown} update={update} onPreview={onPreviewStage} />}
            {tab === 'noise' && <NoiseTab mission={shown} update={update} />}
          </div>
        )}
      </DraggablePanel>
      <ConfirmDialog
        open={confirming}
        title={copy.removeTitle}
        body={copy.removeBody}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          remove();
        }}
      />
    </>
  );
}
