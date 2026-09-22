import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Plus, Users } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { ProjectGrid } from '@/components/gallery/ProjectGrid';
import { NewProjectDialog } from '@/components/gallery/NewProjectDialog';
import { EditProjectDialog } from '@/components/gallery/EditProjectDialog';
import { EditorsDialog } from '@/components/gallery/EditorsDialog';
import {
  useDeleteProject,
  useProjects,
  useReprocessProject,
  useSetProjectStage,
} from '@/api/projects';
import { errorMessage } from '@/lib/errorMessage';
import { toast } from '@/store/toastStore';
import type { Project, SessionInfo } from '@/types/api';
import { t } from '@/i18n/he';

export function GalleryPage({ session }: { session: SessionInfo }) {
  const navigate = useNavigate();
  const projects = useProjects();
  const remove = useDeleteProject();
  const reprocess = useReprocessProject();
  const setStage = useSetProjectStage();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [editorsOpen, setEditorsOpen] = useState(false);
  const canEdit = session.role === 'editor';

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <AppHeader
        session={session}
        actions={
          canEdit && (
            <>
              <Button variant="ghost" icon={<Users size={16} />} onClick={() => setEditorsOpen(true)}>
                <span className="hidden sm:inline">{t.header.editors}</span>
              </Button>
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
                {t.gallery.newProject}
              </Button>
            </>
          )
        }
      />

      <main className="flex-1 px-5 sm:px-8 py-8 max-w-[1500px] w-full mx-auto">
        <div className="mb-6">
          <h1 className="text-[28px] font-semibold tracking-title">{t.gallery.title}</h1>
          <p className="mt-1 text-sm text-fg-3">{t.gallery.subtitle}</p>
        </div>

        {projects.isPending && (
          <div className="flex justify-center py-20">
            <Spinner className="text-fg-3" />
          </div>
        )}

        {projects.data && projects.data.length === 0 && (
          <EmptyState
            icon={<Box size={26} strokeWidth={1.5} />}
            title={t.gallery.empty}
            body={canEdit ? t.gallery.emptyEditor : t.gallery.emptyGuest}
            action={
              canEdit && (
                <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
                  {t.gallery.newProject}
                </Button>
              )
            }
          />
        )}

        {projects.data && projects.data.length > 0 && (
          <ProjectGrid
            projects={projects.data}
            canEdit={canEdit}
            onOpen={(project) => navigate(`/p/${project.id}`)}
            onEdit={setEditing}
            onReprocess={(project) => reprocess.mutate(project.id)}
            onDelete={setDeleting}
            onToggleStage={(project) =>
              setStage.mutate(
                { id: project.id, stage: project.stage === 'ready' ? 'draft' : 'ready' },
                { onError: (error) => toast.error(errorMessage(error)) },
              )
            }
          />
        )}
      </main>

      <NewProjectDialog open={creating} onClose={() => setCreating(false)} />
      <EditProjectDialog project={editing} onClose={() => setEditing(null)} />
      <EditorsDialog open={editorsOpen} onClose={() => setEditorsOpen(false)} session={session} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t.gallery.deleteTitle}
        body={t.gallery.deleteBody}
        loading={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => setDeleting(null),
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      />
    </div>
  );
}
