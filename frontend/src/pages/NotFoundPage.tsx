import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { t } from '@/i18n/he';

export function NotFoundPage() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-4 text-center p-6">
      <p className="text-6xl font-semibold tracking-title text-fg-4">404</p>
      <Link to="/">
        <Button variant="primary">{t.common.back}</Button>
      </Link>
    </div>
  );
}
