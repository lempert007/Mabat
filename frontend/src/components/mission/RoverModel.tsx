import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import type { Group } from 'three';

const BODY = '#eef1f5';
const DARK = '#24272e';
const WHEEL = 0.12;
/** Three wheels a side: z. */
const AXLES = [0.34, 0, -0.34];

interface RoverModelProps {
  color: string;
  /** How far it has driven, world units. */
  travelled: () => number;
  /** Its length in the world, which is what one unit here is drawn at. */
  size: number;
}

/**
 * The built-in rover: a six-wheeled delivery robot with a lid in the livery colour and a light
 * along its nose. Its wheels turn by the distance it has covered, so they roll at exactly the
 * speed it moves, scrubbing included.
 *
 * Drawn one unit long with its nose along +Z, centred on its bounding box. Its height is
 * `BUILT_IN_HEIGHT.rover`.
 */
export function RoverModel({ color, travelled, size }: RoverModelProps) {
  const wheels = useRef<(Group | null)[]>([]);

  useFrame(() => {
    const angle = travelled() / (WHEEL * size);
    for (const wheel of wheels.current) if (wheel) wheel.rotation.x = angle;
  });

  return (
    <group position={[0, -0.025, 0]}>
      <RoundedBox args={[0.66, 0.36, 1]} radius={0.08} smoothness={3} position={[0, 0.07, 0]}>
        <meshStandardMaterial color={BODY} roughness={0.4} metalness={0.05} />
      </RoundedBox>
      <RoundedBox args={[0.6, 0.06, 0.86]} radius={0.028} smoothness={2} position={[0, 0.26, -0.02]}>
        <meshStandardMaterial color={color} roughness={0.45} />
      </RoundedBox>
      <mesh position={[0, 0.12, 0.502]}>
        <boxGeometry args={[0.42, 0.035, 0.01]} />
        <meshStandardMaterial color="#0b0b0e" emissive="#ffffff" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[0.62, 0.06, 0.9]} />
        <meshStandardMaterial color={DARK} roughness={0.7} />
      </mesh>

      {[1, -1].map((side) =>
        AXLES.map((z, i) => (
          <group key={`${side}${z}`} position={[side * 0.37, -0.12, z]}>
            <group ref={(group) => void (wheels.current[(side > 0 ? 0 : 3) + i] = group)}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[WHEEL, WHEEL, 0.08, 20]} />
                <meshStandardMaterial color={DARK} roughness={0.85} />
              </mesh>
              {/* a spoke on the hub, so the turning shows */}
              <mesh position={[side * 0.042, 0.035, 0]}>
                <boxGeometry args={[0.006, 0.07, 0.022]} />
                <meshStandardMaterial color="#9aa3b2" roughness={0.5} />
              </mesh>
            </group>
          </group>
        )),
      )}
    </group>
  );
}
