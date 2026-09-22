import { Environment, Lightformer } from '@react-three/drei';
import type { EnvironmentPreset } from '@/types/api';

/** Procedural studio lighting. No HDRI files, so it works offline and loads instantly. */
export function SceneEnvironment({ preset }: { preset: EnvironmentPreset }) {
  return (
    <>
      <Environment resolution={256} frames={1}>
        {preset === 'studio' && (
          <>
            <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[0, 12, 0]} scale={[14, 14, 1]} rotation={[Math.PI / 2, 0, 0]} />
            <Lightformer form="rect" intensity={0.6} color="#cfe0ff" position={[-10, 4, 6]} scale={[6, 10, 1]} rotation={[0, Math.PI / 3, 0]} />
            <Lightformer form="rect" intensity={0.5} color="#ffe6c8" position={[10, 3, -6]} scale={[6, 10, 1]} rotation={[0, -Math.PI / 3, 0]} />
            <Lightformer form="ring" intensity={0.25} color="#8fb4ff" position={[0, -6, 0]} scale={10} rotation={[Math.PI / 2, 0, 0]} />
          </>
        )}
        {preset === 'night' && (
          <>
            <Lightformer form="circle" intensity={1.2} color="#b9c8ff" position={[6, 10, -8]} scale={4} />
            <Lightformer form="rect" intensity={0.25} color="#3a4a7a" position={[0, 8, 0]} scale={[14, 14, 1]} rotation={[Math.PI / 2, 0, 0]} />
            <Lightformer form="rect" intensity={0.35} color="#ffb070" position={[-8, 1, 6]} scale={[4, 6, 1]} rotation={[0, Math.PI / 3, 0]} />
          </>
        )}
        {preset === 'dawn' && (
          <>
            <Lightformer form="circle" intensity={1.8} color="#ffb26b" position={[10, 3, 4]} scale={5} rotation={[0, -Math.PI / 4, 0]} />
            <Lightformer form="rect" intensity={0.5} color="#9fc3ff" position={[0, 12, 0]} scale={[14, 14, 1]} rotation={[Math.PI / 2, 0, 0]} />
            <Lightformer form="rect" intensity={0.3} color="#ffd7b0" position={[-10, 2, -4]} scale={[6, 8, 1]} rotation={[0, Math.PI / 3, 0]} />
          </>
        )}
      </Environment>
      <hemisphereLight args={['#dfe8ff', '#1a1a1f', preset === 'night' ? 0.15 : 0.3]} />
      <directionalLight
        position={preset === 'dawn' ? [40, 12, 20] : [30, 50, 20]}
        intensity={preset === 'night' ? 0.35 : preset === 'dawn' ? 1.1 : 0.8}
        color={preset === 'dawn' ? '#ffc79a' : preset === 'night' ? '#b7c6ff' : '#ffffff'}
      />
    </>
  );
}
