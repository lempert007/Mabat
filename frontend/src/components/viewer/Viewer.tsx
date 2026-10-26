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
import { ViewSwitch } from '@/components/mission/ViewSwitch';
import { MissionHud } from '@/components/mission/MissionHud';
import { PlacementBanner } from '@/components/mission/PlacementBanner';
import { MissionPanel } from '@/components/mission/MissionPanel';
import { useCreatePoi, useDeletePoi, useUpdatePoi } from '@/api/pois';
import { usePoiNavigation } from '@/hooks/usePoiNavigation';
import { useViewerKeyboard } from '@/hooks/useViewerKeyboard';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useShareableUrl } from '@/hooks/useShareableUrl';
import { useAutomaticCover } from '@/hooks/useAutomaticCover';
import { usePointContextMenu } from '@/hooks/usePointContextMenu';
import { usePointsTransfer } from '@/hooks/usePointsTransfer';
import { useMission } from '@/hooks/useMission';
import { useViewerStore } from '@/store/viewerStore';
import { useMissionStore } from '@/store/missionStore';
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
  const [missionOpen, setMissionOpen] = useState(false);

  const movingPoiId = useViewerStore((s) => s.movingPoiId);
  const setMovingPoi = useViewerStore((s) => s.setMovingPoi);
  const selectPoi = useViewerStore((s) => s.selectPoi);
  const setPendingEdit = useViewerStore((s) => s.setPendingEdit);
  const cameraApi = useViewerStore((s) => s.cameraApi);
  const zoomReturnPose = useViewerStore((s) => s.zoomReturnPose);
  const setZoomReturnPose = useViewerStore((s) => s.setZoomReturnPose);
  const reset = useViewerStore((s) => s.reset);
  const whenEditorClean = useViewerStore((s) => s.whenEditorClean);
  const pendingDiscard = useViewerStore((s) => s.pendingDiscard);
  const confirmDiscard = useViewerStore((s) => s.confirmDiscard);
  const cancelDiscard = useViewerStore((s) => s.cancelDiscard);
  const introVisible = useViewerStore((s) => s.introVisible);

  const nav = usePoiNavigation(pois, radius);
  const createPoi = useCreatePoi(project.id);
  const updatePoi = useUpdatePoi(project.id);
  const deletePoi = useDeletePoi(project.id);
  const transfer = usePointsTransfer(project);

  const show = useMission(project);
  const { plan, step, place } = show;
  const view = useMissionStore((s) => s.view);
  const missionPlacing = useMissionStore((s) => s.placing);
  const dismissIntro = useViewerStore((s) => s.dismissIntro);

  // Fresh stores for every project visit.
  useEffect(
    () => () => {
      reset();
      useMissionStore.getState().reset();
    },
    [project.id, reset],
  );

  const stageBack = useCallback(() => step(-1), [step]);
  const stageForward = useCallback(() => step(1), [step]);

  // The mission's timeline runs left to right like any player; the points read right to left.
  useViewerKeyboard({
    left: show.visible ? stageBack : nav.next,
    right: show.visible ? stageForward : nav.prev,
    togglePlay: show.visible ? show.togglePlay : undefined,
    enter: plan ? show.watch : dismissIntro,
    undoPlace: show.undoPlace,
  });

  // The handles for editing are drawn while the panel is open.
  useEffect(() => useMissionStore.getState().setEditing(missionOpen), [missionOpen]);

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
            whenEditorClean(() => {
              setPendingEdit(poi.id);
              selectPoi(poi.id);
            });
          },
          onError: (error) => toast.error(errorMessage(error)),
        },
      );
    },
    [cameraApi, createPoi, setMovingPoi, setPendingEdit, selectPoi, whenEditorClean],
  );

  /** Drops the point being moved wherever the editor clicked next. */
  const onPlace = useCallback(
    (position: Vec3, normal: Vec3) => {
      if (useMissionStore.getState().placing !== null) {
        place(position);
        return;
      }
      if (!movingPoiId) return;
      updatePoi.mutate(
        { id: movingPoiId, data: { position, normal } },
        {
          onSuccess: () => setMovingPoi(null),
          onError: (error) => toast.error(errorMessage(error)),
        },
      );
    },
    [movingPoiId, updatePoi, setMovingPoi, place],
  );

  const editPoint = useCallback(
    (poi: Poi) =>
      whenEditorClean(() => {
        selectPoi(poi.id);
        setPendingEdit(poi.id);
      }),
    [selectPoi, setPendingEdit, whenEditorClean],
  );

  const contextMenu = usePointContextMenu({ addPointAt: createPointAt, editPoint });

  // Stable identities so the memoized markers are not rebuilt on every render.
  const selectFromScene = useCallback((poi: Poi) => nav.goTo(poi), [nav]);
  // The two floating panels open in the same place, so one gives way to the other.
  const openSettings = useCallback(() => {
    setMissionOpen(false);
    setSettingsOpen(true);
  }, []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const toggleMission = useCallback(() => {
    setSettingsOpen(false);
    if (!missionOpen && plan) useMissionStore.getState().setView('mission');
    setMissionOpen(!missionOpen);
  }, [missionOpen, plan]);
  // Escape stops a placement before it closes the panel the placement came from.
  const closeMission = useCallback(() => {
    const store = useMissionStore.getState();
    if (store.placing !== null) store.setPlacing(null);
    else setMissionOpen(false);
  }, []);
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
        plan={plan}
        placing={movingPoiId !== null || missionPlacing !== null}
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
        onMission={toggleMission}
        missionOpen={missionOpen}
        onExportPoints={transfer.exportPoints}
        onImportPoints={transfer.openFilePicker}
        exportingPoints={transfer.isExporting}
        pointCount={nav.ordered.length}
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
      {plan && !introVisible && <ViewSwitch onWatch={show.watch} />}
      {show.visible && plan && show.mission ? (
        <MissionHud
          plan={plan}
          mission={show.mission}
          stage={show.stage}
          onStep={show.step}
          telemetryHidden={nav.selected !== null}
          update={editable ? show.update : undefined}
        />
      ) : (
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
      )}
      <ControlsHint
        key={view}
        editable={editable && !show.visible}
        hint={show.visible ? t.mission.keysHint : undefined}
      />
      <PlacementBanner mission={show.mission} onUndo={show.undoPlace} />

      <IntroOverlay project={project} onWatch={plan ? show.watch : undefined} />
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
      <ConfirmDialog
        open={pendingDiscard !== null}
        title={t.panel.discardTitle}
        body={t.panel.discardBody}
        confirmLabel={t.panel.discardConfirm}
        onClose={cancelDiscard}
        onConfirm={confirmDiscard}
      />
      {editable && (
        <MissionPanel
          open={missionOpen}
          onClose={closeMission}
          project={project}
          mission={show.mission}
          plan={plan}
          update={show.update}
          remove={show.remove}
          onPreviewStage={show.preview}
        />
      )}
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
