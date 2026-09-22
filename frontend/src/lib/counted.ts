import { fill } from './interpolate';

/** Hebrew has a distinct singular, so a count picks between two phrasings. */
export function counted(count: number, one: string, many: string): string {
  return count === 1 ? one : fill(many, { count });
}
