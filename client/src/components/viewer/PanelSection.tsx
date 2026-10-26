import type { ReactNode } from 'react';

interface PanelSectionProps {
  title: string;
  hint?: string;
  children: ReactNode;
}

export function PanelSection({ title, hint, children }: PanelSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-3">{title}</h3>
        {hint && <p className="mt-1 text-[12px] text-fg-4">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
