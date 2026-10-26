import { EffectComposer, Vignette } from '@react-three/postprocessing';

/**
 * Deliberately minimal. A vignette is one cheap full-screen pass and it frames the model
 * nicely; bloom was measured at around a full frame's budget on a dark, largely diffuse scene
 * that barely showed it, so it is not worth what it cost to move the camera.
 */
export function SceneEffects() {
  return (
    <EffectComposer multisampling={0}>
      <Vignette eskil={false} offset={0.25} darkness={0.7} />
    </EffectComposer>
  );
}
