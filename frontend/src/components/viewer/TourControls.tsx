import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { useViewerStore } from '@/store/viewerStore';
import { t } from '@/i18n/he';

interface TourControlsProps {
  total: number;
  index: number;
  onPrev: () => void;
  onNext: () => void;
  onStart: () => void;
}

const STEP_MS = 9000;

export function TourControls({ total, index, onPrev, onNext, onStart }: TourControlsProps) {
  const playing = useViewerStore((s) => s.tourPlaying);
  const setPlaying = useViewerStore((s) => s.setTourPlaying);
  const introVisible = useViewerStore((s) => s.introVisible);
  const selectPoi = useViewerStore((s) => s.selectPoi);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (index >= total - 1) setPlaying(false);
      else onNext();
    }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, index, total, onNext, setPlaying]);

  const visible = total > 0 && !introVisible;

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (index === -1) onStart();
    setPlaying(true);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          dir="ltr"
          className="pointer-events-auto flex items-center gap-1 rounded-full glass px-2 py-1.5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <IconButton label={t.viewer.previous} size="sm" onClick={onPrev}>
            <SkipBack size={15} />
          </IconButton>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? t.viewer.pauseTour : t.viewer.playTour}
            className="flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-strong focus-ring"
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
            <span className="hidden sm:inline">{playing ? t.viewer.pauseTour : t.viewer.playTour}</span>
          </button>
          <IconButton label={t.viewer.next} size="sm" onClick={onNext}>
            <SkipForward size={15} />
          </IconButton>
          <span className="mx-2 min-w-[52px] text-center text-[12px] tabular-nums text-fg-3">
            {index === -1 ? '—' : index + 1} / {total}
          </span>
          {playing && (
            <IconButton
              label={t.viewer.stopTour}
              size="sm"
              onClick={() => {
                setPlaying(false);
                selectPoi(null);
              }}
            >
              <Square size={13} />
            </IconButton>
          )}
          {playing && (
            <motion.span
              key={index}
              className="absolute inset-x-4 -bottom-px h-0.5 origin-left rounded-full bg-accent/70"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: STEP_MS / 1000, ease: 'linear' }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
