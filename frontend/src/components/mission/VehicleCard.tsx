import { useRef, useState } from 'react';
import { Box, Undo2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumberField } from '@/components/ui/NumberField';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ModelOrientation } from '@/components/viewer/ModelOrientation';
import { useRemoveVehicle, useUploadVehicle } from '@/api/vehicles';
import { errorMessage } from '@/lib/errorMessage';
import { MODEL_ACCEPT } from '@/lib/uploadFormats';
import { toast } from '@/store/toastStore';
import { cn } from '@/lib/cn';
import type { MissionChange } from '@/hooks/useMissionSettings';
import type { Mission, Project, VehicleSlot } from '@/types/api';
import { t } from '@/i18n/he';

interface VehicleCardProps {
  slot: VehicleSlot;
  project: Project;
  mission: Mission;
  update: (change: MissionChange) => void;
}

const copy = t.mission.panel;

const LIVERIES: Record<VehicleSlot, string[]> = {
  carrier: ['#5b9cff', '#34c76f', '#f5b544', '#ff6b6b', '#b48cff', '#e8ecf2'],
  droid: ['#34c76f', '#5b9cff', '#f5b544', '#ff6b6b', '#b48cff', '#e8ecf2'],
  parcel: ['#c9a27a', '#a8774f', '#e8ecf2', '#5b9cff', '#34c76f', '#f5b544'],
};

const SIZES: Record<VehicleSlot, { min: number; max: number; step: number }> = {
  carrier: { min: 1, max: 15, step: 0.1 },
  droid: { min: 0.2, max: 3, step: 0.05 },
  parcel: { min: 0.1, max: 1.5, step: 0.05 },
};

/** One vehicle of the fleet: its name in the show, its model, its real size and its colour. */
export function VehicleCard({ slot, project, mission, update }: VehicleCardProps) {
  const vehicle = mission[slot];
  const uploaded = Boolean(project.vehicles[slot]);
  const upload = useUploadVehicle(project.id);
  const remove = useRemoveVehicle(project.id);
  const picker = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const change = (patch: Partial<Mission[VehicleSlot]>) => update((current) => ({ [slot]: { ...current[slot], ...patch } }));
  const range = SIZES[slot];

  const onPicked = (file: File | undefined) => {
    if (!file) return;
    setProgress(0);
    upload.mutate(
      { slot, file, onProgress: setProgress },
      {
        onSuccess: () => toast.success(copy.uploadDone),
        onError: (error) => toast.error(errorMessage(error)),
        onSettled: () => setProgress(null),
      },
    );
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-white/3 p-4">
      <header className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold tracking-title">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: vehicle.color }} />
          {t.mission.vehicles[slot]}
        </h3>
        <Badge tone={uploaded ? 'accent' : 'neutral'}>{uploaded ? copy.uploaded : copy.builtIn}</Badge>
      </header>

      {slot !== 'parcel' && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] text-fg-2">{copy.name}</span>
          <Input value={vehicle.name} placeholder={t.mission.vehicles[slot]} maxLength={60} onChange={(event) => change({ name: event.target.value })} />
        </label>
      )}

      <NumberField
        label={copy.size[slot]}
        value={vehicle.size}
        min={range.min}
        max={range.max}
        step={range.step}
        limits={[0.05, 100]}
        unit={t.mission.units.m}
        onChange={(size) => change({ size })}
      />

      {!uploaded && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-fg-2">{copy.livery}</span>
          <span className="flex items-center gap-1.5">
            {LIVERIES[slot].map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                aria-pressed={vehicle.color === color}
                onClick={() => change({ color })}
                className={cn(
                  'h-6 w-6 rounded-full border-2 transition-transform duration-200 hover:scale-110 focus-ring',
                  vehicle.color === color ? 'border-fg' : 'border-transparent',
                )}
                style={{ background: color }}
              />
            ))}
          </span>
        </div>
      )}

      {uploaded && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-fg-2">{copy.orientation}</span>
          <p className="text-[12px] text-fg-4">{copy.orientationHint}</p>
          <ModelOrientation rotation={vehicle.rotation} onChange={(rotation) => change({ rotation })} />
        </div>
      )}

      {progress !== null && <ProgressBar value={progress} />}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={uploaded ? <Box size={14} /> : <Upload size={14} />} loading={upload.isPending} onClick={() => picker.current?.click()}>
          {uploaded ? copy.replace : copy.upload}
        </Button>
        {uploaded && (
          <Button
            size="sm"
            variant="ghost"
            icon={<Undo2 size={14} />}
            loading={remove.isPending}
            onClick={() => remove.mutate(slot, { onError: (error) => toast.error(errorMessage(error)) })}
          >
            {copy.useBuiltIn}
          </Button>
        )}
      </div>
      <input
        ref={picker}
        type="file"
        className="hidden"
        accept={MODEL_ACCEPT}
        onChange={(event) => {
          onPicked(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </section>
  );
}
