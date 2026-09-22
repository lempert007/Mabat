import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useViewerStore } from '@/store/viewerStore';
import type { Poi } from '@/types/api';
import type { PoiNavigation } from './usePoiNavigation';

/**
 * Keeps the address bar and the selected point in step, in both directions.
 *
 * Arriving with `?poi=` flies straight there and skips the intro, and selecting a point
 * afterwards rewrites the query so the address is always worth copying. The incoming id is read
 * once at mount, because the rewriting would otherwise overwrite it before it could be used.
 */
export function useShareableUrl(pois: Poi[], nav: PoiNavigation): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const dismissIntro = useViewerStore((s) => s.dismissIntro);
  const modelReady = useViewerStore((s) => s.modelReady);
  const cameraApi = useViewerStore((s) => s.cameraApi);

  const incoming = useRef<string | null>(searchParams.get('poi'));

  useEffect(() => {
    if (!modelReady || !cameraApi || incoming.current === null) return;
    const poi = pois.find((candidate) => candidate.id === incoming.current);
    incoming.current = null;
    if (poi) {
      dismissIntro();
      nav.goTo(poi);
    }
  }, [modelReady, cameraApi, pois, dismissIntro, nav]);

  const selectedId = nav.selected?.id ?? null;
  useEffect(() => {
    if (incoming.current !== null) return; // not applied yet; leave the incoming link alone
    const params = new URLSearchParams(searchParams);
    if ((params.get('poi') ?? null) === selectedId) return;
    if (selectedId) params.set('poi', selectedId);
    else params.delete('poi');
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);
}
