import { useRef, useState, type PointerEvent } from 'react';
import { TimelineLane, type Grip } from './TimelineLane';
import { useSceneEditor } from '@/hooks/useSceneEditor';
import { useMissionStore } from '@/store/missionStore';
import { TRACK_COLORS } from '@/lib/mission/defaults';
import { leaveTime } from '@/lib/mission/cast';
import { removeKey, retimeKey, roundTime, setHold, setLeaves } from '@/lib/mission/keys';
import { actorName } from '@/lib/mission/names';
import { formatClock } from '@/lib/format';
import { fill } from '@/lib/interpolate';
import { cn } from '@/lib/cn';
import type { MissionChange } from '@/hooks/useMissionSettings';
import type { MissionPlan } from '@/lib/mission/types';
import type { Actor, Mission } from '@/types/api';
import { t } from '@/i18n/he';

interface SceneTimelineProps {
  plan: MissionPlan;
  mission: Mission;
  update: (change: MissionChange) => void;
}

const copy = t.mission.scene;
/** A drag lands on another actor's moment when it comes this close, in pixels. */
const SNAP = 7;
const TICKS = [1, 2, 5, 10, 15, 30, 60, 120];

/** Where a rider gets off, for the timeline, or null when it never does. */
const leavesOf = (actor: Actor) => (actor.rides !== null && actor.rides !== 'hook' ? (actor.keys.length ? leaveTime(actor) : Infinity) : null);

/**
 * The ground, against time: one lane per actor from the moment the load touches down, with the
 * playhead running across them all. Dragging a keyframe retimes it, and it snaps to any other
 * actor's keyframe it comes close to, which is how two things are made to happen together.
 * Pressing the ruler or an empty stretch of lane moves the clock there.
 *
 * Like the stage timeline it runs left to right in a right-to-left interface, because it stands
 * for the direction of play.
 */
export function SceneTimeline({ plan, mission, update }: SceneTimelineProps) {
  const time = useMissionStore((s) => s.time);
  const selected = useMissionStore((s) => s.selected);
  const editor = useSceneEditor(plan, update);
  const ruler = useRef<HTMLDivElement>(null);
  const grip = useRef<Grip | null>(null);
  const [guide, setGuide] = useState<number | null>(null);

  const ends = mission.actors.flatMap((actor) => actor.keys.map((key) => key.at + key.hold));
  const span = Math.max(plan.stages.find((stage) => stage.kind === 'onsite')?.duration ?? 0, Math.max(0, ...ends) + 3, 10);
  const x = (seconds: number) => Math.min(Math.max(seconds / span, 0), 1) * 100;
  const tick = TICKS.find((step) => span / step <= 8) ?? 300;
  const playhead = time - plan.onsite;

  const timeAt = (clientX: number) => {
    const rect = ruler.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1) * span;
  };

  /** Pulls a moment onto any other actor's moment, or the playhead, when it is close enough. */
  const snap = (seconds: number, held: Grip) => {
    const width = ruler.current?.getBoundingClientRect().width ?? 1;
    const reach = (SNAP / width) * span;
    const marks = [0, playhead];
    for (const actor of mission.actors) {
      actor.keys.forEach((key, k) => {
        if (actor.id === held.actor && 'key' in held && held.key === k) return;
        marks.push(key.at, key.at + key.hold);
      });
      const leaves = leavesOf(actor);
      if (leaves !== null && Number.isFinite(leaves) && !(actor.id === held.actor && held.part === 'leave')) marks.push(leaves);
    }
    const nearest = marks.reduce((best, mark) => (Math.abs(mark - seconds) < Math.abs(best - seconds) ? mark : best), Infinity);
    const snapped = Math.abs(nearest - seconds) <= reach;
    setGuide(snapped ? nearest : null);
    return snapped ? nearest : roundTime(seconds);
  };

  const scrub = (event: PointerEvent<HTMLElement>) => {
    const store = useMissionStore.getState();
    store.pause();
    store.seek(plan.onsite + timeAt(event.clientX));
  };

  const drag = (clientX: number) => {
    const held = grip.current;
    const actor = held && mission.actors.find((a) => a.id === held.actor);
    if (!held || !actor) return;
    const at = snap(timeAt(clientX), held);
    if (held.part === 'leave') editor.changeActor(actor.id, (current) => setLeaves(current, at));
    else if (held.part === 'hold') editor.changeActor(actor.id, (current) => setHold(current, held.key, at - current.keys[held.key].at));
    else {
      editor.changeActor(actor.id, (current) => retimeKey(current, held.key, at));
      useMissionStore.getState().seek(plan.onsite + at);
    }
  };

  const grab = (held: Grip, event: PointerEvent<HTMLElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    grip.current = held;
    const actor = mission.actors.find((a) => a.id === held.actor);
    if (actor) editor.selectKey(actor, 'key' in held ? held.key : null);
  };

  const release = () => {
    grip.current = null;
    setGuide(null);
  };

  const nudge = (actor: Actor, key: number, by: number) => {
    const at = roundTime(actor.keys[key].at + by);
    editor.changeActor(actor.id, (current) => retimeKey(current, key, at));
    useMissionStore.getState().seek(plan.onsite + at);
  };

  const ridingLabel = (actor: Actor) => {
    if (actor.rides === 'hook') return actor.staysHooked ? copy.onRopeBar : null;
    if (actor.rides === null) return null;
    const ride = mission.actors.findIndex((a) => a.id === actor.rides);
    return ride === -1 ? null : fill(copy.riding, { name: actorName(mission, ride) });
  };

  const empty = mission.actors.every((actor) => actor.keys.length === 0);

  return (
    <div
      dir="ltr"
      className="flex flex-col gap-0.5 border-b border-line pb-2"
      onPointerMove={(event) => grip.current && drag(event.clientX)}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div className="flex h-5 items-center gap-2">
        <span dir="rtl" className="w-28 shrink-0 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-3">
          {copy.timeline}
        </span>
        <div
          ref={ruler}
          className="relative h-full flex-1 cursor-ew-resize touch-none"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            scrub(event);
          }}
          onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && scrub(event)}
        >
          {Array.from({ length: Math.floor(span / tick) + 1 }, (_, i) => (
            <span key={i} className={cn('absolute bottom-0 text-[10px] tabular-nums text-fg-4', i > 0 && '-translate-x-1/2')} style={{ left: `${x(i * tick)}%` }}>
              {formatClock(i * tick)}
            </span>
          ))}
        </div>
      </div>

      <div className="relative">
        {mission.actors.map((actor, i) => (
          <div key={actor.id} onPointerDown={scrub} className="touch-none">
            <TimelineLane
              actor={actor}
              name={actorName(mission, i)}
              color={TRACK_COLORS[i % TRACK_COLORS.length]}
              x={x}
              leaves={leavesOf(actor)}
              ridingLabel={ridingLabel(actor)}
              selectedKey={selected?.actor === actor.id ? selected.key : null}
              onGrab={grab}
              onNudge={(key, by) => nudge(actor, key, by)}
              onRemove={(key) => editor.changeActor(actor.id, (current) => removeKey(current, key))}
            />
          </div>
        ))}
        <div className="pointer-events-none absolute inset-y-0 start-[7.5rem] end-0">
          {playhead >= 0 && playhead <= span && <span className="absolute inset-y-0 w-px bg-accent" style={{ left: `${x(playhead)}%` }} />}
          {guide !== null && <span className="absolute inset-y-0 w-px bg-white/60" style={{ left: `${x(guide)}%` }} />}
        </div>
        {empty && (
          <p dir="rtl" className="pointer-events-none absolute inset-y-0 start-[7.5rem] end-0 flex items-center justify-center text-[12px] text-fg-4">
            {copy.timelineEmpty}
          </p>
        )}
      </div>
    </div>
  );
}
