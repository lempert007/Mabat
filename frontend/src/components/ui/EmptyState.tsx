import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-16 px-6">
      {icon && (
        <div className="h-14 w-14 rounded-2xl glass-soft flex items-center justify-center text-fg-3">{icon}</div>
      )}
      <h3 className="text-base font-semibold tracking-title">{title}</h3>
      {body && <p className="text-sm text-fg-3 max-w-sm text-balance">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
