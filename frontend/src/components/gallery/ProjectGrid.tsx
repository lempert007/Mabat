import { AnimatePresence } from 'framer-motion';
import { ProjectCard } from './ProjectCard';
import type { Project } from '@/types/api';

interface ProjectGridProps {
  projects: Project[];
  canEdit: boolean;
  onOpen: (project: Project) => void;
  onEdit: (project: Project) => void;
  onReprocess: (project: Project) => void;
  onDelete: (project: Project) => void;
  onToggleStage: (project: Project) => void;
}

export function ProjectGrid({
  projects,
  canEdit,
  onOpen,
  onEdit,
  onReprocess,
  onDelete,
  onToggleStage,
}: ProjectGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      <AnimatePresence>
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            canEdit={canEdit}
            onOpen={() => onOpen(project)}
            onEdit={() => onEdit(project)}
            onReprocess={() => onReprocess(project)}
            onDelete={() => onDelete(project)}
            onToggleStage={() => onToggleStage(project)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
