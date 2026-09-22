import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <div className={cn('relative', className)}>
        <select
          ref={ref}
          className="w-full h-10 ps-3.5 pe-9 rounded-xl bg-white/5 border border-line text-fg text-sm appearance-none transition-colors duration-200 hover:border-line-strong focus:border-accent focus-ring"
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-fg-3"
        />
      </div>
    );
  },
);
