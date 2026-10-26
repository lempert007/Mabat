import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { Rotor } from './Rotor';
import { NavLight } from './NavLight';
import { missionLive } from '@/store/missionLive';

interface CarrierModelProps {
  color: string;
  /** How far the landing legs reach below the belly, as a fraction of the wingspan. */
  legs: number;
}

const BODY = '#e8ecf2';
const DARK = '#2a2d34';

const lift = () => missionLive.frame?.lift ?? 0;
const thrust = () => missionLive.frame?.thrust ?? 0;

/** Lift rotors sit fore and aft on each boom: x, z. */
const LIFT_ROTORS: [number, number][] = [
  [0.24, 0.27],
  [-0.24, 0.27],
  [0.24, -0.29],
  [-0.24, -0.29],
];

/**
 * The built-in carrier: a VTOL with a high wing, four lift rotors on two booms and a pusher
 * propeller. In forward flight the lift rotors wind down and the pusher takes over, and the
 * legs fold away once it is clear of the pad.
 *
 * Drawn with a wingspan of one and its nose along +Z, centred on its bounding box, so it slots
 * in exactly where an uploaded model would. Its height is `BUILT_IN_HEIGHT.carrier`.
 */
export function CarrierModel({ color, legs }: CarrierModelProps) {
  const gear = useRef<Group>(null);

  useFrame(() => {
    const down = missionLive.frame?.gear ?? 0;
    if (!gear.current) return;
    gear.current.visible = down > 0.01;
    gear.current.scale.y = Math.max(down, 0.01);
  });

  return (
    <group position={[0, -0.0225, 0]}>
      {/* fuselage and canopy */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.045, 0.42, 8, 20]} />
        <meshStandardMaterial color={BODY} roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.026, 0.17]} scale={[1, 0.7, 1.7]}>
        <sphereGeometry args={[0.03, 20, 12]} />
        <meshStandardMaterial color="#10141c" roughness={0.1} metalness={0.6} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[0.08, 0.025, 0.13]} />
        <meshStandardMaterial color={DARK} roughness={0.7} />
      </mesh>

      {/* wing with coloured tips, booms and tail */}
      <mesh position={[0, 0.04, 0.02]}>
        <boxGeometry args={[0.86, 0.014, 0.12]} />
        <meshStandardMaterial color={BODY} roughness={0.35} metalness={0.1} />
      </mesh>
      {[1, -1].map((side) => (
        <mesh key={side} position={[side * 0.465, 0.04, 0.02]}>
          <boxGeometry args={[0.07, 0.015, 0.12]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
      ))}
      {[1, -1].map((side) => (
        <group key={side} position={[side * 0.24, 0, 0]}>
          <mesh position={[0, 0.035, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.64, 10]} />
            <meshStandardMaterial color={BODY} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.07, -0.34]}>
            <boxGeometry args={[0.008, 0.075, 0.055]} />
            <meshStandardMaterial color={color} roughness={0.4} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.05, -0.34]}>
        <boxGeometry args={[0.5, 0.008, 0.055]} />
        <meshStandardMaterial color={BODY} roughness={0.4} />
      </mesh>

      {/* rotors */}
      {LIFT_ROTORS.map(([x, z], index) => (
        <group key={index}>
          <mesh position={[x, 0.058, z]}>
            <cylinderGeometry args={[0.016, 0.016, 0.024, 12]} />
            <meshStandardMaterial color={DARK} roughness={0.5} />
          </mesh>
          <Rotor position={[x, 0.072, z]} span={0.22} power={lift} direction={index % 2 ? 1 : -1} />
        </group>
      ))}
      <Rotor position={[0, 0, -0.27]} span={0.12} axis="forward" power={thrust} />

      {/* landing legs, folded up into the belly in flight */}
      <group ref={gear} position={[0, -0.04, 0]}>
        {[1, -1].map((side) => (
          <group key={side}>
            {[0.09, -0.09].map((z) => (
              <mesh key={z} position={[side * 0.07, -legs / 2, z]}>
                <cylinderGeometry args={[0.005, 0.005, legs, 6]} />
                <meshStandardMaterial color={DARK} roughness={0.6} />
              </mesh>
            ))}
            <mesh position={[side * 0.07, -legs, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.007, 0.007, 0.26, 8]} />
              <meshStandardMaterial color={DARK} roughness={0.6} />
            </mesh>
          </group>
        ))}
      </group>

      {/* port red, starboard green, a white strobe on the tail */}
      <NavLight position={[0.5, 0.04, 0.02]} color="#ff3b30" glow={0.22} />
      <NavLight position={[-0.5, 0.04, 0.02]} color="#30d158" glow={0.22} />
      <NavLight position={[0, 0.06, -0.37]} color="#ffffff" glow={0.32} strobe />
    </group>
  );
}
