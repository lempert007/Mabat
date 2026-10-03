import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Expand,
  FileDown,
  FileUp,
  Home,
  List,
  Minimize,
  Settings2,
  Share2,
} from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { useViewerStore } from '@/store/viewerStore';
import type { Project } from '@/types/api';
import { counted } from '@/lib/counted';
import { t } from '@/i18n/he';

interface ViewerHudProps {
  project: Project;
  editable: boolean;
  fullscreen: { active: boolean; toggle: () => void; supported: boolean };
  onShare: () => void;
  onSettings: () => void;
  onExportPoints: () => void;
  onImportPoints: () => void;
  exportingPoints: boolean;
  /** Counted from the live list, so a point just added shows up at once. */
  pointCount: number;
}

export function ViewerHud({
  project,
  editable,
  fullscreen,
  onShare,
  onSettings,
  onExportPoints,
  onImportPoints,
  exportingPoints,
  pointCount,
}: ViewerHudProps) {
  const navigate = useNavigate();
  const listOpen = useViewerStore((s) => s.listOpen);
  const toggleList = useViewerStore((s) => s.toggleList);
  const introVisible = useViewerStore((s) => s.introVisible);
  const cameraApi = useViewerStore((s) => s.cameraApi);
  const whenEditorClean = useViewerStore((s) => s.whenEditorClean);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between p-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full glass ps-1.5 pe-4 h-12">
        <IconButton label={t.common.back} onClick={() => whenEditorClean(() => navigate('/'))}>
          <ArrowLeft size={18} />
        </IconButton>
        <div className="flex flex-col leading-tight">
          <span className="text-[14px] font-semibold tracking-title truncate max-w-[220px] sm:max-w-[360px]">{project.name}</span>
          <span className="text-[11px] text-fg-3">
            {counted(pointCount, t.gallery.onePoint, t.gallery.manyPoints)}
          </span>
        </div>
      </div>

      {!introVisible && (
        <div className="pointer-events-auto flex items-center gap-1 rounded-full glass p-1 h-12">
          <span className="hidden md:contents">
            <IconButton label={t.viewer.points} active={listOpen} onClick={toggleList}>
              <List size={18} />
            </IconButton>
          </span>
          <IconButton label={t.viewer.resetView} onClick={() => cameraApi?.fitToModel()}>
            <Home size={18} />
          </IconButton>
          <IconButton label={t.viewer.share} onClick={onShare}>
            <Share2 size={18} />
          </IconButton>
          {editable && (
            <>
              <IconButton
                label={t.settings.exportPoints}
                disabled={pointCount === 0 || exportingPoints}
                onClick={onExportPoints}
              >
                <FileDown size={18} />
              </IconButton>
              <IconButton label={t.settings.importPoints} onClick={onImportPoints}>
                <FileUp size={18} />
              </IconButton>
              <IconButton label={t.viewer.settings} onClick={onSettings}>
                <Settings2 size={18} />
              </IconButton>
            </>
          )}
          {fullscreen.supported && (
            <IconButton label={fullscreen.active ? t.viewer.exitFullscreen : t.viewer.fullscreen} onClick={fullscreen.toggle}>
              {fullscreen.active ? <Minimize size={18} /> : <Expand size={18} />}
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}
