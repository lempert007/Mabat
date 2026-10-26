import { Html } from '@react-three/drei';
import type { Vector3 } from 'three';

/** A name hovering over a place in the scene, such as the drop or a waypoint. */
export function PlaceLabel({ at, children }: { at: Vector3; children: string }) {
  return (
    <Html position={at.toArray()} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <span className="block -translate-y-6 whitespace-nowrap rounded-full glass px-2.5 py-1 text-[11px] font-medium text-fg">
        {children}
      </span>
    </Html>
  );
}
