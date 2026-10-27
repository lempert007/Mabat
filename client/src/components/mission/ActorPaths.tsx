import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Quaternion, Vector3 } from 'three';
import { PlaceLabel } from './PlaceLabel';
import { isTracing, useMissionStore } from '@/store/missionStore';
import { TRACK_COLORS } from '@/lib/mission/defaults';
import { footOf, normalOf } from '@/lib/mission/keys';
import { UP } from '@/lib/mission/track';
import { toVector3 } from '@/lib/vec';
import { formatCue } from '@/lib/format';
import type { MissionPlan } from '@/lib/mission/types';

/**
 * Where each actor goes, drawn while the mission is being edited: its path in its own colour,
 * and a handle at every keyframe. Something flying gets a stalk down to the spot it was set
 * over. Clicking a handle selects that keyframe and picks it up; the next click on the model
 * puts it down. The selected actor's keyframes carry their number and time, and an arrow for
 * the way it faces there. Keyframes in one place, such as a turn on the spot, share a label.
 */
export function ActorPaths({ plan }: { plan: MissionPlan }) {
  const selected = useMissionStore((s) => s.selected);
  const placing = useMissionStore((s) => s.placing);
  const u = plan.unitsPerMeter;
  const chosenIndex = plan.cast.findIndex((member) => member.actor.id === selected?.actor);

  // How the selected actor stands at each of its keyframes, read off the plan itself.
  const stances = useMemo(() => {
    if (chosenIndex === -1) return [];
    return plan.cast[chosenIndex].actor.keys.map((key) => plan.sample(plan.onsite + key.at).actors[chosenIndex].quaternion.clone());
  }, [plan, chosenIndex]);

  const labels = useMemo(() => {
    const merged: { at: Vector3; text: string }[] = [];
    if (chosenIndex === -1) return merged;
    plan.cast[chosenIndex].actor.keys.forEach((key, k) => {
      const at = footOf(key, u);
      const text = `${k + 1} · ${formatCue(key.at)}`;
      const same = merged.find((label) => label.at.distanceTo(at) < 0.3 * u);
      if (same) same.text += ` / ${text}`;
      else merged.push({ at, text });
    });
    return merged;
  }, [plan, chosenIndex, u]);

  const pick = (actor: string, key: number) => (event: ThreeEvent<MouseEvent>) => {
    const store = useMissionStore.getState();
    // While something else is being traced, the click belongs to it.
    if (isTracing(store.placing)) return;
    event.stopPropagation();
    store.select({ actor, key });
    store.setPlacing({ actor, key });
  };

  return (
    <>
      {plan.cast.map(({ actor, track }, i) => {
        const color = TRACK_COLORS[i % TRACK_COLORS.length];
        const chosen = selected?.actor === actor.id;
        const moving = typeof placing === 'object' && placing !== null && 'actor' in placing && placing.actor === actor.id ? placing.key : undefined;
        return (
          <group key={actor.id}>
            {track && track.points.length > 1 && (
              <Line points={track.points} color={color} lineWidth={chosen ? 2.5 : 1.5} transparent opacity={chosen ? 0.95 : 0.6} depthWrite={false} />
            )}
            {actor.keys.map((key, k) => {
              const normal = normalOf(key);
              const ground = toVector3(key.place).addScaledVector(normal, 0.05 * u);
              const aloft = footOf(key, u);
              const active = chosen && selected?.key === k;
              return (
                <group key={k}>
                  {key.lift > 0.05 && (
                    <>
                      <mesh position={ground} quaternion={new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal)}>
                        <ringGeometry args={[0.45 * u, 0.6 * u, 32]} />
                        <meshBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} toneMapped={false} />
                      </mesh>
                      <Line points={[ground, aloft]} color={color} lineWidth={1} dashed dashSize={0.5 * u} gapSize={0.4 * u} transparent opacity={0.6} />
                    </>
                  )}
                  <mesh position={aloft} onClick={pick(actor.id, k)}>
                    <sphereGeometry args={[(active || moving === k ? 0.34 : 0.24) * u, 16, 12]} />
                    <meshBasicMaterial color={moving === k ? '#ffffff' : color} toneMapped={false} />
                  </mesh>
                  {chosen && stances[k] && <FacingArrow at={aloft} stance={stances[k]} color={color} size={u} />}
                </group>
              );
            })}
          </group>
        );
      })}
      {labels.map((label) => (
        <PlaceLabel key={label.text} at={label.at}>
          {label.text}
        </PlaceLabel>
      ))}
    </>
  );
}

const FORWARD = new Vector3(0, 0, 1);

/** A short arrow from a keyframe's handle, pointing the way the actor faces there. */
function FacingArrow({ at, stance, color, size }: { at: Vector3; stance: Quaternion; color: string; size: number }) {
  const direction = FORWARD.clone().applyQuaternion(stance);
  const tip = at.clone().addScaledVector(direction, 1.4 * size);
  const turn = new Quaternion().setFromUnitVectors(UP, direction);
  return (
    <>
      <Line points={[at, tip]} color={color} lineWidth={2} transparent opacity={0.9} depthWrite={false} />
      <mesh position={tip} quaternion={turn}>
        <coneGeometry args={[0.16 * size, 0.42 * size, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </>
  );
}
