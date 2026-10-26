import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, rows = 3, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-line text-fg placeholder:text-fg-4 text-sm leading-relaxed resize-y transition-colors duration-200 hover:border-line-strong focus:border-accent focus:bg-white/7 focus-ring',
          className,
        )}
        {...rest}
      />
    );
  },
);
