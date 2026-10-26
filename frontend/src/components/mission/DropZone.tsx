import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  MathUtils,
  type Mesh,
  type MeshBasicMaterial,
} from 'three';
import { missionLive } from '@/store/missionLive';
import type { MissionPlan } from '@/lib/mission/types';

const DELIVERED = new Color('#34c76f');
const PULSES = 2;
const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];
const OVERLAY = { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, toneMapped: false };

/** The drop shows its beam until the droid is on its way down. */
const BEAMING = new Set(['takeoff', 'cruise', 'approach']);

/**
 * The landing target on the ground: a pad with pulsing rings and a column of light up to where
 * the carrier will hold. It turns green the moment the parcel is down.
 */
export function DropZone({ plan, color }: { plan: MissionPlan; color: string }) {
  const u = plan.unitsPerMeter;
  const radius = 2.4 * u;
  const beamHeight = plan.hover.y - plan.drop.y;
  const accent = useMemo(() => new Color(color), [color]);
  const tinted = useRef<(MeshBasicMaterial | null)[]>([]);
  const pulses = useRef<(Mesh | null)[]>([]);
  const beam = useRef<MeshBasicMaterial>(null);
  const tint = (index: number) => (material: MeshBasicMaterial | null) => void (tinted.current[index] = material);

  // Bright at the foot and gone at the top. With additive blending, black is transparent.
  const beamGeometry = useMemo(() => {
    const geometry = new CylinderGeometry(radius * 0.18, radius * 0.5, beamHeight, 24, 8, true);
    const positions = geometry.getAttribute('position');
    const colors: number[] = [];
    for (let i = 0; i < positions.count; i += 1) {
      const fade = (0.5 - positions.getY(i) / beamHeight) ** 2;
      colors.push(fade, fade, fade);
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    return geometry;
  }, [radius, beamHeight]);

  useFrame(({ clock }, delta) => {
    const frame = missionLive.frame;
    if (!frame) return;
    const color = frame.parcelState === 'delivered' ? DELIVERED : accent;
    for (const material of tinted.current) material?.color.copy(color);
    pulses.current.forEach((pulse, i) => {
      if (!pulse) return;
      const phase = (clock.elapsedTime * 0.45 + i / PULSES) % 1;
      pulse.scale.setScalar(1 + phase * 1.6);
      (pulse.material as MeshBasicMaterial).opacity = 0.5 * (1 - phase);
    });
    if (beam.current) {
      const target = BEAMING.has(plan.stages[frame.stage].kind) ? 0.55 : 0;
      beam.current.opacity = MathUtils.damp(beam.current.opacity, target, 3, delta);
      beam.current.visible = beam.current.opacity > 0.01;
    }
  });

  return (
    <group position={[plan.drop.x, plan.drop.y + 0.02 * u, plan.drop.z]}>
      <mesh rotation={FLAT}>
        <circleGeometry args={[radius, 48]} />
        <meshBasicMaterial ref={tint(0)} color={color} opacity={0.14} {...OVERLAY} />
      </mesh>
      <mesh rotation={FLAT}>
        <ringGeometry args={[radius * 0.9, radius, 64]} />
        <meshBasicMaterial ref={tint(1)} color={color} opacity={0.9} {...OVERLAY} />
      </mesh>
      {[0, 1].map((arm) => (
        <mesh key={arm} rotation={[-Math.PI / 2, 0, (arm * Math.PI) / 2]}>
          <planeGeometry args={[radius * 0.07, radius * 0.7]} />
          <meshBasicMaterial ref={tint(2 + arm)} color={color} opacity={0.9} {...OVERLAY} />
        </mesh>
      ))}
      {Array.from({ length: PULSES }, (_, i) => (
        <mesh key={i} ref={(mesh) => void (pulses.current[i] = mesh)} rotation={FLAT}>
          <ringGeometry args={[radius * 0.96, radius, 64]} />
          <meshBasicMaterial ref={tint(4 + i)} color={color} opacity={0.5} {...OVERLAY} />
        </mesh>
      ))}
      <mesh geometry={beamGeometry} position={[0, beamHeight / 2, 0]}>
        <meshBasicMaterial
          ref={beam}
          color={color}
          vertexColors
          transparent
          opacity={0.55}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
