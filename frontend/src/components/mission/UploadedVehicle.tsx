import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Box3, Group, Vector3 } from 'three';
import { useMissionStore } from '@/store/missionStore';
import { BUILT_IN_HEIGHT } from '@/lib/mission/defaults';
import type { Quaternion, VehicleSlot } from '@/types/api';

interface UploadedVehicleProps {
  slot: VehicleSlot;
  url: string;
  rotation: Quaternion | null;
}

/**
 * An editor's own drone model, made to behave like the built-in one: turned nose first,
 * scaled so its longest side is one unit, and centred on its bounding box. The parent scales it
 * to the real size, so a model drawn in millimetres flies as big as one drawn in metres.
 *
 * Its height decides where the tether attaches, so it is measured and handed to the plan.
 * Any animation the file carries, such as spinning rotors, plays on a loop.
 */
export function UploadedVehicle({ slot, url, rotation }: UploadedVehicleProps) {
  const { scene, animations } = useGLTF(url, '/draco/');
  const setHeight = useMissionStore((s) => s.setHeight);
  const invalidate = useThree((s) => s.invalidate);

  const fitted = useMemo(() => {
    const turned = new Group();
    turned.add(scene);
    if (rotation) turned.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    turned.updateMatrixWorld(true);
    const box = new Box3().setFromObject(turned);
    const size = box.getSize(new Vector3());
    const longest = Math.max(size.x, size.y, size.z) || 1;
    const centre = box.getCenter(new Vector3());
    const holder = new Group();
    holder.add(turned);
    turned.position.copy(centre).multiplyScalar(-1);
    holder.scale.setScalar(1 / longest);
    return { holder, height: size.y / longest };
  }, [scene, rotation]);

  const { actions } = useAnimations(animations, scene);
  useEffect(() => {
    for (const action of Object.values(actions)) action?.play();
  }, [actions]);

  useLayoutEffect(() => {
    setHeight(slot, fitted.height);
    invalidate();
    return () => setHeight(slot, BUILT_IN_HEIGHT[slot]);
  }, [slot, fitted, setHeight, invalidate]);

  return <primitive object={fitted.holder} />;
}
