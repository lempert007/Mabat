import { create } from 'zustand';
import type { CameraPose } from '@/types/api';

/** Imperative camera API registered by CameraRig so UI outside the canvas can drive the camera. */
export interface CameraApi {
  flyTo: (pose: CameraPose, smooth?: boolean) => void;
  getPose: () => CameraPose;
  fitToModel: (smooth?: boolean) => void;
  capture: () => Promise<Blob | null>;
  /** How far the camera may sit from its target, as the rig has configured it. */
  distanceRange: () => { min: number; max: number };
  setDistance: (distance: number, smooth?: boolean) => void;
}

interface ViewerState {
  introVisible: boolean;
  selectedPoiId: string | null;
  hoveredPoiId: string | null;
  listOpen: boolean;
  search: string;
  categoryFilter: string | null;
  /** Point waiting to be dropped somewhere new; the next click on the model moves it. */
  movingPoiId: string | null;
  tourPlaying: boolean;
  cameraApi: CameraApi | null;
  /** Distance from the camera to its target, republished as the camera moves. */
  cameraDistance: number;
  modelReady: boolean;
  /** Point that should open in the editor as soon as the panel shows it (set after placing a new point). */
  pendingEditPoiId: string | null;
  /** Where to return to when a double-click zoom is undone. Null while not zoomed in. */
  zoomReturnPose: CameraPose | null;
  /** The open point editor holds changes that are not saved yet. */
  editorDirty: boolean;
  /** What to do once the editor agrees to drop its changes. Non-null while that is being asked. */
  pendingDiscard: (() => void) | null;

  dismissIntro: () => void;
  showIntro: () => void;
  selectPoi: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  toggleList: () => void;
  setListOpen: (open: boolean) => void;
  setSearch: (search: string) => void;
  setCategoryFilter: (categoryId: string | null) => void;
  setMovingPoi: (id: string | null) => void;
  setTourPlaying: (playing: boolean) => void;
  setCameraApi: (api: CameraApi | null) => void;
  setCameraDistance: (distance: number) => void;
  setModelReady: (ready: boolean) => void;
  setPendingEdit: (id: string | null) => void;
  setZoomReturnPose: (pose: CameraPose | null) => void;
  setEditorDirty: (dirty: boolean) => void;
  /** Runs `action` now, or after the editor confirms losing unsaved changes. */
  whenEditorClean: (action: () => void) => void;
  confirmDiscard: () => void;
  cancelDiscard: () => void;
  reset: () => void;
}

const initialState = {
  introVisible: true,
  selectedPoiId: null,
  hoveredPoiId: null,
  listOpen: true,
  search: '',
  categoryFilter: null,
  movingPoiId: null as string | null,
  tourPlaying: false,
  cameraApi: null,
  cameraDistance: 0,
  modelReady: false,
  pendingEditPoiId: null,
  zoomReturnPose: null as CameraPose | null,
  editorDirty: false,
  pendingDiscard: null as (() => void) | null,
};

export const useViewerStore = create<ViewerState>((set, get) => ({
  ...initialState,
  dismissIntro: () => set({ introVisible: false }),
  showIntro: () =>
    set({
      introVisible: true,
      selectedPoiId: null,
      tourPlaying: false,
      zoomReturnPose: null,
      movingPoiId: null,
    }),
  selectPoi: (selectedPoiId) => set({ selectedPoiId }),
  setHovered: (hoveredPoiId) => set({ hoveredPoiId }),
  toggleList: () => set((state) => ({ listOpen: !state.listOpen })),
  setListOpen: (listOpen) => set({ listOpen }),
  setSearch: (search) => set({ search }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setMovingPoi: (movingPoiId) => set({ movingPoiId }),
  setTourPlaying: (tourPlaying) => set({ tourPlaying }),
  setCameraApi: (cameraApi) => set({ cameraApi }),
  setCameraDistance: (cameraDistance) => set({ cameraDistance }),
  setModelReady: (modelReady) => set({ modelReady }),
  setPendingEdit: (pendingEditPoiId) => set({ pendingEditPoiId }),
  setZoomReturnPose: (zoomReturnPose) => set({ zoomReturnPose }),
  setEditorDirty: (editorDirty) => set({ editorDirty }),
  whenEditorClean: (action) => {
    if (get().editorDirty) set({ pendingDiscard: action });
    else action();
  },
  confirmDiscard: () => {
    const action = get().pendingDiscard;
    set({ pendingDiscard: null, editorDirty: false });
    action?.();
  },
  cancelDiscard: () => set({ pendingDiscard: null }),
  reset: () => set({ ...initialState }),
}));
