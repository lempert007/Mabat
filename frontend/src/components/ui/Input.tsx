import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const inputClass =
  'w-full h-10 px-3.5 rounded-xl bg-white/5 border border-line text-fg placeholder:text-fg-4 text-sm transition-colors duration-200 hover:border-line-strong focus:border-accent focus:bg-white/7 focus-ring';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(inputClass, className)} {...rest} />;
  },
);
