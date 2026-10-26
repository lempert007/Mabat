import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, type SpriteMaterial } from 'three';
import { radialTexture } from '@/lib/radialTexture';

interface NavLightProps {
  position: [number, number, number];
  color: string;
  /** Size of the glow, in the model's units. */
  glow: number;
  /** A strobe double-flashes once a second; a steady light just burns. */
  strobe?: boolean;
}

/**
 * A position light: a bright point with a soft halo around it. The halo is a sprite rather than
 * bloom, which costs one quad instead of a full-screen pass, and it is what makes the drones
 * findable against a night scene.
 */
export function NavLight({ position, color, glow, strobe }: NavLightProps) {
  const halo = useRef<SpriteMaterial>(null);

  useFrame(({ clock }) => {
    if (!strobe || !halo.current) return;
    const phase = clock.elapsedTime % 1;
    halo.current.opacity = phase < 0.05 || (phase > 0.14 && phase < 0.19) ? 1 : 0.08;
  });

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[glow * 0.04, 10, 10]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <sprite scale={glow}>
        <spriteMaterial
          ref={halo}
          map={radialTexture(color)}
          blending={AdditiveBlending}
          depthWrite={false}
          transparent
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}
