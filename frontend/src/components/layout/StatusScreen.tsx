import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Wordmark } from './Wordmark';
import { t } from '@/i18n/he';

interface StatusScreenProps {
  title: string;
  body: string;
  icon: ReactNode;
}

/** A full page saying why a project cannot be shown yet, with the way back to the gallery. */
export function StatusScreen({ title, body, icon }: StatusScreenProps) {
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
