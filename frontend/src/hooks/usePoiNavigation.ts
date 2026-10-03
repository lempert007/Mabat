import { useCallback, useMemo, useRef } from 'react';
import { useViewerStore } from '@/store/viewerStore';
import { poseFromNormal } from '@/lib/vec';
import type { Poi } from '@/types/api';

/** How far back the camera sits from a point that has no saved view, relative to the model radius. */
const FALLBACK_VIEW_DISTANCE = 0.6;

export interface PoiNavigation {
  ordered: Poi[];
  index: number;
  selected: Poi | null;
  goTo: (poi: Poi, smooth?: boolean) => void;
  flyTo: (poi: Poi, smooth?: boolean) => void;
  next: () => void;
  prev: () => void;
}

/**
 * Ordered points, the selected one, and the fly-to helpers shared by the list, panel, markers
 * and tour.
 *
 * `next` and `prev` keep a stable identity across renders by reading the current list through a
 * ref. Without that the tour's countdown and the keyboard listener would be torn down and
 * rebuilt on every render.
 */
export function usePoiNavigation(pois: Poi[], radius: number): PoiNavigation {
  const selectedPoiId = useViewerStore((s) => s.selectedPoiId);
  const selectPoi = useViewerStore((s) => s.selectPoi);
  const whenEditorClean = useViewerStore((s) => s.whenEditorClean);
  const cameraApi = useViewerStore((s) => s.cameraApi);

  const ordered = useMemo(() => [...pois].sort((a, b) => a.sortOrder - b.sortOrder), [pois]);
  const index = ordered.findIndex((poi) => poi.id === selectedPoiId);
  const selected = index === -1 ? null : ordered[index];

  const flyTo = useCallback(
    (poi: Poi, smooth = true) => {
      const pose = poi.camera ?? poseFromNormal(poi.position, poi.normal, radius * FALLBACK_VIEW_DISTANCE);
      cameraApi?.flyTo(pose, smooth);
    },
    [cameraApi, radius],
  );

  const goTo = useCallback(
    (poi: Poi, smooth = true) =>
      whenEditorClean(() => {
        selectPoi(poi.id);
        flyTo(poi, smooth);
      }),
    [selectPoi, flyTo, whenEditorClean],
  );

  const latest = useRef({ ordered, index, goTo });
  latest.current = { ordered, index, goTo };

  const step = useCallback((delta: 1 | -1) => {
    const { ordered: list, index: current, goTo: go } = latest.current;
    if (list.length === 0) return;
    const target =
      current === -1
        ? delta === 1
          ? 0
          : list.length - 1
        : (current + delta + list.length) % list.length;
    go(list[target]);
  }, []);

  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);

  return useMemo(
    () => ({ ordered, index, selected, goTo, flyTo, next, prev }),
    [ordered, index, selected, goTo, flyTo, next, prev],
  );
}
