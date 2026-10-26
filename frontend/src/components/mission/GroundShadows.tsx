import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Raycaster, Vector3, type Mesh, type MeshBasicMaterial } from 'three';
import { missionLive } from '@/store/missionLive';
import { sceneRefs } from '@/store/sceneRefs';
import { radialTexture } from '@/lib/radialTexture';
import type { MissionPlan } from '@/lib/mission/types';

const DOWN = new Vector3(0, -1, 0);
const CASTERS = ['carrier', 'droid'] as const;

/**
 * A soft shadow on whatever lies under each drone, fading as it climbs. Real shadow maps would
 * cost a second render of the whole model every frame; two raycasts down the BVH cost nothing,
 * and this is what tells the eye how high a drone is above the roofs.
 */
export function GroundShadows({ plan }: { plan: MissionPlan }) {
  const shadows = useRef<(Mesh | null)[]>([]);
  const raycaster = useMemo(() => {
    const instance = new Raycaster();
    instance.firstHitOnly = true;
    return instance;
  }, []);
  const texture = radialTexture('rgba(0,0,0,0.85)');

  useFrame(() => {
    const frame = missionLive.frame;
    const model = sceneRefs.model;
    if (!frame || !model) return;
    CASTERS.forEach((slot, i) => {
      const shadow = shadows.current[i];
      if (!shadow) return;
      const from = slot === 'carrier' ? frame.carrier : frame.droid;
      raycaster.set(from, DOWN);
      const [hit] = raycaster.intersectObject(model, true);
      const size = plan.size[slot];
      const height = hit ? hit.distance - plan.halfHeight[slot] : Infinity;
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
      {CASTERS.map((slot, i) => (
        <mesh key={slot} ref={(mesh) => void (shadows.current[i] = mesh)} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-4} />
        </mesh>
      ))}
    </>
  );
}
