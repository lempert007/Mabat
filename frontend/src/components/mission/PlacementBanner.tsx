import { AnimatePresence, motion } from 'framer-motion';
import { MousePointerClick, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Kbd } from '@/components/ui/Kbd';
import { isTracing, useMissionStore, type PlaceTarget } from '@/store/missionStore';
import { fill } from '@/lib/interpolate';
import { t } from '@/i18n/he';

const copy = t.mission.placing;

function describe(placing: PlaceTarget): string {
  if (typeof placing === 'number') return fill(copy.movingWaypoint, { index: placing + 1 });
  if (typeof placing === 'object') {
    return placing.vertex === undefined ? copy.noise : fill(copy.movingNoisePoint, { index: placing.vertex + 1 });
  }
  return copy[placing];
}

/** Says what the next click on the model will place, and how to stop. */
export function PlacementBanner({ onUndo }: { onUndo: () => void }) {
  const placing = useMissionStore((s) => s.placing);
  const setPlacing = useMissionStore((s) => s.setPlacing);
  const tracing = isTracing(placing);

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
          <span className="text-[13px] font-medium">{describe(placing)}</span>
          <span className="hidden items-center gap-1 text-[12px] text-fg-4 sm:flex">
            <Kbd>{tracing ? 'Enter' : 'Esc'}</Kbd>
          </span>
          {tracing && (
            <IconButton label={t.mission.undoPoint} size="sm" onClick={onUndo}>
              <Undo2 size={15} />
            </IconButton>
          )}
          <Button size="sm" variant={tracing ? 'primary' : 'ghost'} onClick={() => setPlacing(null)}>
            {tracing ? t.mission.placingDone : t.common.cancel}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
