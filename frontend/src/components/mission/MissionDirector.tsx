import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type CameraControlsImpl from 'camera-controls';
import { MathUtils, Raycaster, Vector3 } from 'three';
import { missionLive } from '@/store/missionLive';
import { useMissionStore } from '@/store/missionStore';
import { sceneRefs } from '@/store/sceneRefs';
import { DEFAULT_SHOTS } from '@/lib/mission/defaults';
import { shotPose, type ShotPose } from '@/lib/mission/shots';
import type { MissionFrame, MissionPlan } from '@/lib/mission/types';
import type { Mission } from '@/types/api';

/** Moving from one shot to the next takes this long, s. */
const BLEND = 1.8;
/** Taking up the action when following starts or switches drone, s. */
const FOLLOW_BLEND = 0.8;

const ease = (value: number) => MathUtils.smootherstep(value, 0, 1);

/**
 * Drives the camera while a mission plays.
 *
 * In cinematic mode each stage has a shot, and every shot is worked out afresh each frame from
 * where the drones are, so the camera never lags behind them. Changing shot blends from where
 * the camera was. A shot that a building would block comes in front of it, and eases back out
 * once it is clear.
 *
 * Taking hold of the camera hands it over: to following, where the viewer orbits and zooms and
 * the camera keeps the action in the middle, or, when they pan or are editing, to them outright.
 */
export function MissionDirector({ plan, mission }: { plan: MissionPlan; mission: Mission }) {
  const controls = useThree((s) => s.controls) as unknown as CameraControlsImpl | null;
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  const raycaster = useMemo(() => {
    const instance = new Raycaster();
    instance.firstHitOnly = true;
    return instance;
  }, []);
  const shot = useRef<{ name: string | null; from: ShotPose; startedAt: number; clear: number }>({
    name: null,
    from: { eye: new Vector3(), target: new Vector3() },
    startedAt: 0,
    clear: Infinity,
  });
  const follow = useRef<{ subject: MissionFrame['subject'] | null; from: Vector3; startedAt: number }>({
    subject: null,
    from: new Vector3(),
    startedAt: 0,
  });

  // A mission's best views look up at a drone from the ground and come in close to the actors,
  // which the limits that suit exploring the model would not allow.
  useEffect(() => {
    if (!controls) return;
    const { maxPolarAngle, minDistance } = controls;
    controls.maxPolarAngle = Math.PI * 0.94;
    controls.minDistance = plan.unitsPerMeter * 0.8;
    return () => {
      controls.maxPolarAngle = maxPolarAngle;
      controls.minDistance = minDistance;
    };
  }, [controls, plan.unitsPerMeter]);

  // Taking hold of the camera hands it over. Orbiting or zooming during the show keeps following
  // the action. Panning with the right or middle button means moving around the model, which
  // following would undo every frame, so that frees the camera; so does any grab while the
  // mission is being edited, where the camera is a working tool. The wheel never reports a
  // "control start", so it and the buttons are listened for on the canvas itself.
  useEffect(() => {
    if (!controls) return;
    const canvas = gl.domElement;
    const takeOver = () => {
      const store = useMissionStore.getState();
      if (store.camera === 'cinematic') store.setCamera(store.editing ? 'free' : 'follow');
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button === 1 || event.button === 2) useMissionStore.getState().setCamera('free');
    };
    controls.addEventListener('controlstart', takeOver);
    canvas.addEventListener('wheel', takeOver, { passive: true });
    canvas.addEventListener('pointerdown', onPointerDown);
    return () => {
      controls.removeEventListener('controlstart', takeOver);
      canvas.removeEventListener('wheel', takeOver);
      canvas.removeEventListener('pointerdown', onPointerDown);
    };
  }, [controls, gl]);

  useFrame(({ clock }, delta) => {
    const frame = missionLive.frame;
    if (!frame || !controls) return;
    const { camera: mode, time } = useMissionStore.getState();
    const kind = plan.stages[frame.stage].kind;
    const now = clock.elapsedTime;

    if (mode !== 'cinematic') shot.current.name = null;
    if (mode !== 'follow') follow.current.subject = null;

    if (mode === 'follow') {
      const { subject, focus: anchor } = frame;
      const state = follow.current;
      if (state.subject !== subject) {
        controls.getTarget(state.from);
        state.subject = subject;
        state.startedAt = now;
      }
      const blend = ease((now - state.startedAt) / FOLLOW_BLEND);
      const target = state.from.clone().lerp(anchor, blend);
      void controls.moveTo(target.x, target.y, target.z, false);
      controls.update(0);
      if (blend < 1) invalidate();
      return;
    }

    if (mode !== 'cinematic') return;

    const name = mission.stages[kind]?.shot ?? DEFAULT_SHOTS[kind];
    // A new shot, or the same one on someone else, blends from wherever the camera was.
    const key = `${name}:${frame.subject}`;
    const state = shot.current;
    if (state.name !== key) {
      controls.getPosition(state.from.eye);
      controls.getTarget(state.from.target);
      state.name = key;
      state.startedAt = now;
      state.clear = Infinity;
    }

    const pose = shotPose(name, plan, frame, time);
    const blend = ease((now - state.startedAt) / BLEND);
    const eye = state.from.eye.clone().lerp(pose.eye, blend);
    const target = state.from.target.clone().lerp(pose.target, blend);

    // Pull in front of anything between the subject and the lens; drift back out once it clears.
    const toEye = eye.clone().sub(target);
    const distance = toEye.length();
    const model = sceneRefs.model;
    let reach = distance;
    if (model && distance > 0) {
      raycaster.set(target, toEye.normalize());
      raycaster.far = distance;
      const [hit] = raycaster.intersectObject(model, true);
      if (hit) reach = Math.max(hit.distance - 0.6 * plan.unitsPerMeter, distance * 0.15);
    }
    state.clear = reach < state.clear ? reach : MathUtils.damp(state.clear, reach, 1.5, delta);
    if (state.clear < distance) eye.copy(target).addScaledVector(toEye, state.clear);

    void controls.setLookAt(eye.x, eye.y, eye.z, target.x, target.y, target.z, false);
    controls.update(0);
    if (blend < 1 || Math.abs(state.clear - reach) > 1e-3) invalidate();
  });

  return null;
}
