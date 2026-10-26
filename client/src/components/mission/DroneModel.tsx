import { RoundedBox } from '@react-three/drei';
import { Rotor } from './Rotor';

const BODY = '#eef1f5';

/** Ducted fans at the corners: x, z. */
const FANS: [number, number][] = [
  [0.378, 0.16],
  [-0.378, 0.16],
  [0.378, -0.16],
  [-0.378, -0.16],
];

interface DroneModelProps {
  color: string;
  /** How hard its fans are working right now, 0 to 1. */
  power: () => number;
}

/**
 * The built-in drone: a pod with four ducted fans, an eye on top for the rope and claws
 * underneath for whatever it carries, with a light band round it in the livery colour.
 *
 * Drawn one unit wide with its nose along +Z, centred on its bounding box. Its height is
 * `BUILT_IN_HEIGHT.drone`.
 */
export function DroneModel({ color, power }: DroneModelProps) {
  return (
    <group>
      <RoundedBox args={[0.56, 0.34, 0.46]} radius={0.07} smoothness={3}>
        <meshStandardMaterial color={BODY} roughness={0.35} metalness={0.05} />
      </RoundedBox>
      <RoundedBox args={[0.575, 0.06, 0.475]} radius={0.025} smoothness={2} position={[0, 0.06, 0]}>
        <meshStandardMaterial color={color} roughness={0.45} />
      </RoundedBox>
      <RoundedBox args={[0.57, 0.02, 0.47]} radius={0.01} smoothness={2} position={[0, -0.1, 0]}>
        <meshStandardMaterial color="#0b0b0e" emissive={color} emissiveIntensity={2.2} toneMapped={false} />
      </RoundedBox>

      {FANS.map(([x, z], index) => (
        <group key={index} position={[x, 0.02, z]}>
          <mesh position={[-Math.sign(x) * 0.07, 0, 0]}>
            <boxGeometry args={[0.1, 0.03, 0.05]} />
            <meshStandardMaterial color="#2a2d34" roughness={0.6} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.1, 0.022, 10, 28]} />
            <meshStandardMaterial color={BODY} roughness={0.4} />
          </mesh>
          <Rotor position={[0, 0, 0]} span={0.18} power={power} direction={index % 2 ? 1 : -1} />
        </group>
      ))}

      <mesh position={[0, 0.211, 0]}>
        <torusGeometry args={[0.03, 0.009, 8, 20]} />
        <meshStandardMaterial color="#2a2d34" roughness={0.5} metalness={0.4} />
      </mesh>
      {[1, -1].map((x) =>
        [1, -1].map((z) => (
          <mesh key={`${x}${z}`} position={[x * 0.14, -0.21, z * 0.12]}>
            <boxGeometry args={[0.03, 0.08, 0.03]} />
            <meshStandardMaterial color="#2a2d34" roughness={0.6} />
          </mesh>
        )),
      )}
    </group>
  );
}
