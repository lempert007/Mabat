import { Box } from 'lucide-react';
import { projectThumbnailUrl } from '@/api/projects';
import type { Project } from '@/types/api';

export function ProjectCardCover({ project }: { project: Project }) {
  const busy = project.status === 'processing' || project.status === 'uploaded';
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-2xl bg-surface-2">
      {project.hasThumbnail ? (
        <img
          src={projectThumbnailUrl(project.id, project.updatedAt)}
          alt=""
          className="h-full w-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
          loading="lazy"
        />
      ) : (
        <div className={`h-full w-full flex items-center justify-center ${busy ? 'shimmer' : ''}`}>
          <div
            className="absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(ellipse at 30% 20%, rgba(91,156,255,0.18), transparent 55%), radial-gradient(ellipse at 80% 90%, rgba(139,156,255,0.12), transparent 55%)',
            }}
          />
          <Box size={40} strokeWidth={1.25} className="relative text-fg-4" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-surface/90 to-transparent" />
    </div>
  );
}
