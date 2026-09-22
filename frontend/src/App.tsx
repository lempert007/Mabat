import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { RequireSession } from '@/components/auth/RequireSession';
import { Toaster } from '@/components/ui/Toaster';
import { LoginPage } from '@/pages/LoginPage';
import { GalleryPage } from '@/pages/GalleryPage';
import { ViewerRoute } from '@/pages/ViewerRoute';
import { NotFoundPage } from '@/pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireSession>{(session) => <GalleryPage session={session} />}</RequireSession>} />
          <Route
            path="/p/:projectId"
            element={<RequireSession autoGuest>{(session) => <ViewerRoute session={session} />}</RequireSession>}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
