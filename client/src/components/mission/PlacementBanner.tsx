import { AnimatePresence, motion } from 'framer-motion';
import { MousePointerClick, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Kbd } from '@/components/ui/Kbd';
import { isTracing, selectSceneOpen, useMissionStore, type PlaceTarget } from '@/store/missionStore';
import { actorName } from '@/lib/mission/names';
import { fill } from '@/lib/interpolate';
import { cn } from '@/lib/cn';
import type { Mission } from '@/types/api';
import { t } from '@/i18n/he';

const copy = t.mission.placing;

function describe(placing: PlaceTarget, mission: Mission | null): string {
  if (typeof placing === 'number') return fill(copy.movingWaypoint, { index: placing + 1 });
  if (typeof placing !== 'object') return copy[placing];
  if ('zone' in placing) {
    return placing.vertex === undefined ? copy.noise : fill(copy.movingNoisePoint, { index: placing.vertex + 1 });
  }
  if (placing.key !== undefined) return fill(copy.movingKey, { index: placing.key + 1 });
  const index = mission?.actors.findIndex((actor) => actor.id === placing.actor) ?? -1;
  return fill(copy.actor, { name: mission && index !== -1 ? actorName(mission, index) : '' });
}

interface PlacementBannerProps {
  mission: Mission | null;
  onUndo: () => void;
}

/** Says what the next click on the model will place, and how to stop. */
export function PlacementBanner({ mission, onUndo }: PlacementBannerProps) {
  const placing = useMissionStore((s) => s.placing);
  const setPlacing = useMissionStore((s) => s.setPlacing);
  const tracing = isTracing(placing);
  const sceneOpen = useMissionStore(selectSceneOpen);

  return (
    <AnimatePresence>
      {placing !== null && (
        <motion.div
          className={cn(
            'pointer-events-auto absolute left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full glass py-1.5 pe-1.5 ps-4',
            sceneOpen ? 'top-20' : 'bottom-24',
          )}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <MousePointerClick size={16} className="shrink-0 text-accent-strong" />
          <span className="text-[13px] font-medium">{describe(placing, mission)}</span>
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
