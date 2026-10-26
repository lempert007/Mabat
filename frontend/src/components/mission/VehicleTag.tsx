import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { MathUtils, PerspectiveCamera, Vector3, type Group } from 'three';

interface VehicleTagProps {
  label: string;
  /** The vehicle's size in world units, to judge how big it looks. */
  size: number;
  color: string;
  /** The tag stays away while this says so, such as the droid while it rides the carrier. */
  hidden?: () => boolean;
}

/** Below this many pixels across, a drone is a speck and its name is shown beside it. */
const SPECK = 34;

/**
 * A name tag that appears only when a drone is too small on screen to pick out, the way an
 * air-traffic display labels its contacts. Up close the tag gets out of the way.
 */
export function VehicleTag({ label, size, color, hidden }: VehicleTagProps) {
  const anchor = useRef<Group>(null);
  const tag = useRef<HTMLDivElement>(null);
  const world = useMemo(() => new Vector3(), []);
  const camera = useThree((s) => s.camera);
  const height = useThree((s) => s.size.height);

  useFrame(() => {
    if (!anchor.current || !tag.current) return;
    anchor.current.getWorldPosition(world);
    const fov = camera instanceof PerspectiveCamera ? camera.fov : 45;
    const pixels = (size / camera.position.distanceTo(world)) * (height / (2 * Math.tan(MathUtils.degToRad(fov) / 2)));
    const show = pixels < SPECK && !hidden?.();
    tag.current.dataset.shown = show ? 'true' : 'false';
  });

  return (
    <group ref={anchor}>
      <Html center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div
          ref={tag}
          data-shown="false"
          className="flex -translate-y-5 flex-col items-center opacity-0 transition-opacity duration-300 data-[shown=true]:opacity-100"
        >
          <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full glass px-2.5 py-1 text-[11px] font-medium text-fg">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {label}
          </span>
          <span className="h-3 w-px bg-white/40" />
        </div>
      </Html>
    </group>
  );
}
