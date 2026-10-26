import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { BufferGeometry, Float32BufferAttribute, MathUtils, ShapeUtils, Vector2, Vector3 } from 'three';
import { PlaceLabel } from './PlaceLabel';
import { edgeMaterial, groundMaterial } from './noiseMaterials';
import { missionLive } from '@/store/missionLive';
import { useMissionStore } from '@/store/missionStore';
import { extentOf } from '@/lib/mission/noise';
import type { MissionPlan } from '@/lib/mission/types';
import type { Vec3 } from '@/types/api';

interface NoiseContourProps {
  points: Vec3[];
  name: string;
  color: string;
  plan: MissionPlan;
}

/** Just off the ground, so the wash does not flicker against it, m. */
const LIFT = 0.2;
/** How tall the curtain on the edge stands, m. */
const CURTAIN = 7;

/** The ground inside, the curtain on the edge, and the edge itself, all at the ground's height. */
function contourGeometry(points: Vec3[], u: number) {
  const lifted = points.map((p) => new Vector3(p.x, p.y + LIFT * u, p.z));

  const ground = new BufferGeometry();
  ground.setAttribute('position', new Float32BufferAttribute(lifted.flatMap((p) => p.toArray()), 3));
  ground.setIndex(ShapeUtils.triangulateShape(points.map((p) => new Vector2(p.x, p.z)), []).flat());

  const loop = [...lifted, lifted[0]];
  const positions: number[] = [];
  const rise: number[] = [];
  const along: number[] = [];
  const index: number[] = [];
  let metres = 0;
  loop.forEach((p, i) => {
    if (i > 0) metres += p.distanceTo(loop[i - 1]) / u;
    positions.push(p.x, p.y, p.z, p.x, p.y + CURTAIN * u, p.z);
    rise.push(0, 1);
    along.push(metres, metres);
    if (i < loop.length - 1) index.push(2 * i, 2 * i + 2, 2 * i + 1, 2 * i + 1, 2 * i + 2, 2 * i + 3);
  });
  const curtain = new BufferGeometry();
  curtain.setAttribute('position', new Float32BufferAttribute(positions, 3));
  curtain.setAttribute('rise', new Float32BufferAttribute(rise, 1));
  curtain.setAttribute('along', new Float32BufferAttribute(along, 1));
  curtain.setIndex(index);

  return { ground, curtain, outline: loop };
}

/**
 * Where one contour of the acoustic study says the flight is heard. Sound rings run out across
 * the ground from wherever the carrier is, up to a glowing curtain on the edge, beyond which it
 * is quiet. How strongly they run depends on how close the carrier is, so the picture plays out
 * with the flight: the area wakes as the carrier arrives and settles once it has gone.
 */
export function NoiseContour({ points, name, color, plan }: NoiseContourProps) {
  const u = plan.unitsPerMeter;
  const geometry = useMemo(() => contourGeometry(points, u), [points, u]);
  const ground = useMemo(() => groundMaterial(color, u), [color, u]);
  const edge = useMemo(() => edgeMaterial(color, u), [color, u]);
  const { center, reach } = useMemo(() => extentOf(points), [points]);
  // The label stands on the edge furthest from the drop: how far the sound carries.
  const labelAt = useMemo(() => {
    const far = points.reduce((a, b) => (Math.hypot(b.x - plan.drop.x, b.z - plan.drop.z) > Math.hypot(a.x - plan.drop.x, a.z - plan.drop.z) ? b : a));
    return new Vector3(far.x, far.y, far.z);
  }, [points, plan.drop]);

  useEffect(() => () => [geometry.ground, geometry.curtain].forEach((g) => g.dispose()), [geometry]);
  useEffect(() => () => [ground, edge].forEach((m) => m.dispose()), [ground, edge]);

  useFrame(() => {
    const frame = missionLive.frame;
    const time = useMissionStore.getState().time;
    // Overhead anywhere inside, fading out by twice the contour's reach away.
    const away = frame ? Math.hypot(frame.carrier.x - center.x, frame.carrier.z - center.z) : Infinity;
    const loud = MathUtils.clamp(2 - away / Math.max(reach, u), 0, 1);
    for (const material of [ground, edge]) {
      material.uniforms.uTime.value = time;
      material.uniforms.uLoud.value = loud;
      if (frame) material.uniforms.uSource.value.set(frame.carrier.x, frame.carrier.z);
    }
  });

  return (
    <>
      <mesh geometry={geometry.ground} material={ground} renderOrder={2} />
      <mesh geometry={geometry.curtain} material={edge} renderOrder={3} />
      <Line points={geometry.outline} color={color} lineWidth={2} transparent opacity={0.9} depthWrite={false} />
      <PlaceLabel at={labelAt}>{name}</PlaceLabel>
    </>
  );
}
