import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useViewerStore } from '@/store/viewerStore';
import { t } from '@/i18n/he';

/** Short orbit/zoom/pan hint that appears once the intro is dismissed and fades after a few seconds. */
export function ControlsHint({ editable }: { editable: boolean }) {
  const introVisible = useViewerStore((s) => s.introVisible);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (introVisible) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 6000);
    return () => window.clearTimeout(timer);
  }, [introVisible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.p
          className="pointer-events-none absolute bottom-20 left-1/2 z-20 max-w-[min(92vw,44rem)] -translate-x-1/2 text-balance rounded-full glass-soft px-4 py-2 text-center text-[12px] text-fg-3"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {t.viewer.controlsHint}
          {editable && <span className="text-fg-4"> · {t.viewer.controlsHintEditor}</span>}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
