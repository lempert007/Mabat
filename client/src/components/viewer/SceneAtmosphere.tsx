import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Color } from 'three';
import type { EnvironmentPreset } from '@/types/api';

interface SceneAtmosphereProps {
  preset: EnvironmentPreset;
  radius: number;
}

const BACKGROUNDS: Record<EnvironmentPreset, string> = {
  studio: '#0b0b0e',
  night: '#05060c',
  dawn: '#120c0c',
};

/** Background color and distance fog. Everything that sets the mood but is not a light. */
export function SceneAtmosphere({ preset, radius }: SceneAtmosphereProps) {
  const invalidate = useThree((s) => s.invalidate);
  const color = useMemo(() => new Color(BACKGROUNDS[preset]), [preset]);

  useEffect(() => {
    invalidate();
  }, [preset, invalidate]);

  return (
    <>
      <color attach="background" args={[color]} />
      <fog attach="fog" args={[color, radius * 4, radius * 16]} />
    </>
  );
}
