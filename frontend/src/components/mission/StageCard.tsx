import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck } from 'lucide-react';
import { useMissionStore } from '@/store/missionStore';
import { STAGE_ICONS, stageCaption, stageFacts, stageTitle } from './stageMeta';
import { fill } from '@/lib/interpolate';
import type { MissionPlan } from '@/lib/mission/types';
import type { Mission } from '@/types/api';
import { t } from '@/i18n/he';

interface StageCardProps {
  plan: MissionPlan;
  mission: Mission;
  current: number;
}

/**
 * The narration, set like a broadcast lower third: which stage this is, what is happening, and
 * the numbers that matter for it. Each stage slides in over the last.
 */
export function StageCard({ plan, mission, current }: StageCardProps) {
  const delivered = useMissionStore((s) => s.time >= plan.deliveredAt);
  const stage = plan.stages[current];
  const Icon = STAGE_ICONS[stage.kind];
  const facts = stageFacts(mission, plan, stage.kind);

  return (
    <div className="pointer-events-none absolute bottom-[8.5rem] start-4 z-20 w-[min(26rem,calc(100vw-2rem))]">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={stage.kind}
          className="flex flex-col gap-2 rounded-2xl glass px-5 py-4"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-strong">
            <Icon size={14} />
            {fill(t.mission.stageOf, { index: current + 1, total: plan.stages.length })}
          </p>
          <h2 className="text-[22px] font-semibold leading-tight tracking-title">{stageTitle(mission, stage.kind)}</h2>
          <p className="text-[14px] leading-relaxed text-fg-2 text-balance">{stageCaption(mission, stage.kind)}</p>
          {(facts.length > 0 || delivered) && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {facts.map((fact) => (
                <span key={fact} className="rounded-full bg-white/8 px-2.5 py-1 text-[12px] text-fg-2">
                  {fact}
                </span>
              ))}
              {delivered && stage.kind === 'deliver' && (
                <motion.span
                  className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[12px] font-medium text-success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                >
                  <CircleCheck size={13} />
                  {t.mission.delivered}
                </motion.span>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
