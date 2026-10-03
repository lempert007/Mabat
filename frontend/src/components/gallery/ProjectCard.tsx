import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { ProjectCardCover } from './ProjectCardCover';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { ProjectMenu } from './ProjectMenu';
import type { Project } from '@/types/api';
import { formatRelative } from '@/lib/format';
import { counted } from '@/lib/counted';
import { t } from '@/i18n/he';

interface ProjectCardProps {
  project: Project;
  canEdit: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onReprocess: () => void;
  onDelete: () => void;
  onToggleStage: () => void;
}

export function ProjectCard({
  project,
  canEdit,
  onOpen,
  onEdit,
  onReprocess,
  onDelete,
  onToggleStage,
}: ProjectCardProps) {
  const openable = project.status === 'ready';
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
      onClick={openable ? onOpen : undefined}
      className={`group relative flex flex-col rounded-2xl bg-surface border border-line transition-all duration-300 ease-out-soft ${
        openable ? 'cursor-pointer hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card' : ''
      }`}
    >
      <ProjectCardCover project={project} />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold tracking-title">{project.name}</h3>
            {project.description && (
              <p className="mt-0.5 line-clamp-2 text-[13px] text-fg-3 leading-snug">{project.description}</p>
            )}
          </div>
          {canEdit && (
            <ProjectMenu
              canReprocess={project.status === 'failed'}
              onEdit={onEdit}
              onReprocess={onReprocess}
              onDelete={onDelete}
            />
          )}
        </div>
        {project.status === 'failed' && project.errorMessage && (
          <p className="text-[12px] text-danger/90 leading-snug">{project.errorMessage}</p>
        )}
        <div className="flex items-center justify-between text-[12px] text-fg-3">
          <ProjectStatusBadge project={project} onToggleStage={canEdit ? onToggleStage : undefined} />
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} />
              {counted(project.poiCount, t.gallery.onePoint, t.gallery.manyPoints)}
            </span>
            <span>{formatRelative(project.updatedAt)}</span>
          </span>
        </div>
      </div>
    </motion.article>
  );
}
