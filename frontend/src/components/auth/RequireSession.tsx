import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useJoinAsGuest, useSession } from '@/api/auth';
import { SplashScreen } from '@/components/layout/SplashScreen';
import type { SessionInfo } from '@/types/api';

interface RequireSessionProps {
  /** When true, visitors without a session become guests silently (used for share links). */
  autoGuest?: boolean;
  children: (session: SessionInfo) => ReactNode;
}

export function RequireSession({ autoGuest = false, children }: RequireSessionProps) {
  const session = useSession();
  const guest = useJoinAsGuest();
  const location = useLocation();

  const needsGuest = autoGuest && session.isSuccess && session.data === null;
  useEffect(() => {
    if (needsGuest && guest.isIdle) guest.mutate();
  }, [needsGuest, guest]);

  if (session.isPending || needsGuest) return <SplashScreen />;
  if (session.isError) return <Navigate to="/login" replace />;
  if (!session.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children(session.data)}</>;
}
