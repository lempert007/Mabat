import { useLayoutEffect, useMemo } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Box3, Group, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useMissionStore } from '@/store/missionStore';
import type { Quaternion } from '@/types/api';

interface UploadedModelProps {
  url: string;
  rotation: Quaternion | null;
  /** Whose height this is in the store: `carrier` or the actor's id. */
  measures: string;
}

/**
 * An editor's own model, made to behave like a built-in one: turned to face forward, scaled so
 * its longest side is one unit, and centred on its bounding box. The parent scales it to the
 * real size, so a model drawn in millimetres stands as big as one drawn in metres.
 *
 * Its height decides where the rope attaches and how things stack on it, so it is measured and
 * handed to the plan. Any animation the file carries, such as spinning rotors or a door, runs on
 * the mission's clock, so it scrubs and pauses with everything else.
 */
export function UploadedModel({ url, rotation, measures }: UploadedModelProps) {
  const { scene, animations } = useGLTF(url, '/draco/');
  const setHeight = useMissionStore((s) => s.setHeight);
  const invalidate = useThree((s) => s.invalidate);

  // A copy of its own, so the same upload can stand in for several things at once.
  const copy = useMemo(() => clone(scene), [scene]);
  const fitted = useMemo(() => {
    const turned = new Group();
    turned.add(copy);
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
  }, [copy, rotation]);

  const { actions, mixer } = useAnimations(animations, copy);
  useLayoutEffect(() => {
    for (const action of Object.values(actions)) action?.play();
  }, [actions]);
  useFrame(() => {
    if (animations.length > 0) mixer.setTime(useMissionStore.getState().time);
  });

  useLayoutEffect(() => {
    setHeight(measures, fitted.height);
    invalidate();
    return () => setHeight(measures, null);
  }, [measures, fitted, setHeight, invalidate]);

  return <primitive object={fitted.holder} />;
}
