import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Raycaster, Vector3 } from 'three';
import { markerRegistry } from '@/store/markerRegistry';
import { sceneRefs } from '@/store/sceneRefs';
import { useViewerStore } from '@/store/viewerStore';
import type { Poi } from '@/types/api';

interface MarkerProjectorProps {
  pois: Poi[];
  radius: number;
}

interface MarkerState {
  x: number;
  y: number;
  behind: boolean;
  occluded: boolean;
}

/**
 * How many markers have their occlusion re-tested per frame. Each test is a raycast, so this
 * caps the per-frame cost no matter how many points a project has, while keeping every marker
 * refreshed often enough that the fade reads as immediate.
 */
const OCCLUSION_TESTS_PER_FRAME = 8;

/**
 * Positions the DOM markers from the 3D scene once per rendered frame.
 *
 * Writes straight into each element's style, never through React state, so moving the camera
 * never re-renders the marker tree.
 */
export function MarkerProjector({ pois, radius }: MarkerProjectorProps) {
  const invalidate = useThree((s) => s.invalidate);
  const introVisible = useViewerStore((s) => s.introVisible);

  const raycaster = useMemo(() => {
    const instance = new Raycaster();
    instance.firstHitOnly = true;
    return instance;
  }, []);
  const world = useMemo(() => new Vector3(), []);
  const projected = useMemo(() => new Vector3(), []);
  const direction = useMemo(() => new Vector3(), []);

  // Last value written per marker, so an unchanged frame touches no DOM at all.
  const lastState = useRef(new Map<string, MarkerState>());
  const occlusionCursor = useRef(0);
  const liftDistance = radius * 0.004;

  // Newly mounted markers have no screen position until a frame runs.
  useEffect(() => {
    lastState.current.clear();
    invalidate();
  }, [pois, invalidate]);

  /** World position of a point, lifted clear of the surface it sits on. */
  const worldPositionOf = (poi: Poi) => {
    world.set(poi.position.x, poi.position.y, poi.position.z);
    return world.addScaledVector(
      direction.set(poi.normal.x, poi.normal.y, poi.normal.z),
      liftDistance,
    );
  };

  useFrame(({ camera, size }) => {
    if (introVisible) return; // markers are hidden behind the intro overlay

    // Guarantees the projection below uses the camera's current transform, whatever else has
    // or has not already run this frame. Recomposing one matrix is negligible.
    camera.updateMatrixWorld();

    const states = lastState.current;

    for (const poi of pois) {
      const element = markerRegistry.get(poi.id);
      if (!element) continue;

      projected.copy(worldPositionOf(poi)).project(camera);
      const behind = projected.z > 1;
      const x = Math.round((projected.x * 0.5 + 0.5) * size.width);
      const y = Math.round((-projected.y * 0.5 + 0.5) * size.height);

      let state = states.get(poi.id);
      if (!state) {
        state = { x: NaN, y: NaN, behind: false, occluded: false };
        states.set(poi.id, state);
      }

      if (x !== state.x || y !== state.y) {
        element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        state.x = x;
        state.y = y;
      }
      if (behind !== state.behind) {
        element.dataset.behind = behind ? 'true' : 'false';
        state.behind = behind;
      }
    }

    // Occlusion pass: a rotating slice of the markers, so the cost per frame stays flat.
    const model = sceneRefs.model;
    if (!model || pois.length === 0) return;
    const tests = Math.min(OCCLUSION_TESTS_PER_FRAME, pois.length);
    for (let step = 0; step < tests; step += 1) {
      const poi = pois[(occlusionCursor.current + step) % pois.length];
      const element = markerRegistry.get(poi.id);
      const state = states.get(poi.id);
      if (!element || !state) continue;

      let occluded = false;
      if (!state.behind) {
        direction.copy(worldPositionOf(poi)).sub(camera.position);
        const distance = direction.length();
        raycaster.set(camera.position, direction.normalize());
        raycaster.near = 0;
        raycaster.far = distance - liftDistance;
        occluded = raycaster.intersectObject(model, true).length > 0;
      }
      if (occluded !== state.occluded) {
        element.dataset.occluded = occluded ? 'true' : 'false';
        state.occluded = occluded;
      }
    }
    occlusionCursor.current = (occlusionCursor.current + tests) % pois.length;
  });

  return null;
}
