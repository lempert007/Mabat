import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { NumberField } from '@/components/ui/NumberField';
import { ModelOrientation } from '@/components/viewer/ModelOrientation';
import { ModelUpload } from './ModelUpload';
import { LiveryPicker } from './LiveryPicker';
import type { MissionChange } from '@/hooks/useMissionSettings';
import type { Mission, Vehicle } from '@/types/api';
import { t } from '@/i18n/he';

interface CarrierCardProps {
  projectId: string;
  mission: Mission;
  update: (change: MissionChange) => void;
}

const copy = t.mission.panel;

/** The carrier: its name in the show, its model, its real size and its colour. */
export function CarrierCard({ projectId, mission, update }: CarrierCardProps) {
  const carrier = mission.carrier;
  const change = (patch: Partial<Vehicle>) => update((current) => ({ carrier: { ...current.carrier, ...patch } }));

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-white/3 p-4">
      <header className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold tracking-title">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: carrier.color }} />
          {t.mission.carrier}
        </h3>
        <Badge tone={carrier.model ? 'accent' : 'neutral'}>{carrier.model ? copy.uploaded : copy.builtIn}</Badge>
      </header>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-fg-2">{copy.name}</span>
        <Input value={carrier.name} placeholder={t.mission.carrier} maxLength={60} onChange={(event) => change({ name: event.target.value })} />
      </label>
      <NumberField
        label={carrier.model ? copy.size : copy.wingspan}
        value={carrier.size}
        min={1}
        max={15}
        step={0.1}
        limits={[0.05, 100]}
        unit={t.mission.units.m}
        onChange={(size) => change({ size })}
      />
      {carrier.model ? (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-fg-2">{copy.orientation}</span>
          <p className="text-[12px] text-fg-4">{copy.orientationHint}</p>
          <ModelOrientation rotation={carrier.rotation} onChange={(rotation) => change({ rotation })} />
        </div>
      ) : (
        <LiveryPicker value={carrier.color} onChange={(color) => change({ color })} />
      )}
      <ModelUpload projectId={projectId} model={carrier.model} onChange={(model) => change({ model, rotation: null })} />
    </section>
  );
}
