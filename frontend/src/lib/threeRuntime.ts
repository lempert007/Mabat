import { useGLTF } from '@react-three/drei';
import { BufferGeometry, Mesh } from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';

/** Shipped in public/draco, because the deployment has no internet access. */
const DRACO_DECODER_PATH = '/draco/';

let configured = false;

/**
 * One-time three.js setup shared by every canvas:
 *
 * - bounding-volume hierarchies, so picking and marker occlusion stay cheap on large models
 * - a local Draco decoder, so a compressed model never falls back to drei's CDN default
 */
export function configureThreeRuntime(): void {
  if (configured) return;
  BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
  Mesh.prototype.raycast = acceleratedRaycast;
  useGLTF.setDecoderPath(DRACO_DECODER_PATH);
  configured = true;
}
