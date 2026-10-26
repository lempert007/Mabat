import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { PanelSection } from '@/components/viewer/PanelSection';
import { NoiseZoneRow } from './NoiseZoneRow';
import { useMissionStore } from '@/store/missionStore';
import { useViewerStore } from '@/store/viewerStore';
import { extentOf, zoneColors } from '@/lib/mission/noise';
import { aerialPose } from '@/lib/vec';
import type { MissionChange } from '@/hooks/useMissionSettings';
import type { Mission, NoiseZone } from '@/types/api';
import { t } from '@/i18n/he';

interface NoiseTabProps {
  mission: Mission;
  update: (change: MissionChange) => void;
}

const copy = t.mission.noise;
const MAX_ZONES = 8;

/**
 * Where the flight can be heard. The editor traces each contour from the acoustic study onto
 * the ground, point by point, and the showcase draws the sound reaching out to it.
 */
export function NoiseTab({ mission, update }: NoiseTabProps) {
  const placing = useMissionStore((s) => s.placing);
  const setPlacing = useMissionStore((s) => s.setPlacing);
  const cameraApi = useViewerStore((s) => s.cameraApi);
  const shown = useMissionStore((s) => s.noiseShown);
  const setShown = useMissionStore((s) => s.setNoiseShown);
  const colors = zoneColors(mission.noise);
  const drawingZone = typeof placing === 'object' && placing !== null && placing.vertex === undefined ? placing.zone : null;

  const change = (index: number, zone: Partial<NoiseZone>) =>
    update((current) => ({ noise: current.noise.map((z, i) => (i === index ? { ...z, ...zone } : z)) }));

  const draw = (index: number) => {
    if (drawingZone === index) return setPlacing(null);
    change(index, { points: [] });
    setPlacing({ zone: index });
  };

  const add = () => {
    update((current) => ({ noise: [...current.noise, { label: '', points: [] }] }));
    setPlacing({ zone: mission.noise.length });
  };

  const remove = (index: number) => {
    if (placing !== null && typeof placing === 'object') setPlacing(null);
    update((current) => ({ noise: current.noise.filter((__, i) => i !== index) }));
  };

  // From high up, so the whole contour fits on screen.
  const view = (zone: NoiseZone) => {
    if (!cameraApi) return;
    const { center, reach } = extentOf(zone.points);
    const store = useMissionStore.getState();
    store.setCamera('free');
    store.setNoiseShown(true);
    cameraApi.flyTo(aerialPose(cameraApi.getPose().position, center, Math.max(reach * 2.4, 40 * mission.unitsPerMeter), 1.1));
  };

  return (
    <PanelSection title={copy.title} hint={copy.hint}>
      <div className="flex flex-col gap-2">
        {mission.noise.length > 0 && (
          <div className="flex items-center justify-between pb-1">
            <span className="text-[13px] text-fg-2">{copy.show}</span>
            <Switch label={copy.show} checked={shown} onChange={setShown} />
          </div>
        )}
        {mission.noise.map((zone, index) => (
          <NoiseZoneRow
            key={index}
            zone={zone}
            index={index}
            color={colors[index]}
            unitsPerMeter={mission.unitsPerMeter}
            drawing={drawingZone === index}
            onRename={(label) => change(index, { label })}
            onDraw={() => draw(index)}
            onView={() => view(zone)}
            onRemove={() => remove(index)}
          />
        ))}
        {mission.noise.length < MAX_ZONES && (
          <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={add} className="self-start">
            {copy.add}
          </Button>
        )}
        {mission.noise.length > 0 && <p className="text-[12px] text-fg-4">{copy.editHint}</p>}
      </div>
    </PanelSection>
  );
}
