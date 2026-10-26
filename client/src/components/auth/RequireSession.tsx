import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/api/auth';
import { SplashScreen } from '@/components/layout/SplashScreen';
import type { SessionInfo } from '@/types/api';

interface RequireSessionProps {
  children: (session: SessionInfo) => ReactNode;
}

/** Sends visitors without a session to sign in, then back to where they were going. */
export function RequireSession({ children }: RequireSessionProps) {
  const session = useSession();
  const location = useLocation();

  if (session.isError) return <Navigate to="/login" replace />;
  if (session.isPending) return <SplashScreen />;
  if (!session.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children(session.data)}</>;
}
