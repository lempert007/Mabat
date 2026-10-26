import { ChevronDown, Crosshair, PenLine, Trash2 } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { NumberField } from '@/components/ui/NumberField';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { ModelOrientation } from '@/components/viewer/ModelOrientation';
import { ModelUpload } from './ModelUpload';
import { LiveryPicker } from './LiveryPicker';
import { KeyRow } from './KeyRow';
import { KIND_ICONS } from './actorMeta';
import { actorTarget, useMissionStore } from '@/store/missionStore';
import { ACTOR_KINDS, ACTOR_PRESETS } from '@/lib/mission/defaults';
import { facingAt, legSpeed, removeKey, setLeaves } from '@/lib/mission/keys';
import { actorName } from '@/lib/mission/names';
import { counted } from '@/lib/counted';
import { fill } from '@/lib/interpolate';
import { cn } from '@/lib/cn';
import type { useSceneEditor } from '@/hooks/useSceneEditor';
import type { MissionPlan } from '@/lib/mission/types';
import type { Actor, ActorKind, Mission } from '@/types/api';
import { t } from '@/i18n/he';

interface ActorCardProps {
  projectId: string;
  mission: Mission;
  plan: MissionPlan;
  index: number;
  color: string;
  editor: ReturnType<typeof useSceneEditor>;
  onRemove: () => void;
}

const copy = t.mission.scene;
const panel = t.mission.panel;

/** What an actor can start on: the rope while it is free, any actor that is not riding it, or the model. */
function rideOptions(mission: Mission, actor: Actor) {
  const ridesThis = (other: Actor): boolean =>
    other.id === actor.id || (other.rides !== null && other.rides !== 'hook' && ridesThis(mission.actors.find((a) => a.id === other.rides) ?? actor));
  const ropeTaken = mission.actors.some((other) => other.rides === 'hook' && other.id !== actor.id);
  return [
    ...(ropeTaken ? [] : [{ value: 'hook', label: copy.onRope }]),
    ...mission.actors.flatMap((other, i) =>
      ridesThis(other) ? [] : [{ value: other.id, label: fill(copy.onActor, { name: actorName(mission, i) }) }],
    ),
    { value: '', label: copy.onModel },
  ];
}

/**
 * One actor on the ground. Closed it says what it is, what it starts on and how many keyframes
 * it has; open it holds everything about it, down to each keyframe.
 */
export function ActorCard({ projectId, mission, plan, index, color, editor, onRemove }: ActorCardProps) {
  const actor = mission.actors[index];
  const selected = useMissionStore((s) => s.selected);
  const placing = useMissionStore((s) => s.placing);
  const open = selected?.actor === actor.id;
  const following = useMissionStore((s) => open && s.camera === 'follow');
  const target = actorTarget(placing);
  const tracing = target?.actor === actor.id && target.key === undefined;
  const Icon = KIND_ICONS[actor.kind];
  const change = (patch: Partial<Actor> | ((actor: Actor) => Actor)) =>
    editor.changeActor(actor.id, (current) => (typeof patch === 'function' ? patch(current) : { ...current, ...patch }));
  const onRope = actor.rides === 'hook';
  const onActor = actor.rides !== null && !onRope;
  const keysShown = !(onRope && actor.staysHooked);

  const startName = onRope
    ? copy.onRope
    : onActor
      ? fill(copy.onActor, { name: actorName(mission, mission.actors.findIndex((a) => a.id === actor.rides)) })
      : copy.onModel;
  const keysName = !keysShown
    ? copy.ridesUp
    : actor.keys.length
      ? counted(actor.keys.length, copy.oneKey, copy.keys)
      : actor.rides === null
        ? copy.needsPlace
        : copy.noKeys;

  const trace = () => {
    const store = useMissionStore.getState();
    if (tracing) return store.setPlacing(null);
    store.select({ actor: actor.id, key: null });
    store.setPlacing({ actor: actor.id });
  };

  const changeKind = (kind: ActorKind) => {
    const preset = ACTOR_PRESETS[kind];
    change({ kind, size: preset.size, color: preset.color, turns: preset.turns, followsSurface: preset.followsSurface });
  };

  return (
    <div className={cn('rounded-2xl border transition-colors duration-200', open ? 'border-line-strong bg-white/5' : 'border-line bg-white/3')}>
      <button
        type="button"
        onClick={() => useMissionStore.getState().select(open ? null : { actor: actor.id, key: null })}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start focus-ring"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: `${color}26`, color }}>
          <Icon size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{actorName(mission, index)}</span>
          <span className={cn('block truncate text-[12px]', keysShown && !actor.keys.length && actor.rides === null ? 'text-warning' : 'text-fg-3')}>
            {startName} · {keysName}
          </span>
        </span>
        <ChevronDown size={16} className={cn('shrink-0 text-fg-3 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="flex flex-col gap-4 px-3 pb-3">
          <Field label={panel.name}>
            <Input value={actor.name} maxLength={60} placeholder={t.mission.kinds[actor.kind]} onChange={(event) => change({ name: event.target.value })} />
          </Field>

          <Field label={copy.kind} hint={copy.kindHint}>
            <Segmented<ActorKind> size="sm" value={actor.kind} onChange={changeKind} options={ACTOR_KINDS.map((kind) => ({ value: kind, label: t.mission.kinds[kind] }))} />
          </Field>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-fg-2">{copy.look}</span>
              <Badge tone={actor.model ? 'accent' : 'neutral'}>{actor.model ? panel.uploaded : panel.builtIn}</Badge>
            </div>
            {actor.model ? (
              <>
                <p className="text-[12px] text-fg-4">{panel.orientationHint}</p>
                <ModelOrientation rotation={actor.rotation} onChange={(rotation) => change({ rotation })} />
              </>
            ) : (
              <LiveryPicker value={actor.color} onChange={(livery) => change({ color: livery })} />
            )}
            <ModelUpload projectId={projectId} model={actor.model} onChange={(model) => change({ model, rotation: null })} />
          </div>

          <NumberField label={panel.size} value={actor.size} min={0.1} max={6} step={0.05} limits={[0.05, 100]} unit={t.mission.units.m} onChange={(size) => change({ size })} />

          <Field label={copy.start}>
            <Select<string>
              value={actor.rides ?? ''}
              onChange={(rides) => change({ rides: rides || null })}
              options={rideOptions(mission, actor)}
            />
          </Field>
          {onActor && (
            <Field label={copy.mount}>
              <Segmented<Actor['mount']>
                size="sm"
                value={actor.mount}
                onChange={(mount) => change({ mount })}
                options={[
                  { value: 'below', label: copy.below },
                  { value: 'above', label: copy.above },
                ]}
              />
            </Field>
          )}
          {onActor && actor.keys.length > 0 && (
            <NumberField
              label={copy.leaves}
              value={actor.leaves}
              min={0}
              max={Math.max(actor.keys[0].at - 0.1, 0)}
              step={0.1}
              unit={t.mission.units.s}
              onChange={(leaves) => change((current) => setLeaves(current, leaves))}
            />
          )}
          {onRope && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-fg-2">{copy.staysHooked}</span>
              <Switch label={copy.staysHooked} checked={actor.staysHooked} onChange={(staysHooked) => change({ staysHooked })} />
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-fg-2">{copy.turns}</span>
            <Switch label={copy.turns} checked={actor.turns} onChange={(turns) => change({ turns })} />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-fg-2">{copy.followsSurface}</span>
              <Switch label={copy.followsSurface} checked={actor.followsSurface} onChange={(followsSurface) => change({ followsSurface })} />
            </div>
            <p className="text-[12px] leading-snug text-fg-3">{copy.followsSurfaceHint}</p>
          </div>

          {keysShown && (
            <div className="flex flex-col gap-1.5">
              {actor.keys.map((_, k) => (
                <KeyRow
                  key={k}
                  actor={actor}
                  index={k}
                  color={color}
                  selected={selected?.key === k}
                  moving={target?.actor === actor.id && target.key === k}
                  pace={legSpeed(plan, index, k)}
                  facing={facingAt(plan, index, k)}
                  onSelect={() => editor.selectKey(actor, selected?.key === k ? null : k)}
                  onView={() => editor.viewKey(actor, k)}
                  onMove={() => {
                    editor.selectKey(actor, k);
                    useMissionStore.getState().setPlacing({ actor: actor.id, key: k });
                  }}
                  onRemove={() => {
                    useMissionStore.getState().select({ actor: actor.id, key: null });
                    change((current) => removeKey(current, k));
                  }}
                  onEdit={change}
                />
              ))}
              <Button size="sm" variant={tracing ? 'primary' : 'secondary'} icon={<PenLine size={14} />} onClick={trace} className="mt-1 self-start">
                {tracing ? copy.tracing : actor.keys.length ? copy.traceMore : copy.trace}
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={onRemove} className="text-danger hover:text-danger">
              {copy.remove}
            </Button>
            <IconButton
              label={copy.follow}
              size="sm"
              active={following}
              onClick={() => useMissionStore.getState().setCamera(following ? 'free' : 'follow')}
            >
              <Crosshair size={15} />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
}
