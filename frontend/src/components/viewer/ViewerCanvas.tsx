import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { Scene } from './Scene';
import { configureThreeRuntime } from '@/lib/threeRuntime';
import type { Poi, Project, Vec3 } from '@/types/api';

configureThreeRuntime();

interface ViewerCanvasProps {
  project: Project;
  pois: Poi[];
  placing: boolean;
  onPlace: (position: Vec3, normal: Vec3) => void;
  onInspect: (position: Vec3) => void;
  onRightClick: ((position: Vec3, normal: Vec3, screen: { x: number; y: number }) => void) | null;
}

export function ViewerCanvas({
  project,
  pois,
  placing,
  onPlace,
  onInspect,
  onRightClick,
}: ViewerCanvasProps) {
  return (
    <Canvas
      // The scene is static, so frames are drawn only when something asks for one. An idle
      // viewer costs nothing, which matters on a shared machine driving a boardroom screen.
      frameloop="demand"
      // Past 1.5 the extra pixels cost more than they show on this content.
      dpr={[1, 1.5]}
      // Picking only ever needs the nearest surface, and the BVH can stop there.
      raycaster={{ firstHitOnly: true }}
      // Resolution drops while the camera is moving and returns once it settles.
      // Resolution drops further while the camera moves; stillness is what gets the detail.
      performance={{ min: 0.5, debounce: 180 }}
      camera={{ fov: 45, near: 0.1, far: 5000, position: [60, 40, 60] }}
      gl={{
        antialias: true,
        preserveDrawingBuffer: true, // needed to read the canvas for cover images
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        outputColorSpace: SRGBColorSpace,
      }}
      className={placing ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}
    >
      <Scene
        project={project}
        pois={pois}
        placing={placing}
        onPlace={onPlace}
        onInspect={onInspect}
        onRightClick={onRightClick}
      />
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
