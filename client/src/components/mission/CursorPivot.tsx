import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type CameraControlsImpl from 'camera-controls';
import { Raycaster, Vector2 } from 'three';
import { useMissionStore } from '@/store/missionStore';
import { sceneRefs } from '@/store/sceneRefs';

/**
 * Orbits and zooms about whatever is under the pointer while the camera is the viewer's own.
 *
 * Out of the box the camera turns about a target that may be a hundred metres from what the
 * editor is looking at, so orbiting a rover in a yard swings the view across the site and the
 * wheel crawls or leaps. Just before the camera takes a press or a wheel step, this moves that
 * target onto the surface under the pointer without moving the camera, the way a modelling tool
 * behaves. It listens in the capture phase on the canvas's parent so it always goes first.
 */
export function CursorPivot() {
  const controls = useThree((s) => s.controls) as unknown as CameraControlsImpl | null;
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    if (!controls) return;
    const canvas = gl.domElement;
    const host = canvas.parentElement ?? canvas;
    const raycaster = new Raycaster();
    raycaster.firstHitOnly = true;
    const pointer = new Vector2();

    const pivot = (event: PointerEvent | WheelEvent) => {
      const store = useMissionStore.getState();
      // Following keeps the target on the action; the director owns it in the cinematic.
      const own = store.camera === 'free' || (store.editing && store.camera === 'cinematic');
      if (event.target !== canvas || !own || controls.active || !sceneRefs.model) return;
      const rect = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const [hit] = raycaster.intersectObject(sceneRefs.model, true);
      if (hit) controls.setOrbitPoint(hit.point.x, hit.point.y, hit.point.z);
    };

    host.addEventListener('pointerdown', pivot, true);
    host.addEventListener('wheel', pivot, { capture: true, passive: true });
    return () => {
      host.removeEventListener('pointerdown', pivot, true);
      host.removeEventListener('wheel', pivot, { capture: true });
    };
  }, [controls, gl, camera]);

  return null;
}
