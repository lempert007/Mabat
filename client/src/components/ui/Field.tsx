import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  trailing?: ReactNode;
}

export function Field({ label, hint, htmlFor, children, trailing }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-[12px] font-medium uppercase tracking-[0.08em] text-fg-3">
          {label}
        </label>
        {trailing}
      </div>
      {children}
      {hint && <p className="text-[12px] text-fg-4">{hint}</p>}
    </div>
  );
}
