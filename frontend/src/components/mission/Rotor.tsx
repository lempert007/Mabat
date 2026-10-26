import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, type Group, type MeshBasicMaterial } from 'three';
import { useMissionStore } from '@/store/missionStore';

interface RotorProps {
  position: [number, number, number];
  /** Tip to tip, in the model's units. */
  span: number;
  /** Spins about the model's vertical, or about its length for a pusher. */
  axis?: 'vertical' | 'forward';
  /** How hard it is working right now, 0 to 1. */
  power: () => number;
  direction?: 1 | -1;
}

const FULL_SPEED = 70; // radians per second, which reads as a blur rather than a strobe

/**
 * Two blades and the disc they sweep. As the rotor comes up to speed the blades give way to a
 * faint disc, the way a spinning propeller looks to the eye.
 */
export function Rotor({ position, span, axis = 'vertical', power, direction = 1 }: RotorProps) {
  const blades = useRef<Group>(null);
  const disc = useRef<MeshBasicMaterial>(null);

  useFrame((_, delta) => {
    const level = power();
    // A paused mission is a still picture, rotors included.
    const { playing, rate } = useMissionStore.getState();
    const step = playing ? Math.min(delta, 0.05) * rate : 0;
    if (blades.current) blades.current.rotation.y += direction * level * FULL_SPEED * step;
    if (disc.current) disc.current.opacity = 0.05 + level * 0.18;
  });

  return (
    <group position={position} rotation={axis === 'forward' ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
      <group ref={blades}>
        <mesh>
          <boxGeometry args={[span, span * 0.02, span * 0.09]} />
          <meshStandardMaterial color="#202228" roughness={0.6} />
        </mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[span / 2, 32]} />
        <meshBasicMaterial ref={disc} color="#c9d4e6" transparent opacity={0.05} depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  );
}
