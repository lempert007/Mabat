import { Spinner } from '@/components/ui/Spinner';
import { Wordmark } from './Wordmark';

export function SplashScreen() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-6 bg-bg">
      <Wordmark size="lg" />
      <Spinner className="text-fg-3" />
    </div>
  );
}
