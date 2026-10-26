import { Goal, MapPin, Plus, Warehouse, Waypoints } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { NumberField } from '@/components/ui/NumberField';
import { PanelSection } from '@/components/viewer/PanelSection';
import { PlaceRow } from './PlaceRow';
import { useMissionStore } from '@/store/missionStore';
import { useViewerStore } from '@/store/viewerStore';
import { modelWidth } from '@/lib/model';
import { aerialPose } from '@/lib/vec';
import { fill } from '@/lib/interpolate';
import type { MissionChange } from '@/hooks/useMissionSettings';
import type { MissionPlan } from '@/lib/mission/types';
import type { Mission, Project, Vec3 } from '@/types/api';
import { t } from '@/i18n/he';

interface RouteTabProps {
  project: Project;
  mission: Mission;
  plan: MissionPlan | null;
  update: (change: MissionChange) => void;
}

const copy = t.mission.panel;

/** How far back the camera stands to look at each kind of place, metres. */
const VIEW_DISTANCE = { drop: 28, hover: 34, hub: 36, waypoint: 40 };

/** Where the mission happens: the drop, the hover, the hub, the way there, and the scale. */
export function RouteTab({ project, mission, plan, update }: RouteTabProps) {
  const placing = useMissionStore((s) => s.placing);
  const setPlacing = useMissionStore((s) => s.setPlacing);
  const cameraApi = useViewerStore((s) => s.cameraApi);
  const width = modelWidth(project);
  const toggle = (target: typeof placing) => setPlacing(placing === target ? null : target);

  // The director would take the camera straight back, so looking at a place frees it first.
  const view = (point: Vec3 | null | undefined, meters: number) => {
    if (!point || !cameraApi) return;
    useMissionStore.getState().setCamera('free');
    cameraApi.flyTo(aerialPose(cameraApi.getPose().position, point, meters * mission.unitsPerMeter));
  };

  return (
    <div className="flex flex-col gap-7">
      <PanelSection title={copy.tabs.route}>
        <div className="flex flex-col gap-2">
          <PlaceRow
            icon={<Goal size={15} />}
            label={copy.drop}
            status={mission.drop ? copy.set : t.mission.placing.drop}
            set={Boolean(mission.drop)}
            active={placing === 'drop'}
            onPlace={() => toggle('drop')}
            onView={() => view(mission.drop, VIEW_DISTANCE.drop)}
          />
          <PlaceRow
            icon={<MapPin size={15} />}
            label={copy.hover}
            status={mission.hover ? copy.set : copy.hoverDefault}
            set={Boolean(mission.hover)}
            active={placing === 'hover'}
            onPlace={() => toggle('hover')}
            onView={() => view(plan?.hover, VIEW_DISTANCE.hover)}
            onClear={() => update({ hover: null })}
          />
          <PlaceRow
            icon={<Warehouse size={15} />}
            label={copy.hub}
            status={mission.hub ? copy.set : copy.hubDefault}
            set={Boolean(mission.hub)}
            active={placing === 'hub'}
            onPlace={() => toggle('hub')}
            onView={() => view(mission.hub, VIEW_DISTANCE.hub)}
            onClear={() => update({ hub: null })}
          />
        </div>
      </PanelSection>

      <PanelSection title={copy.waypoints} hint={mission.waypoints.length === 0 ? copy.waypointsDefault : undefined}>
        <div className="flex flex-col gap-2">
          {mission.waypoints.map((point, index) => (
            <PlaceRow
              key={index}
              icon={<span className="text-[12px] font-semibold tabular-nums">{index + 1}</span>}
              label={fill(copy.waypoint, { index: index + 1 })}
              status={copy.set}
              set
              active={placing === index}
              onPlace={() => toggle(index)}
              onView={() => view(point, VIEW_DISTANCE.waypoint)}
              onClear={() => update((current) => ({ waypoints: current.waypoints.filter((__, i) => i !== index) }))}
            />
          ))}
          <Button
            size="sm"
            variant={placing === 'waypoint' ? 'primary' : 'secondary'}
            icon={placing === 'waypoint' ? <Waypoints size={14} /> : <Plus size={14} />}
            onClick={() => toggle('waypoint')}
            className="self-start"
          >
            {placing === 'waypoint' ? t.mission.placingDone : copy.addWaypoints}
          </Button>
        </div>
      </PanelSection>

      {width > 0 && (
        <PanelSection title={copy.scale} hint={copy.scaleHint}>
          <NumberField
            label={copy.modelWidth}
            value={width / mission.unitsPerMeter}
            min={20}
            max={3000}
            step={1}
            limits={[1, 100000]}
            unit={t.mission.units.m}
            onChange={(meters) => update({ unitsPerMeter: width / meters })}
          />
        </PanelSection>
      )}
    </div>
  );
}
