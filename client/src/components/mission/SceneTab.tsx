import { useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PanelSection } from '@/components/viewer/PanelSection';
import { ActorCard } from './ActorCard';
import { KIND_ICONS } from './actorMeta';
import { useSceneEditor } from '@/hooks/useSceneEditor';
import { useMissionStore } from '@/store/missionStore';
import { ACTOR_KINDS, TRACK_COLORS, newActor } from '@/lib/mission/defaults';
import type { MissionChange } from '@/hooks/useMissionSettings';
import type { MissionPlan } from '@/lib/mission/types';
import type { Actor, ActorKind, Mission } from '@/types/api';
import { t } from '@/i18n/he';

interface SceneTabProps {
  projectId: string;
  mission: Mission;
  plan: MissionPlan;
  update: (change: MissionChange) => void;
}

const copy = t.mission.scene;
const MAX_ACTORS = 8;

/**
 * What happens on the ground once the rope has set its load down. Each actor is something the
 * editor adds, what it arrives on, and the keyframes it moves through; the timeline under the
 * player shows them all against each other.
 */
export function SceneTab({ projectId, mission, plan, update }: SceneTabProps) {
  const editor = useSceneEditor(plan, update);
  // Once, as the tab opens: later edits must not pull the clock or the camera away.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => editor.showGround(), []);

  // Whatever is added comes down with the load: on the rope if it is free, otherwise riding the
  // load, on top of something that drives and under something that flies. Tracing starts at
  // once, because where it goes is the point of adding it.
  const add = (kind: ActorKind) => {
    const load = mission.actors.find((actor) => actor.rides === 'hook');
    const actor: Actor = {
      ...newActor(kind, load ? load.id : 'hook', mission.actors.map((a) => a.id)),
      mount: load?.kind === 'drone' ? 'below' : 'above',
    };
    update((current) => ({ actors: [...current.actors, actor] }));
    editor.showGround();
    const store = useMissionStore.getState();
    store.select({ actor: actor.id, key: null });
    store.setPlacing({ actor: actor.id });
  };

  // Whatever rode the actor taken away now rides what it rode.
  const remove = (gone: Actor) => {
    const store = useMissionStore.getState();
    store.setPlacing(null);
    store.select(null);
    update((current) => ({
      actors: current.actors
        .filter((actor) => actor.id !== gone.id)
        .map((actor) => (actor.rides === gone.id ? { ...actor, rides: gone.rides, mount: gone.mount } : actor)),
    }));
  };

  return (
    <PanelSection title={t.mission.panel.tabs.scene} hint={copy.hint}>
      <div className="flex flex-col gap-2">
        {mission.actors.map((actor, index) => (
          <ActorCard
            key={actor.id}
            projectId={projectId}
            mission={mission}
            plan={plan}
            index={index}
            color={TRACK_COLORS[index % TRACK_COLORS.length]}
            editor={editor}
            onRemove={() => remove(actor)}
          />
        ))}
        {mission.actors.length < MAX_ACTORS && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-[12px] text-fg-3">
              <Plus size={13} />
              {copy.add}
            </span>
            {ACTOR_KINDS.map((kind) => {
              const Icon = KIND_ICONS[kind];
              return (
                <Button key={kind} size="sm" variant="secondary" icon={<Icon size={14} />} onClick={() => add(kind)}>
                  {t.mission.kinds[kind]}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </PanelSection>
  );
}
