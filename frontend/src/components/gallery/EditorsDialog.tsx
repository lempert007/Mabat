import { useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { useCreateUser, useDeleteUser, useUsers } from '@/api/auth';
import { errorMessage } from '@/lib/errorMessage';
import { toast } from '@/store/toastStore';
import type { SessionInfo } from '@/types/api';
import { t } from '@/i18n/he';

interface EditorsDialogProps {
  open: boolean;
  onClose: () => void;
  session: SessionInfo;
}

export function EditorsDialog({ open, onClose, session }: EditorsDialogProps) {
  const users = useUsers(open);
  const create = useCreateUser();
  const remove = useDeleteUser();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => {
    create.mutate(
      { username, displayName: displayName || username, password },
      {
        onSuccess: () => {
          setUsername('');
          setDisplayName('');
          setPassword('');
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} title={t.users.title} width="sm">
      <ul className="flex flex-col divide-y divide-line -mx-2">
        {users.data?.map((user) => (
          <li key={user.id} className="flex items-center justify-between gap-3 px-2 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {user.displayName}
                {user.id === session.user?.id && <span className="ms-2 text-[12px] text-fg-4">({t.users.you})</span>}
              </p>
              <p className="text-[12px] text-fg-3">@{user.username}</p>
            </div>
            {user.id !== session.user?.id && (
              <IconButton
                label={t.common.remove}
                size="sm"
                tone="danger"
                onClick={() => remove.mutate(user.id, { onError: (error) => toast.error(errorMessage(error)) })}
              >
                <Trash2 size={15} />
              </IconButton>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-col gap-2.5 rounded-xl bg-white/3 border border-line p-3">
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-fg-3">{t.users.add}</p>
        <Input dir="ltr" placeholder={t.users.username} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
        <Input placeholder={t.users.displayName} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <Input
          dir="ltr"
          placeholder={t.users.password}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <Button
          variant="primary"
          size="sm"
          icon={<UserPlus size={14} />}
          loading={create.isPending}
          disabled={username.length < 2 || password.length < 6}
          onClick={submit}
        >
          {t.users.add}
        </Button>
      </div>
    </Dialog>
  );
}
