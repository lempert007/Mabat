import { LogOut, UserRound } from 'lucide-react';
import type { SessionInfo } from '@/types/api';
import { t } from '@/i18n/he';
import { IconButton } from '@/components/ui/IconButton';

interface UserChipProps {
  session: SessionInfo;
  onSignOut: () => void;
}

export function UserChip({ session, onSignOut }: UserChipProps) {
  const name = session.user?.displayName ?? t.header.guest;
  const role = session.role === 'editor' ? t.header.editor : t.header.guest;
  return (
    <div className="flex items-center gap-1 rounded-full glass-soft ps-1 pe-1 h-10">
      <span className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-fg-2">
        <UserRound size={15} />
      </span>
      <span className="hidden sm:flex flex-col leading-tight pe-2">
        <span className="text-[13px] font-medium">{name}</span>
        <span className="text-[11px] text-fg-3">{role}</span>
      </span>
      <IconButton label={t.header.signOut} size="sm" onClick={onSignOut}>
        <LogOut size={15} />
      </IconButton>
    </div>
  );
}
