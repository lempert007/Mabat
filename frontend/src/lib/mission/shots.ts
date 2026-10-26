import { Vector3 } from 'three';
import type { MissionFrame, MissionPlan } from './types';
import type { CameraShot } from '@/types/api';

export interface ShotPose {
  eye: Vector3;
  target: Vector3;
}

const UP = new Vector3(0, 1, 0);

/**
 * Where the cinematic camera wants to be for a shot, at one moment of the flight.
 *
 * Shots are framed around the vehicles rather than fixed in the scene, so they work on any
 * model and any route. The director eases between them; this only says where to aim.
 */
export function shotPose(shot: CameraShot, plan: MissionPlan, frame: MissionFrame, time: number): ShotPose {
  const u = plan.unitsPerMeter;
  const reach = Math.max(plan.size.carrier * 6, 20 * u);
  const forward = new Vector3(Math.sin(frame.heading), 0, Math.cos(frame.heading));
  const right = new Vector3(-forward.z, 0, forward.x);
  const carrier = frame.carrier;

  switch (shot) {
    case 'chase':
      return {
        eye: carrier.clone().addScaledVector(forward, -reach).addScaledVector(UP, reach * 0.55).addScaledVector(right, reach * 0.2),
        target: carrier.clone().addScaledVector(forward, reach * 0.4).addScaledVector(UP, -reach * 0.15),
      };
    case 'side':
      return {
        eye: carrier.clone().addScaledVector(right, reach * 1.1).addScaledVector(UP, reach * 0.45).addScaledVector(forward, -reach * 0.15),
        target: carrier.clone().addScaledVector(forward, reach * 0.1).addScaledVector(UP, -reach * 0.1),
      };
    case 'orbit': {
      const angle = time * 0.15 + 0.8;
      const around = new Vector3(Math.sin(angle), 0.55, Math.cos(angle)).multiplyScalar(reach * 1.1);
      return { eye: carrier.clone().add(around), target: carrier.clone() };
    }
    case 'wide': {
      const target = carrier.clone().lerp(plan.drop, 0.5);
      const distance = Math.max(plan.site.radius * 0.9, carrier.distanceTo(plan.drop) * 1.2);
      const offset = new Vector3(-0.55, 0.62, 0.56).normalize().multiplyScalar(distance);
      return { eye: target.clone().add(offset), target };
    }
    case 'ground': {
      // Ride down beside the droid like a camera on a crane, a little above it. It stands on the
      // outer side of the drop and looks back across the site, so the model fills the background,
      // and looking slightly down keeps the yard the droid is heading for in the picture.
      const away = plan.drop.clone().sub(plan.site.center).setY(0);
      if (away.lengthSq() < u * u) away.subVectors(plan.drop, plan.hover).setY(0);
      if (away.lengthSq() < u * u) away.set(-0.6, 0, 0.8);
      away.normalize();
      const eye = plan.drop.clone().addScaledVector(away, 12 * u);
      eye.y = Math.max(frame.droid.y + 2.5 * u, plan.drop.y + 3 * u);
      return { eye, target: frame.droid.clone() };
    }
    case 'top':
      return {
        eye: frame.droid.clone().addScaledVector(UP, 18 * u).addScaledVector(forward, -0.5 * u),
        target: frame.droid.clone().lerp(plan.drop, 0.6),
      };
    case 'droid':
      return {
        eye: frame.droid.clone().addScaledVector(right, 4 * u).addScaledVector(UP, 1.5 * u).addScaledVector(forward, -u),
        target: frame.droid.clone().lerp(frame.parcel, 0.5),
      };
  }
}
