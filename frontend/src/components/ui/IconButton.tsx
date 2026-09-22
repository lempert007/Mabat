import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  size?: 'sm' | 'md';
  tone?: 'default' | 'danger';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, active, size = 'md', tone = 'default', className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-xl transition-all duration-200 ease-out-soft focus-ring active:scale-95',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        tone === 'danger'
          ? 'text-fg-3 hover:text-danger hover:bg-danger-soft'
          : active
            ? 'bg-accent-soft text-accent-strong'
            : 'text-fg-2 hover:text-fg hover:bg-white/8',
        'disabled:opacity-40 disabled:pointer-events-none',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
