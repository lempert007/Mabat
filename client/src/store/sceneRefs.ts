import type { Box3, Object3D } from 'three';

/** Live references to the loaded model, shared between the canvas and the DOM overlay without React state. */
export const sceneRefs: { model: Object3D | null; bounds: Box3 | null } = {
  model: null,
  bounds: null,
};
