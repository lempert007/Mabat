/** Where a tag would stand: its foot on screen and how wide it is, px. */
export interface TagSpot {
  x: number;
  y: number;
  width: number;
}

/** A tag's height for its rows: each row, then its padding, stem and the gap under the stem, px. */
const ROW = 18;
const CHROME = 24;
/** Tags closer than this run together; once together, they part only when this far apart, px. */
const JOIN = 4;
const PART = 20;

/**
 * Which tags share one, so no two tags on screen overlap. Each group lists its members top to
 * bottom on screen and stands over the first. Tags that would overlap are merged until none do;
 * tags that were together a moment ago need a wider gap to part, so a tag does not flicker
 * between one and two as things drift past each other.
 */
export function gatherTags(spots: Map<number, TagSpot>, before: number[][]): number[][] {
  const was = new Map<number, number>();
  before.forEach((members, g) => members.forEach((i) => was.set(i, g)));
  const joined = (a: number[], b: number[]) => a.some((i) => was.has(i) && b.some((j) => was.get(j) === was.get(i)));

  const box = (members: number[]) => {
    const top = spots.get(members[0])!;
    const half = Math.max(...members.map((i) => spots.get(i)!.width)) / 2;
    return { left: top.x - half, right: top.x + half, top: top.y - CHROME - ROW * members.length, bottom: top.y };
  };
  const overlap = (a: number[], b: number[]) => {
    const [p, q] = [box(a), box(b)];
    const gap = joined(a, b) ? PART : JOIN;
    return p.left < q.right + gap && q.left < p.right + gap && p.top < q.bottom + gap && q.top < p.bottom + gap;
  };

  const groups = [...spots.keys()].map((i) => [i]);
  for (let merged = true; merged; ) {
    merged = false;
    search: for (let a = 0; a < groups.length; a += 1) {
      for (let b = a + 1; b < groups.length; b += 1) {
        if (!overlap(groups[a], groups[b])) continue;
        groups[a] = [...groups[a], ...groups[b]].sort((i, j) => spots.get(i)!.y - spots.get(j)!.y);
        groups.splice(b, 1);
        merged = true;
        break search;
      }
    }
  }
  return groups;
}
