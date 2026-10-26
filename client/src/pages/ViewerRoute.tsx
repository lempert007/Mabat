import { Suspense, lazy } from 'react';
import { SplashScreen } from '@/components/layout/SplashScreen';
import type { SessionInfo } from '@/types/api';

// three.js and its helpers are over a megabyte, and only this route needs them. Loading them
// here keeps the login and gallery pages light.
const ViewerPage = lazy(() =>
  import('./ViewerPage').then((module) => ({ default: module.ViewerPage })),
);

export function ViewerRoute({ session }: { session: SessionInfo }) {
  return (
    <Suspense fallback={<SplashScreen />}>
      <ViewerPage session={session} />
    </Suspense>
  );
}
