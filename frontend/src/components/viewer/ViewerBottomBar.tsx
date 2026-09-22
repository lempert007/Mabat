import type { ReactNode } from 'react';

/**
 * Holds the controls that sit along the bottom of the viewer. Keeping them in one row means
 * they stay clear of each other whether or not the tour is available.
 */
export function ViewerBottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex items-center justify-center gap-2 px-4">
      {children}
    </div>
  );
}
