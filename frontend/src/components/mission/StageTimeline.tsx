import { useRef } from 'react';
import { useMissionStore } from '@/store/missionStore';
import { formatClock } from '@/lib/format';
import { cn } from '@/lib/cn';
import { stageTitle } from './stageMeta';
import type { MissionPlan } from '@/lib/mission/types';
import type { Mission } from '@/types/api';

interface StageTimelineProps {
  plan: MissionPlan;
  mission: Mission;
  current: number;
}

/**
 * The mission as chapters. A long cruise and a five-second drop are both stages worth seeing,
 * so each segment grows with the square root of its length: long stages still look long, short
 * ones stay big enough to hit. Pressing anywhere jumps there, and dragging scrubs.
 *
 * Laid out left to right like any media timeline, which is not mirrored in a right-to-left
 * interface because it stands for the direction of play, not of reading.
 */
export function StageTimeline({ plan, mission, current }: StageTimelineProps) {
  const time = useMissionStore((s) => s.time);
  const seek = useMissionStore((s) => s.seek);
  const pause = useMissionStore((s) => s.pause);
  const play = useMissionStore((s) => s.play);
  const track = useRef<HTMLDivElement>(null);
  const resume = useRef(false);

  /** The moment under the pointer, read off whichever segment it is over. */
  const timeAt = (clientX: number) => {
    const segments = Array.from(track.current?.children ?? []) as HTMLElement[];
    for (const [index, element] of segments.entries()) {
      const rect = element.getBoundingClientRect();
      const last = index === segments.length - 1;
      if (clientX <= rect.right || last) {
        const stage = plan.stages[index];
        const along = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
        return stage.start + along * stage.duration;
      }
    }
    return 0;
  };

  return (
    <div
      ref={track}
      dir="ltr"
      className="flex w-full touch-none select-none items-end gap-1"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        resume.current = useMissionStore.getState().playing;
        pause();
        seek(timeAt(event.clientX));
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) seek(timeAt(event.clientX));
      }}
      onPointerUp={(event) => {
        event.currentTarget.releasePointerCapture(event.pointerId);
        if (resume.current) play(plan);
      }}
    >
      {plan.stages.map((stage, index) => {
        const filled = Math.min(Math.max((time - stage.start) / stage.duration, 0), 1);
        const title = stageTitle(mission, stage.kind);
        return (
          <div
            key={stage.kind}
            className="group flex min-w-0 basis-0 cursor-pointer flex-col gap-1.5 py-1"
            style={{ flexGrow: Math.sqrt(stage.duration) }}
            title={`${title} · ${formatClock(stage.duration)}`}
          >
            <span
              dir="rtl"
              className={cn(
                'truncate px-0.5 text-center text-[11px] transition-colors duration-200',
                index === current ? 'font-semibold text-fg' : 'text-fg-3 group-hover:text-fg-2',
              )}
            >
              {title}
            </span>
            <span className="relative h-1.5 overflow-hidden rounded-full bg-white/10 transition-[height] duration-200 group-hover:h-2">
              <span
                className={cn('absolute inset-y-0 left-0 rounded-full', index === current ? 'bg-accent' : 'bg-accent/70')}
                style={{ width: `${filled * 100}%` }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}
