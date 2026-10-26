import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { useLogin } from '@/api/auth';
import { ApiError } from '@/api/client';
import { errorMessage } from '@/lib/errorMessage';
import { t } from '@/i18n/he';

interface LoginFormProps {
  onSuccess: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const login = useLogin();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    login.mutate(
      { username, password },
      {
        onSuccess,
        onError: (err) =>
          setError(err instanceof ApiError && err.status === 401 ? t.login.failed : errorMessage(err)),
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label={t.login.username} htmlFor="username">
        <Input
          id="username"
          dir="ltr"
          autoComplete="username"
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </Field>
      <Field label={t.login.password} htmlFor="password">
        <Input
          id="password"
          dir="ltr"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      {error && <p className="text-[13px] text-danger -mt-1">{error}</p>}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        block
        loading={login.isPending}
        disabled={!username || !password}
        icon={<ArrowRight size={16} />}
      >
        {t.login.signIn}
      </Button>
      <p className="text-center text-[12px] text-fg-4">{t.login.hint}</p>
    </form>
  );
}
