import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Raycaster, Vector3, type Mesh, type MeshBasicMaterial } from 'three';
import { missionLive } from '@/store/missionLive';
import { sceneRefs } from '@/store/sceneRefs';
import { radialTexture } from '@/lib/radialTexture';
import type { MissionPlan } from '@/lib/mission/types';

const DOWN = new Vector3(0, -1, 0);

/**
 * A soft shadow on whatever lies under the carrier and each actor, fading as it climbs. Real
 * shadow maps would cost a second render of the whole model every frame; a raycast each down the
 * BVH costs next to nothing, and this is what tells the eye how high something is above the roofs.
 */
export function GroundShadows({ plan }: { plan: MissionPlan }) {
  const shadows = useRef<(Mesh | null)[]>([]);
  const raycaster = useMemo(() => {
    const instance = new Raycaster();
    instance.firstHitOnly = true;
    return instance;
  }, []);
  const texture = radialTexture('rgba(0,0,0,0.85)');
  const casters = [plan.carrier, ...plan.cast];

  useFrame(() => {
    const frame = missionLive.frame;
    const model = sceneRefs.model;
    if (!frame || !model) return;
    casters.forEach(({ size, half }, i) => {
      const shadow = shadows.current[i];
      if (!shadow) return;
      const from = i === 0 ? frame.carrier : frame.actors[i - 1].position;
      raycaster.set(from, DOWN);
      const [hit] = raycaster.intersectObject(model, true);
      const height = hit ? hit.distance - half : Infinity;
      const strength = Math.max(0, 1 - height / (size * 12));
      shadow.visible = Boolean(hit) && strength > 0.01;
      if (!hit || !shadow.visible) return;
      shadow.position.copy(hit.point).y += 0.03 * plan.unitsPerMeter;
      shadow.scale.setScalar(size * (1.1 + height / size / 20));
      (shadow.material as MeshBasicMaterial).opacity = 0.6 * strength;
    });
  });

  return (
    <>
      {casters.map((_, i) => (
        <mesh key={i} ref={(mesh) => void (shadows.current[i] = mesh)} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-4} />
        </mesh>
      ))}
    </>
  );
}
