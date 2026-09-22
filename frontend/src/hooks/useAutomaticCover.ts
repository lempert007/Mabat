import { useEffect } from 'react';
import { useSetProjectThumbnail } from '@/api/projects';
import { useViewerStore } from '@/store/viewerStore';
import type { Project } from '@/types/api';

/** Long enough for the opening move to settle before the picture is taken. */
const DELAY_MS = 2500;

/**
 * Gives a project a cover the first time an editor opens it, so the gallery is never a wall of
 * blank cards. Once a project has one, this does nothing.
 */
export function useAutomaticCover(project: Project, editable: boolean): void {
  const modelReady = useViewerStore((s) => s.modelReady);
  const cameraApi = useViewerStore((s) => s.cameraApi);
  const setThumbnail = useSetProjectThumbnail(project.id);

  useEffect(() => {
    if (!editable || project.hasThumbnail || !modelReady || !cameraApi) return;
    const timer = window.setTimeout(async () => {
      const blob = await cameraApi.capture();
      if (blob) setThumbnail.mutate(blob);
    }, DELAY_MS);
    return () => window.clearTimeout(timer);
    // setThumbnail is a fresh object each render; including it would restart the timer forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, project.hasThumbnail, modelReady, cameraApi]);
}
