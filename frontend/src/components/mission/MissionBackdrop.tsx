import { useMemo } from 'react';
import { BackSide, Color, ShaderMaterial } from 'three';
import { useViewerStore } from '@/store/viewerStore';
import { sceneRefs } from '@/store/sceneRefs';
import type { MissionPlan } from '@/lib/mission/types';
import type { EnvironmentPreset } from '@/types/api';

/** Ground beyond the model, the sky at the horizon, and the sky overhead, per lighting preset. */
const TONES: Record<EnvironmentPreset, { ground: string; horizon: string; zenith: string }> = {
  studio: { ground: '#1e2226', horizon: '#2b3548', zenith: '#0f121a' },
  night: { ground: '#0e1118', horizon: '#16203a', zenith: '#05070e' },
  dawn: { ground: '#211a1a', horizon: '#5a3428', zenith: '#151220' },
};

/**
 * A model is a tile floating in the dark, which is fine to orbit but not to fly over: from a
 * hundred metres up, any shot towards the horizon would see mostly nothing. While a mission plays
 * the tile gets a ground that runs on to the horizon, fading into the fog, and a sky over it.
 */
export function MissionBackdrop({ plan, preset }: { plan: MissionPlan; preset: EnvironmentPreset }) {
  const modelReady = useViewerStore((s) => s.modelReady);
  const tones = TONES[preset];
  const { center, radius } = plan.site;
  // Just under the model's lowest point, so the model's own ground always covers it.
  const floor = (modelReady ? sceneRefs.bounds?.min.y : undefined) ?? plan.drop.y;

  const sky = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        uniforms: { horizon: { value: new Color(tones.horizon) }, zenith: { value: new Color(tones.zenith) } },
        vertexShader: /* glsl */ `
          varying vec3 vDirection;
          void main() {
            vDirection = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 horizon;
          uniform vec3 zenith;
          varying vec3 vDirection;
          void main() {
            float up = pow(clamp(vDirection.y, 0.0, 1.0), 0.45);
            gl_FragColor = vec4(mix(horizon, zenith, up), 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [tones],
  );

  return (
    <>
      <mesh material={sky} position={[center.x, floor, center.z]} scale={radius * 20} renderOrder={-1}>
        <sphereGeometry args={[1, 48, 24]} />
      </mesh>
      <mesh position={[center.x, floor - 0.05 * plan.unitsPerMeter, center.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 15, 96]} />
        <meshBasicMaterial color={tones.ground} />
      </mesh>
    </>
  );
}
