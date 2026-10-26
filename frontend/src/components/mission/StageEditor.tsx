import { useState } from 'react';
import { ChevronDown, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { STAGE_ICONS } from './stageMeta';
import { DEFAULT_SHOTS } from '@/lib/mission/defaults';
import { fill } from '@/lib/interpolate';
import { formatClock } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { MissionChange } from '@/hooks/useMissionSettings';
import type { PlannedStage } from '@/lib/mission/types';
import type { CameraShot, Mission, StageText } from '@/types/api';
import { t } from '@/i18n/he';

interface StageEditorProps {
  stage: PlannedStage;
  index: number;
  mission: Mission;
  update: (change: MissionChange) => void;
  onPreview: () => void;
}

const SHOTS = Object.keys(t.mission.shots) as CameraShot[];
const copy = t.mission.panel;
/** A stage the editor has not written anything for yet. */
const BLANK: StageText = { title: '', caption: '', shot: null };

/** One stage's words and camera. Empty fields fall back to the defaults shown as placeholders. */
export function StageEditor({ stage, index, mission, update, onPreview }: StageEditorProps) {
  const [open, setOpen] = useState(false);
  const text = mission.stages[stage.kind] ?? BLANK;
  const Icon = STAGE_ICONS[stage.kind];
  const change = (patch: Partial<StageText>) =>
    update((current) => ({
      stages: { ...current.stages, [stage.kind]: { ...(current.stages[stage.kind] ?? BLANK), ...patch } },
    }));

  return (
    <div className="rounded-xl border border-line bg-white/3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-start focus-ring rounded-xl"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
          <Icon size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">
            <bdi className="me-1.5 tabular-nums text-fg-4">{index + 1}</bdi>
            {text.title || t.mission.stages[stage.kind]}
          </span>
          <span className="block text-[12px] tabular-nums text-fg-3">{formatClock(stage.duration)}</span>
        </span>
        <ChevronDown size={16} className={cn('shrink-0 text-fg-3 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="flex flex-col gap-3 px-3 pb-3">
          <Field label={copy.stageTitle}>
            <Input value={text.title} maxLength={80} placeholder={t.mission.stages[stage.kind]} onChange={(event) => change({ title: event.target.value })} />
          </Field>
          <Field label={copy.stageCaption}>
            <TextArea rows={3} value={text.caption} maxLength={600} placeholder={t.mission.captions[stage.kind]} onChange={(event) => change({ caption: event.target.value })} />
          </Field>
          <Field label={copy.stageShot}>
            <Select<CameraShot | ''>
              value={text.shot ?? ''}
              onChange={(shot) => change({ shot: shot || null })}
              options={[
                { value: '', label: fill(t.mission.shotAuto, { shot: t.mission.shots[DEFAULT_SHOTS[stage.kind]] }) },
                ...SHOTS.map((shot) => ({ value: shot, label: t.mission.shots[shot] })),
              ]}
            />
          </Field>
          <Button size="sm" variant="secondary" icon={<Play size={13} />} onClick={onPreview} className="self-start">
            {copy.preview}
          </Button>
        </div>
      )}
    </div>
  );
}
