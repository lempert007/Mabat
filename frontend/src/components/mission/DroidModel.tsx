import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Color, type MeshStandardMaterial } from 'three';
import { Rotor } from './Rotor';
import { missionLive } from '@/store/missionLive';

const BODY = '#eef1f5';
const DELIVERED = new Color('#34c76f');

/** Ducted fans at the corners: x, z. */
const FANS: [number, number][] = [
  [0.378, 0.16],
  [-0.378, 0.16],
  [0.378, -0.16],
  [-0.378, -0.16],
];

/** The droid's fans work while it is off the carrier, steering it down the tether. */
const fans = () => ((missionLive.frame?.payout ?? 0) > 0.05 ? 0.85 : 0);

/**
 * The built-in droid: a pod with four ducted fans, an eye on top for the tether and claws
 * underneath for the parcel. A light band runs round it in the livery colour and turns green
 * once the parcel is down.
 *
 * Drawn one unit wide with its nose along +Z, centred on its bounding box. Its height is
 * `BUILT_IN_HEIGHT.droid`.
 */
export function DroidModel({ color }: { color: string }) {
  const band = useRef<MeshStandardMaterial>(null);
  const livery = new Color(color);

  useFrame(() => {
    if (!band.current) return;
    const done = missionLive.frame?.parcelState === 'delivered';
    band.current.emissive.copy(done ? DELIVERED : livery);
  });

  return (
    <group>
      <RoundedBox args={[0.56, 0.34, 0.46]} radius={0.07} smoothness={3}>
        <meshStandardMaterial color={BODY} roughness={0.35} metalness={0.05} />
      </RoundedBox>
      <RoundedBox args={[0.575, 0.06, 0.475]} radius={0.025} smoothness={2} position={[0, 0.06, 0]}>
        <meshStandardMaterial color={color} roughness={0.45} />
      </RoundedBox>
      <RoundedBox args={[0.57, 0.02, 0.47]} radius={0.01} smoothness={2} position={[0, -0.1, 0]}>
        <meshStandardMaterial ref={band} color="#0b0b0e" emissive={color} emissiveIntensity={2.2} toneMapped={false} />
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
          <Rotor position={[0, 0, 0]} span={0.18} power={fans} direction={index % 2 ? 1 : -1} />
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
