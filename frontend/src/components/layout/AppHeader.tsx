import { useNavigate } from 'react-router-dom';
import { Wordmark } from './Wordmark';
import { UserChip } from './UserChip';
import { useLogout } from '@/api/auth';
import type { SessionInfo } from '@/types/api';
import type { ReactNode } from 'react';

interface AppHeaderProps {
  session: SessionInfo;
  actions?: ReactNode;
}

export function AppHeader({ session, actions }: AppHeaderProps) {
  const logout = useLogout();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-5 sm:px-8 h-16 bg-bg/70 backdrop-blur-xl border-b border-line">
      <Wordmark />
      <div className="flex items-center gap-3">
        {actions}
        <UserChip session={session} onSignOut={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })} />
      </div>
    </header>
  );
}
