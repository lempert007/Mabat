import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { useViewerStore } from '@/store/viewerStore';
import type { Project } from '@/types/api';
import { t } from '@/i18n/he';

export function IntroOverlay({ project }: { project: Project }) {
  const introVisible = useViewerStore((s) => s.introVisible);
  const modelReady = useViewerStore((s) => s.modelReady);
  const dismissIntro = useViewerStore((s) => s.dismissIntro);
  const show = introVisible && modelReady;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-30 flex items-end sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: 'easeInOut' } }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg/80 to-transparent" />
          <motion.div
            className="relative flex max-w-2xl flex-col gap-6 px-8 pb-14 sm:px-16 sm:pb-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-fg-3">{t.app.name}</p>
            <h1 className="text-[clamp(2.4rem,6vw,4.6rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-balance">
              {project.name}
            </h1>
            {project.description && (
              <p className="max-w-xl text-[17px] leading-relaxed text-fg-2 text-balance">{project.description}</p>
            )}
            <div className="mt-2 flex items-center gap-4">
              <Button variant="primary" size="lg" icon={<ArrowRight size={18} />} onClick={dismissIntro} className="ps-7 pe-6">
                {t.viewer.explore}
              </Button>
              <span className="hidden sm:inline-flex items-center gap-2 text-[12px] text-fg-4">
                <Kbd>↵</Kbd> {t.viewer.intro}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
