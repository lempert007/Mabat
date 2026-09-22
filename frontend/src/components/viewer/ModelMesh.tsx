import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { Box3, Mesh, MeshStandardMaterial, Vector3, type Group } from 'three';
import { sceneRefs } from '@/store/sceneRefs';
import { useViewerStore } from '@/store/viewerStore';
import { fromVector3 } from '@/lib/vec';
import type { Quaternion, Vec3 } from '@/types/api';

interface ModelMeshProps {
  url: string;
  /** Corrects a model that was exported the wrong way up. */
  rotation: Quaternion | null;
  placing: boolean;
  onPlace: (position: Vec3, normal: Vec3) => void;
  onInspect: (position: Vec3) => void;
}

export function ModelMesh({ url, rotation, placing, onPlace, onInspect }: ModelMeshProps) {
  const { scene } = useGLTF(url, '/draco/');
  const groupRef = useRef<Group>(null);
  const setModelReady = useViewerStore((s) => s.setModelReady);
  const invalidate = useThree((s) => s.invalidate);

  // Bounding-volume hierarchies make click-to-place and marker occlusion tests cheap, and the
  // material pass repairs sources that carry no PBR data. Both run once per loaded model.
  useEffect(() => {
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (!object.geometry.boundsTree) object.geometry.computeBoundsTree();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!(material instanceof MeshStandardMaterial)) continue;
        material.envMapIntensity = 0.9;
        // glTF's default material is fully metallic, which renders near-black under image lighting.
        // Sources without PBR data (OBJ, STL, PLY) end up there, so treat "metal everywhere" as unset.
        if (material.metalness >= 0.99 && !material.metalnessMap) {
          material.metalness = 0.05;
          material.roughness = Math.min(material.roughness, 0.85);
        }
      }
    });
    invalidate();
  }, [scene, invalidate]);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.updateMatrixWorld(true);
    sceneRefs.model = group;
    sceneRefs.bounds = new Box3().setFromObject(group);
    setModelReady(true);
    return () => {
      sceneRefs.model = null;
      sceneRefs.bounds = null;
      setModelReady(false);
    };
  }, [scene, rotation, setModelReady]);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (event.delta > 4) return; // the pointer was dragged: an orbit, not a placement
      event.stopPropagation();
      const normal = event.face ? event.face.normal.clone() : new Vector3(0, 1, 0);
      normal.transformDirection(event.object.matrixWorld).normalize();
      onPlace(fromVector3(event.point), fromVector3(normal));
    },
    [onPlace],
  );

  const handleDoubleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (event.delta > 4) return;
      event.stopPropagation();
      onInspect(fromVector3(event.point));
    },
    [onInspect],
  );

  // While placing, a single click drops the point and focusing would only get in the way.
  const interaction = useMemo(
    () => (placing ? { onClick: handleClick } : { onDoubleClick: handleDoubleClick }),
    [placing, handleClick, handleDoubleClick],
  );

  return (
    <group
      ref={groupRef}
      quaternion={rotation ? [rotation.x, rotation.y, rotation.z, rotation.w] : [0, 0, 0, 1]}
      {...interaction}
    >
      <primitive object={scene} />
    </group>
  );
}
