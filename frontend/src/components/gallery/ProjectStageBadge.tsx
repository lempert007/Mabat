import { CheckCircle2, PencilLine } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { ProjectStage } from '@/types/api';
import { t } from '@/i18n/he';

interface ProjectStageBadgeProps {
  stage: ProjectStage;
  /** Editors flip the stage by pressing the badge; for everyone else it is just a label. */
  onToggle?: () => void;
}

export function ProjectStageBadge({ stage, onToggle }: ProjectStageBadgeProps) {
  const ready = stage === 'ready';
  const label = ready ? t.gallery.stageReady : t.gallery.stageDraft;
  const badge = (
    <Badge tone={ready ? 'success' : 'warning'}>
      {ready ? <CheckCircle2 size={12} /> : <PencilLine size={12} />} {label}
    </Badge>
  );

  if (!onToggle) return badge;

  return (
    <button
      type="button"
      title={ready ? t.gallery.markDraft : t.gallery.markReady}
      aria-label={ready ? t.gallery.markDraft : t.gallery.markReady}
      onClick={(event) => {
        event.stopPropagation(); // the whole card opens the project
        onToggle();
      }}
      className="rounded-full transition-transform duration-200 hover:brightness-125 active:scale-95 focus-ring"
    >
      {badge}
    </button>
  );
}
