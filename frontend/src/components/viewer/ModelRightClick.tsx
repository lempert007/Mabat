import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Raycaster, Vector2 } from 'three';
import { sceneRefs } from '@/store/sceneRefs';
import { fromVector3 } from '@/lib/vec';
import type { Vec3 } from '@/types/api';

interface ModelRightClickProps {
  onPick: (position: Vec3, normal: Vec3, screen: { x: number; y: number }) => void;
}

/** Past this many pixels the press was a camera pan, not a click. */
const DRAG_THRESHOLD = 4;

/**
 * Reports where the editor right-clicked on the model.
 *
 * The right button also pans the camera, and the browser fires its context menu as soon as the
 * button goes down, so the decision is deferred to the release: a press that did not travel is
 * a click, anything further was a pan.
 */
export function ModelRightClick({ onPick }: ModelRightClickProps) {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);

  const raycaster = useMemo(() => {
    const instance = new Raycaster();
    instance.firstHitOnly = true;
    return instance;
  }, []);
  const pointer = useMemo(() => new Vector2(), []);

  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    const canvas = gl.domElement;
    let pressedAt: { x: number; y: number } | null = null;

    const suppressNativeMenu = (event: MouseEvent) => event.preventDefault();

    const onPointerDown = (event: PointerEvent) => {
      if (event.button === 2) pressedAt = { x: event.clientX, y: event.clientY };
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = pressedAt;
      pressedAt = null;
      if (event.button !== 2 || !start) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > DRAG_THRESHOLD) return;

      const model = sceneRefs.model;
      if (!model) return;

      const rect = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const [hit] = raycaster.intersectObject(model, true);
      if (!hit?.face) return;

      const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
      onPickRef.current(fromVector3(hit.point), fromVector3(normal), {
        x: event.clientX,
        y: event.clientY,
      });
    };

    canvas.addEventListener('contextmenu', suppressNativeMenu);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      canvas.removeEventListener('contextmenu', suppressNativeMenu);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [gl, camera, raycaster, pointer]);

  return null;
}
