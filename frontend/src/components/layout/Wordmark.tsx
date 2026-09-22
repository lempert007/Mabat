import { t } from '@/i18n/he';

export function Wordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const large = size === 'lg';
  return (
    <div className="flex items-center gap-2.5 select-none">
      <span
        className={`relative inline-flex items-center justify-center rounded-full border-[2.5px] border-accent ${large ? 'h-8 w-8' : 'h-6 w-6'}`}
        aria-hidden="true"
      >
        <span className={`rounded-full bg-fg ${large ? 'h-2.5 w-2.5' : 'h-2 w-2'}`} />
      </span>
      <span className={`font-semibold tracking-title ${large ? 'text-2xl' : 'text-base'}`}>{t.app.name}</span>
    </div>
  );
}
