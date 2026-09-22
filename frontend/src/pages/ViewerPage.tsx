import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Viewer } from '@/components/viewer/Viewer';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Wordmark } from '@/components/layout/Wordmark';
import { useProject } from '@/api/projects';
import { usePois } from '@/api/pois';
import { useCategories } from '@/api/categories';
import type { SessionInfo } from '@/types/api';
import { t } from '@/i18n/he';

function StatusScreen({ title, body, icon }: { title: string; body: string; icon: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-6 bg-bg p-6 text-center">
      <Wordmark size="lg" />
      <div className="flex flex-col items-center gap-3">
        <div className="text-fg-3">{icon}</div>
        <h1 className="text-xl font-semibold tracking-title">{title}</h1>
        <p className="max-w-md text-sm text-fg-3">{body}</p>
      </div>
      <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
        {t.common.back}
      </Button>
    </div>
  );
}

export function ViewerPage({ session }: { session: SessionInfo }) {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const pois = usePois(projectId);
  const categories = useCategories(projectId);

  if (!projectId) return <Navigate to="/" replace />;
  if (project.isError) return <Navigate to="/" replace />;
  if (project.isPending || pois.isPending || categories.isPending) return <SplashScreen />;

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

  return <Viewer project={project.data} pois={pois.data ?? []} categories={categories.data ?? []} session={session} />;
}
