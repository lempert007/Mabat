import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { missionLive } from '@/store/missionLive';
import { useMissionStore } from '@/store/missionStore';
import { actorName } from '@/lib/mission/names';
import { gatherTags, type TagSpot } from '@/lib/mission/tags';
import type { MissionPlan } from '@/lib/mission/types';
import type { Mission } from '@/types/api';
import { t } from '@/i18n/he';

interface MissionTagsProps {
  mission: Mission;
  plan: MissionPlan;
}

interface Tagged {
  label: string;
  color: string;
  /** Its size in world units, to judge how big it looks. */
  size: number;
}

/** Below this many pixels across, a vehicle is a speck and its name is shown over it. */
const SPECK = 34;
/** Roughly how wide a tag is: its dot and padding, and each letter of its name, px. */
const tagWidth = (label: string) => 34 + 6 * label.length;

const TOP_LEFT = (): [number, number] => [0, 0];
const UP = new Vector3(0, 1, 0);

/**
 * Name tags for the carrier and everything on the ground, shown only while a vehicle is too
 * small on screen to pick out, the way an air-traffic display labels its contacts.
 *
 * Tags that would overlap become one that lists its vehicles top to bottom, so a rover carrying
 * a parcel carrying a drone reads as one stack rather than three tags on top of each other. Each
 * tag stands over the top of the highest of its vehicles. While the mission is edited, the actor
 * being worked on goes without, since its path and keyframes are labelled already.
 *
 * Which vehicles share a tag changes rarely and is React state; where the tags are is written
 * straight into their style.
 */
export function MissionTags({ mission, plan }: MissionTagsProps) {
  const camera = useThree((s) => s.camera);
  const tagged = useMemo<Tagged[]>(
    () => [
      { label: mission.carrier.name || t.mission.carrier, color: mission.carrier.color, size: plan.carrier.size },
      ...plan.cast.map(({ actor, size }, i) => ({ label: actorName(mission, i), color: actor.color, size })),
    ],
    [mission, plan],
  );
  const [groups, setGroups] = useState<number[][]>([]);
  const elements = useRef<(HTMLDivElement | null)[]>([]);
  const spots = useRef(new Map<number, TagSpot>());
  const last = useRef<number[][]>([]);
  const world = useMemo(() => new Vector3(), []);
  const up = useMemo(() => new Vector3(), []);

  useFrame(({ size }) => {
    const frame = missionLive.frame;
    if (!frame) return;
    camera.updateMatrixWorld();
    const fov = camera instanceof PerspectiveCamera ? camera.fov : 45;
    const focal = size.height / (2 * Math.tan(MathUtils.degToRad(fov) / 2));

    // Where the top of each vehicle is on screen, if it is small enough there to need a tag.
    const { editing, selected } = useMissionStore.getState();
    const worked = editing ? selected?.actor : undefined;
    spots.current.clear();
    tagged.forEach((thing, i) => {
      if (i === 0) world.copy(frame.carrier).addScaledVector(UP, plan.carrier.half);
      else {
        const pose = frame.actors[i - 1];
        if (!pose || (pose.attached && frame.payout < 0.05) || plan.cast[i - 1].actor.id === worked) return;
        world.copy(pose.position).addScaledVector(up.copy(UP).applyQuaternion(pose.quaternion), plan.cast[i - 1].half);
      }
      const distance = camera.position.distanceTo(world);
      world.project(camera);
      if (world.z > 1 || (thing.size / distance) * focal >= SPECK) return;
      spots.current.set(i, { x: (world.x * 0.5 + 0.5) * size.width, y: (-world.y * 0.5 + 0.5) * size.height, width: tagWidth(thing.label) });
    });

    const next = gatherTags(spots.current, last.current);
    if (JSON.stringify(next) !== JSON.stringify(last.current)) setGroups(next);
    last.current = next;
    next.forEach((members, g) => place(elements.current[g], spots.current.get(members[0])));
  });

  return (
    <Html calculatePosition={TOP_LEFT} style={{ left: 0, top: 0 }} zIndexRange={[10, 0]}>
      {groups.map((members, g) => (
        <div
          key={members.join(',')}
          ref={(element) => {
            elements.current[g] = element;
            place(element, spots.current.get(members[0]));
          }}
          className="pointer-events-none absolute left-0 top-0"
        >
          <div className="flex -translate-x-1/2 -translate-y-full flex-col items-center pb-1 transition-opacity duration-300 starting:opacity-0">
            <div className="flex flex-col gap-0.5 rounded-xl glass px-2.5 py-1 text-[11px] font-medium text-fg">
              {members.map((i) => (
                <span key={i} className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tagged[i]?.color }} />
                  {tagged[i]?.label}
                </span>
              ))}
            </div>
            <span className="h-3 w-px bg-white/40" />
          </div>
        </div>
      ))}
    </Html>
  );
}

/** Puts a tag's foot on a point of the screen. */
function place(element: HTMLDivElement | null, at: { x: number; y: number } | undefined) {
  if (element && at) element.style.transform = `translate3d(${Math.round(at.x)}px, ${Math.round(at.y)}px, 0)`;
}
