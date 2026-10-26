import { AnimatePresence, motion } from 'framer-motion';
import { MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { useMissionStore } from '@/store/missionStore';
import { fill } from '@/lib/interpolate';
import { t } from '@/i18n/he';

/** Says what the next click on the model will place, and how to stop. */
export function PlacementBanner() {
  const placing = useMissionStore((s) => s.placing);
  const setPlacing = useMissionStore((s) => s.setPlacing);

  return (
    <AnimatePresence>
      {placing !== null && (
        <motion.div
          className="pointer-events-auto absolute bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full glass py-1.5 pe-1.5 ps-4"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <MousePointerClick size={16} className="shrink-0 text-accent-strong" />
          <span className="text-[13px] font-medium">
            {typeof placing === 'number'
              ? fill(t.mission.placing.movingWaypoint, { index: placing + 1 })
              : t.mission.placing[placing]}
          </span>
          <span className="hidden items-center gap-1 text-[12px] text-fg-4 sm:flex">
            <Kbd>Esc</Kbd>
          </span>
          <Button size="sm" variant={placing === 'waypoint' ? 'primary' : 'ghost'} onClick={() => setPlacing(null)}>
            {placing === 'waypoint' ? t.mission.placingDone : t.common.cancel}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
