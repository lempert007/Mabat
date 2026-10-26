import type { Vector3 } from 'three';

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];
const OVERLAY = { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, toneMapped: false };

/** The carrier's pad: a dark disc with a ring and an H, the mark every pilot reads as "land here". */
export function HubPad({ at, unitsPerMeter, color }: { at: Vector3; unitsPerMeter: number; color: string }) {
  const radius = 3.2 * unitsPerMeter;
  const bar = radius * 0.09;
  return (
    <group position={[at.x, at.y + 0.02 * unitsPerMeter, at.z]}>
      <mesh rotation={FLAT}>
        <circleGeometry args={[radius, 48]} />
        <meshBasicMaterial color="#16161a" opacity={0.85} {...OVERLAY} />
      </mesh>
      <mesh rotation={FLAT}>
        <ringGeometry args={[radius * 0.86, radius * 0.94, 64]} />
        <meshBasicMaterial color={color} opacity={0.95} {...OVERLAY} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} rotation={FLAT} position={[side * radius * 0.3, 0, 0]}>
          <planeGeometry args={[bar, radius * 0.9]} />
          <meshBasicMaterial color="#f5f5f7" opacity={0.9} {...OVERLAY} />
        </mesh>
      ))}
      <mesh rotation={FLAT}>
        <planeGeometry args={[radius * 0.6, bar]} />
        <meshBasicMaterial color="#f5f5f7" opacity={0.9} {...OVERLAY} />
      </mesh>
    </group>
  );
}
