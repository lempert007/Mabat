import { useCallback, useEffect, useRef } from 'react';
import { CameraControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import type CameraControlsImpl from 'camera-controls';
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { sceneRefs } from '@/store/sceneRefs';
import { useViewerStore } from '@/store/viewerStore';
import { fromVector3 } from '@/lib/vec';
import type { CameraPose } from '@/types/api';

interface CameraRigProps {
  radius: number;
  introCamera: CameraPose | null;
}

const INTRO_ORBIT_SPEED = 0.05; // radians per second

/** Ignore distance changes smaller than this fraction, so the zoom slider is not spammed. */
const DISTANCE_EPSILON = 0.004;

/** Owns the camera: limits, the opening shot, the slow intro orbit, and the imperative API used by the UI. */
export function CameraRig({ radius, introCamera }: CameraRigProps) {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const modelReady = useViewerStore((s) => s.modelReady);
  const introVisible = useViewerStore((s) => s.introVisible);
  const setCameraApi = useViewerStore((s) => s.setCameraApi);
  const setZoomReturnPose = useViewerStore((s) => s.setZoomReturnPose);
  const setCameraDistance = useViewerStore((s) => s.setCameraDistance);

  const heroPose = useCallback((): CameraPose | null => {
    const bounds = sceneRefs.bounds;
    if (!bounds) return null;
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const boundingRadius = size.length() / 2;
    const fov = camera instanceof PerspectiveCamera ? camera.fov : 45;
    const distance = (boundingRadius / Math.sin(MathUtils.degToRad(fov) / 2)) * 0.95;
    const direction = new Vector3(1, 0.5, 1).normalize();
    return {
      position: fromVector3(center.clone().addScaledVector(direction, distance)),
      target: fromVector3(center),
    };
  }, [camera]);

  useEffect(() => {
    const flyTo = (pose: CameraPose, smooth = true) => {
      const { position: p, target: t } = pose;
      void controlsRef.current?.setLookAt(p.x, p.y, p.z, t.x, t.y, t.z, smooth);
      invalidate();
    };
    setCameraApi({
      flyTo,
      getPose: () => {
        const controls = controlsRef.current;
        const position = controls ? controls.getPosition(new Vector3()) : camera.position.clone();
        const target = controls ? controls.getTarget(new Vector3()) : new Vector3();
        return { position: fromVector3(position), target: fromVector3(target) };
      },
      fitToModel: (smooth = true) => {
        setZoomReturnPose(null);
        const pose = heroPose();
        if (pose) flyTo(pose, smooth);
      },
      // Request a frame and read the canvas once it has been composed, so the capture
      // includes post-processing rather than a bare re-render of the scene.
      distanceRange: () => ({
        min: controlsRef.current?.minDistance ?? 1,
        max: controlsRef.current?.maxDistance ?? 100,
      }),
      setDistance: (distance, smooth = true) => {
        void controlsRef.current?.dollyTo(distance, smooth);
        invalidate();
      },
      capture: () =>
        new Promise((resolve) => {
          invalidate();
          requestAnimationFrame(() =>
            requestAnimationFrame(() => gl.domElement.toBlob(resolve, 'image/jpeg', 0.9)),
          );
        }),
    });
    return () => setCameraApi(null);
  }, [camera, gl, heroPose, invalidate, setCameraApi, setZoomReturnPose]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!modelReady || !controls) return;
    camera.near = Math.max(radius / 2000, 0.01);
    camera.far = radius * 80;
    camera.updateProjectionMatrix();
    controls.minDistance = radius * 0.01;
    controls.maxDistance = radius * 10;
    controls.maxPolarAngle = Math.PI * 0.55;
    controls.smoothTime = 0.7;
    controls.draggingSmoothTime = 0.08;
    controls.dollyToCursor = true;
    // The default wheel step covers a big fraction of the model in one notch; this makes the
    // wheel feel like a fine adjustment rather than a jump.
    controls.dollySpeed = 0.28;
    const pose = introCamera ?? heroPose();
    if (pose) {
      void controls.setLookAt(
        pose.position.x, pose.position.y, pose.position.z,
        pose.target.x, pose.target.y, pose.target.z,
        false,
      );
    }
    invalidate();
    // Only runs once per model load; the intro camera is read at that moment on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelReady, radius]);

  const wasIntro = useRef(introVisible);
  useEffect(() => {
    const controls = controlsRef.current;
    if (wasIntro.current && !introVisible && controls && modelReady) {
      void controls.dolly(radius * 0.12, true);
    }
    wasIntro.current = introVisible;
    invalidate();
  }, [introVisible, modelReady, radius, invalidate]);

  // The canvas renders on demand. The intro orbit is the one thing that animates without user
  // input, so it keeps asking for the next frame itself.
  const lastDistance = useRef(0);
  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Keep the zoom control in step with the camera, wherever the movement came from.
    const distance = controls.distance;
    if (Math.abs(distance - lastDistance.current) > lastDistance.current * DISTANCE_EPSILON) {
      lastDistance.current = distance;
      setCameraDistance(distance);
    }

    if (!introVisible || !modelReady) return;
    controls.azimuthAngle += delta * INTRO_ORBIT_SPEED;
    invalidate();
  });

  // `regress` lets AdaptiveDpr drop the resolution while the camera is moving.
  return <CameraControls ref={controlsRef} makeDefault regress />;
}
