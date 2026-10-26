import { Navigate, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Viewer } from '@/components/viewer/Viewer';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { StatusScreen } from '@/components/layout/StatusScreen';
import { Spinner } from '@/components/ui/Spinner';
import { useProject } from '@/api/projects';
import { usePois } from '@/api/pois';
import { useCategories } from '@/api/categories';
import type { SessionInfo } from '@/types/api';
import { t } from '@/i18n/he';

export function ViewerPage({ session }: { session: SessionInfo }) {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const pois = usePois(projectId);
  const categories = useCategories(projectId);

  if (!projectId) return <Navigate to="/" replace />;
  if (project.isError) return <Navigate to="/" replace />;
  if (project.isPending || pois.isPending || categories.isPending) return <SplashScreen />;
  if (pois.isError || categories.isError) {
    return (
      <StatusScreen
        title={project.data.name}
        body={t.viewer.loadFailed}
        icon={<AlertTriangle size={28} className="text-danger" />}
      />
    );
  }

  if (project.data.status === 'failed') {
    return (
      <StatusScreen
        title={t.gallery.failed}
        body={project.data.errorMessage ?? t.viewer.failedBody}
        icon={<AlertTriangle size={28} className="text-danger" />}
      />
    );
  }
  if (project.data.status !== 'ready') {
    return <StatusScreen title={project.data.name} body={t.viewer.processingBody} icon={<Spinner size={28} />} />;
  }

  return <Viewer project={project.data} pois={pois.data} categories={categories.data} session={session} />;
}
