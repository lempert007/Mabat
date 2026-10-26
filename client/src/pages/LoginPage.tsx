import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSession } from '@/api/auth';
import { LoginBackdrop } from '@/components/auth/LoginBackdrop';
import { LoginForm } from '@/components/auth/LoginForm';
import { Wordmark } from '@/components/layout/Wordmark';
import { t } from '@/i18n/he';

export function LoginPage() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';

  if (session.data) return <Navigate to={redirectTo} replace />;

  return (
    <div className="relative min-h-full flex items-center justify-center p-6 bg-bg">
      <LoginBackdrop />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative w-full max-w-[400px] glass rounded-3xl p-8 sm:p-9"
      >
        <div className="mb-8 flex flex-col gap-4">
          <Wordmark size="lg" />
          <div>
            <h1 className="text-[22px] font-semibold tracking-title">{t.login.title}</h1>
            <p className="mt-1 text-sm text-fg-3">{t.login.subtitle}</p>
          </div>
        </div>
        <LoginForm onSuccess={() => navigate(redirectTo, { replace: true })} />
      </motion.div>
    </div>
  );
}
