import { Html } from '@react-three/drei';
import type { Vector3 } from 'three';

/**
 * Pins the label's box to the anchor. Left to itself an absolute box in a right-to-left page
 * hangs off to the left of where it was put, by its own width.
 */
const ANCHORED = { left: 0, top: 0, pointerEvents: 'none' } as const;

/** A name hovering over a place in the scene, such as the drop or a waypoint. */
export function PlaceLabel({ at, children }: { at: Vector3; children: string }) {
  return (
    <Html position={at.toArray()} center zIndexRange={[10, 0]} style={ANCHORED}>
      <span className="block -translate-y-6 whitespace-nowrap rounded-full glass px-2.5 py-1 text-[11px] font-medium text-fg">
        <bdi>{children}</bdi>
      </span>
    </Html>
  );
}
