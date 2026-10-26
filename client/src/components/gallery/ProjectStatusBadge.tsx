import { AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { ProjectStageBadge } from './ProjectStageBadge';
import type { Project } from '@/types/api';
import { t } from '@/i18n/he';

/**
 * One badge per card. While the upload is still being dealt with, that is the only thing worth
 * saying; once it is done the card shows where the editor has put the project instead.
 */
interface ProjectStatusBadgeProps {
  project: Project;
  onToggleStage?: () => void;
}

export function ProjectStatusBadge({ project, onToggleStage }: ProjectStatusBadgeProps) {
  switch (project.status) {
    case 'failed':
      return (
        <Badge tone="danger">
          <AlertTriangle size={12} /> {t.gallery.failed}
        </Badge>
      );
    case 'processing':
      return (
        <Badge tone="accent">
          <Spinner size={12} /> {t.gallery.processing}
        </Badge>
      );
    case 'uploaded':
      return (
        <Badge>
          <Clock size={12} /> {t.gallery.uploaded}
        </Badge>
      );
    default:
      return <ProjectStageBadge stage={project.stage} onToggle={onToggleStage} />;
  }
}
