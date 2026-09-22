import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ViewerCanvas } from './ViewerCanvas';
import { MarkerLayer } from './MarkerLayer';
import { LoadingOverlay } from './LoadingOverlay';
import { IntroOverlay } from './IntroOverlay';
import { ViewerHud } from './ViewerHud';
import { PoiList } from './PoiList';
import { PoiPanel } from './PoiPanel';
import { TourControls } from './TourControls';
import { ViewerBottomBar } from './ViewerBottomBar';
import { ZoomControl } from './ZoomControl';
import { ControlsHint } from './ControlsHint';
import { ShareDialog } from './ShareDialog';
import { ImportPointsDialog } from './ImportPointsDialog';
import { ContextMenu } from '@/components/ui/ContextMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SceneSettingsPanel } from './SceneSettingsPanel';
import { useCreatePoi, useDeletePoi, useUpdatePoi } from '@/api/pois';
import { usePoiNavigation } from '@/hooks/usePoiNavigation';
import { useViewerKeyboard } from '@/hooks/useViewerKeyboard';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useShareableUrl } from '@/hooks/useShareableUrl';
import { useAutomaticCover } from '@/hooks/useAutomaticCover';
import { usePointContextMenu } from '@/hooks/usePointContextMenu';
import { usePointsTransfer } from '@/hooks/usePointsTransfer';
import { useViewerStore } from '@/store/viewerStore';
import { errorMessage } from '@/lib/errorMessage';
import { toast } from '@/store/toastStore';
import { modelRadius } from '@/lib/model';
import { closeUpPose } from '@/lib/vec';
import type { Category, Poi, Project, SessionInfo, Vec3 } from '@/types/api';
import { t } from '@/i18n/he';

interface ViewerProps {
  project: Project;
  pois: Poi[];
  categories: Category[];
  session: SessionInfo;
}

/** How close a double-click zoom sits to the surface, relative to the model radius. */
const FOCUS_DISTANCE = 0.18;

export function Viewer({ project, pois, categories, session }: ViewerProps) {
  const editable = session.role === 'editor';
  const radius = useMemo(() => modelRadius(project), [project]);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(containerRef);
  const [shareOpen, setShareOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const movingPoiId = useViewerStore((s) => s.movingPoiId);
  const setMovingPoi = useViewerStore((s) => s.setMovingPoi);
  const selectPoi = useViewerStore((s) => s.selectPoi);
  const setPendingEdit = useViewerStore((s) => s.setPendingEdit);
  const cameraApi = useViewerStore((s) => s.cameraApi);
  const zoomReturnPose = useViewerStore((s) => s.zoomReturnPose);
  const setZoomReturnPose = useViewerStore((s) => s.setZoomReturnPose);
  const reset = useViewerStore((s) => s.reset);

  const nav = usePoiNavigation(pois, radius);
  const createPoi = useCreatePoi(project.id);
  const updatePoi = useUpdatePoi(project.id);
  const deletePoi = useDeletePoi(project.id);
  const transfer = usePointsTransfer(project);


  useViewerKeyboard({ next: nav.next, prev: nav.prev });

  // Fresh store for every project visit.
  useEffect(() => () => reset(), [project.id, reset]);

  useShareableUrl(pois, nav);
  useAutomaticCover(project, editable);

  // Moving to a point takes the camera somewhere of its own, which retires any view that a
  // double-click zoom was holding on to.
  useEffect(() => {
    setZoomReturnPose(null);
  }, [nav.selected?.id, setZoomReturnPose]);

  // Double-click focuses the spot under the pointer; double-clicking again returns to the
  // view it was called from. Flying to a point elsewhere retires that return view.
  const onInspect = useCallback(
    (point: Vec3) => {
      if (!cameraApi) return;
      if (zoomReturnPose) {
        cameraApi.flyTo(zoomReturnPose);
        setZoomReturnPose(null);
        return;
      }
      const current = cameraApi.getPose();
      setZoomReturnPose(current);
      cameraApi.flyTo(closeUpPose(current.position, point, radius * FOCUS_DISTANCE));
    },
    [cameraApi, zoomReturnPose, setZoomReturnPose, radius],
  );

  const createPointAt = useCallback(
    (position: Vec3, normal: Vec3) => {
      createPoi.mutate(
        { position, normal, camera: cameraApi?.getPose() ?? null },
        {
          onSuccess: (poi) => {
            setMovingPoi(null);
            setPendingEdit(poi.id);
            selectPoi(poi.id);
          },
          onError: (error) => toast.error(errorMessage(error)),
        },
      );
    },
    [cameraApi, createPoi, setMovingPoi, setPendingEdit, selectPoi],
  );

  /** Drops the point being moved wherever the editor clicked next. */
  const onPlace = useCallback(
    (position: Vec3, normal: Vec3) => {
      if (!movingPoiId) return;
      updatePoi.mutate(
        { id: movingPoiId, data: { position, normal } },
        {
          onSuccess: () => setMovingPoi(null),
          onError: (error) => toast.error(errorMessage(error)),
        },
      );
    },
    [movingPoiId, updatePoi, setMovingPoi],
  );

  const editPoint = useCallback(
    (poi: Poi) => {
      selectPoi(poi.id);
      setPendingEdit(poi.id);
    },
    [selectPoi, setPendingEdit],
  );

  const contextMenu = usePointContextMenu({ addPointAt: createPointAt, editPoint });

  // Stable identities so the memoized markers are not rebuilt on every render.
  const selectFromScene = useCallback((poi: Poi) => nav.goTo(poi), [nav]);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const startTour = useCallback(() => {
    const first = nav.ordered[0];
    if (first) nav.goTo(first);
  }, [nav]);

  // Titles for the panel's previous/next buttons.
  const adjacent = useMemo(() => {
    const count = nav.ordered.length;
    if (nav.index === -1 || count === 0) return { previous: null, next: null };
    return {
      previous: nav.ordered[(nav.index - 1 + count) % count],
      next: nav.ordered[(nav.index + 1) % count],
    };
  }, [nav.ordered, nav.index]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-bg select-none">
      <ViewerCanvas
        project={project}
        pois={nav.ordered}
        placing={movingPoiId !== null}
        onPlace={onPlace}
        onInspect={onInspect}
        onRightClick={editable ? contextMenu.openForSurface : null}
      />
      <MarkerLayer
        pois={nav.ordered}
        categories={categories}
        onSelect={selectFromScene}
        onContextMenu={editable ? contextMenu.openForMarker : null}
      />

      <ViewerHud
        project={project}
        editable={editable}
        fullscreen={fullscreen}
        onShare={() => setShareOpen(true)}
        onSettings={openSettings}
        onExportPoints={transfer.exportPoints}
        onImportPoints={transfer.openFilePicker}
        exportingPoints={transfer.isExporting}
        hasPoints={nav.ordered.length > 0}
      />
      <PoiList
        projectId={project.id}
        ordered={nav.ordered}
        categories={categories}
        editable={editable}
        onSelect={selectFromScene}
      />
      <PoiPanel
        poi={nav.selected}
        index={nav.index}
        total={nav.ordered.length}
        previous={adjacent.previous}
        next={adjacent.next}
        categories={categories}
        editable={editable}
        onPrev={nav.prev}
        onNext={nav.next}
      />
      <ViewerBottomBar>
        <ZoomControl />
        <TourControls
          total={nav.ordered.length}
          index={nav.index}
          onPrev={nav.prev}
          onNext={nav.next}
          onStart={startTour}
        />
      </ViewerBottomBar>
      <ControlsHint editable={editable} />

      <IntroOverlay project={project} />
      <LoadingOverlay />

      <ContextMenu anchor={contextMenu.anchor} items={contextMenu.items} onClose={contextMenu.close} />

      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} projectId={project.id} poi={nav.selected} />

      <input
        ref={transfer.inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => transfer.onFilePicked(event.target.files?.[0])}
      />
      <ImportPointsDialog
        projectId={project.id}
        document={transfer.incoming}
        existingPointCount={nav.ordered.length}
        onClose={transfer.clearIncoming}
      />
      <ConfirmDialog
        open={contextMenu.pendingDelete !== null}
        title={t.panel.deletePoint}
        body={t.panel.deletePointBody}
        loading={deletePoi.isPending}
        onClose={contextMenu.clearPendingDelete}
        onConfirm={() =>
          contextMenu.pendingDelete &&
          deletePoi.mutate(contextMenu.pendingDelete.id, {
            onSuccess: contextMenu.clearPendingDelete,
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      />
      {editable && (
        <SceneSettingsPanel
          open={settingsOpen}
          onClose={closeSettings}
          project={project}
          categories={categories}
        />
      )}
    </div>
  );
}
