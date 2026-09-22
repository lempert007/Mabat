import type { Project } from '@/types/api';

/** Half of the model's bounding diagonal. Used to scale camera limits, fog and marker offsets. */
export function modelRadius(project: Project): number {
  const extents = project.modelStats.extents;
  if (!extents) return 50;
  const [x, y, z] = extents;
  const diagonal = Math.sqrt(x * x + y * y + z * z);
  return diagonal > 0 ? diagonal / 2 : 50;
}
