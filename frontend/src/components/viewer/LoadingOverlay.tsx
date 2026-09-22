import { AnimatePresence, motion } from 'framer-motion';
import { useProgress } from '@react-three/drei';
import { useViewerStore } from '@/store/viewerStore';
import { Wordmark } from '@/components/layout/Wordmark';
import { t } from '@/i18n/he';

export function LoadingOverlay() {
  const modelReady = useViewerStore((s) => s.modelReady);
  const { progress } = useProgress();
  const percent = Math.round(progress);
  return (
    <AnimatePresence>
      {!modelReady && (
        <motion.div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-bg"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <Wordmark size="lg" />
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-1 w-56 overflow-hidden rounded-full bg-white/8">
              <div className="absolute inset-y-0 start-0 rounded-full bg-accent transition-[width] duration-300" style={{ width: `${Math.max(percent, 4)}%` }} />
            </div>
            <p className="text-[12px] uppercase tracking-[0.14em] text-fg-3">
              {t.viewer.loadingModel} · {percent}%
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
