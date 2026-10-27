import { describe, expect, it } from 'vitest';
import { gatherTags, type TagSpot } from './tags';

const spots = (entries: [number, TagSpot][]) => new Map(entries);

describe('gatherTags', () => {
  it('keeps tags apart when they do not touch', () => {
    const groups = gatherTags(spots([[0, { x: 100, y: 100, width: 80 }], [1, { x: 400, y: 100, width: 80 }]]), []);
    expect(groups).toEqual([[0], [1]]);
  });

  it('runs a stack into one tag, top to bottom, standing over the highest', () => {
    const stack = spots([
      [1, { x: 300, y: 330, width: 70 }],
      [2, { x: 302, y: 320, width: 70 }],
      [3, { x: 301, y: 310, width: 70 }],
    ]);
    expect(gatherTags(stack, [])).toEqual([[3, 2, 1]]);
  });

  it('merges a tag that only a taller, merged tag would reach', () => {
    // Apart as single rows, but the pair's two rows reach up onto the tag above it.
    const groups = gatherTags(
      spots([
        [0, { x: 300, y: 200, width: 80 }],
        [1, { x: 300, y: 205, width: 80 }],
        [2, { x: 300, y: 150, width: 80 }],
      ]),
      [],
    );
    expect(groups).toEqual([[2, 0, 1]]);
  });

  it('needs a wider gap to part tags that were together', () => {
    const near = spots([[0, { x: 100, y: 100, width: 80 }], [1, { x: 190, y: 100, width: 80 }]]);
    expect(gatherTags(near, [])).toEqual([[0], [1]]);
    expect(gatherTags(near, [[0, 1]])).toEqual([[0, 1]]);
  });
});
