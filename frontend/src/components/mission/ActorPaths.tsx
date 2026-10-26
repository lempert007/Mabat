import type { ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Vector3 } from 'three';
import { PlaceLabel } from './PlaceLabel';
import { isTracing, useMissionStore } from '@/store/missionStore';
import { TRACK_COLORS } from '@/lib/mission/defaults';
import { formatCue } from '@/lib/format';
import type { MissionPlan } from '@/lib/mission/types';

/**
 * Where each actor goes, drawn while the mission is being edited: its path in its own colour,
 * and a handle at every keyframe. Something flying gets a stalk down to the spot it was set
 * over. Clicking a handle selects that keyframe and picks it up; the next click on the model
 * puts it down. The selected actor's keyframes carry their number and time.
 */
export function ActorPaths({ plan }: { plan: MissionPlan }) {
  const selected = useMissionStore((s) => s.selected);
  const placing = useMissionStore((s) => s.placing);
  const u = plan.unitsPerMeter;

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
              const ground = new Vector3(key.place.x, key.place.y + 0.05 * u, key.place.z);
              const aloft = ground.clone().setY(key.place.y + key.lift * u);
              const active = chosen && selected?.key === k;
              return (
                <group key={k}>
                  {key.lift > 0.05 && (
                    <>
                      <mesh position={ground} rotation={[-Math.PI / 2, 0, 0]}>
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
                  {chosen && <PlaceLabel at={aloft}>{`${k + 1} · ${formatCue(key.at)}`}</PlaceLabel>}
                </group>
              );
            })}
          </group>
        );
      })}
    </>
  );
}
