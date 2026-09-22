import { useEffect, useMemo } from 'react';
import { Grid } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { sceneRefs } from '@/store/sceneRefs';
import { useViewerStore } from '@/store/viewerStore';

export function Ground({ radius, visible }: { radius: number; visible: boolean }) {
  const modelReady = useViewerStore((s) => s.modelReady);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    invalidate();
  }, [visible, invalidate]);

  const placement = useMemo(() => {
    const bounds = sceneRefs.bounds;
    if (!modelReady || !bounds) return null;
    const center = bounds.getCenter(new Vector3());
    return [center.x, bounds.min.y - radius * 0.002, center.z] as const;
  }, [modelReady, radius]);

  if (!visible || !placement) return null;

  return (
    <Grid
      position={placement}
      args={[radius * 8, radius * 8]}
      cellSize={radius / 20}
      cellThickness={0.6}
      cellColor="#2b2b33"
      sectionSize={radius / 4}
      sectionThickness={1}
      sectionColor="#3a3a48"
      fadeDistance={radius * 6}
      fadeStrength={1.5}
      infiniteGrid
    />
  );
}
