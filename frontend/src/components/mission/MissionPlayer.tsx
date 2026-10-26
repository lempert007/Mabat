import { motion } from 'framer-motion';
import { AudioLines, Clapperboard, Crosshair, Move3d, Pause, Play, Presentation, Repeat, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { StageTimeline } from './StageTimeline';
import { SceneTimeline } from './SceneTimeline';
import { PLAYBACK_RATES, useMissionStore, type CameraMode } from '@/store/missionStore';
import { formatClock } from '@/lib/format';
import { isClosed } from '@/lib/mission/noise';
import { cn } from '@/lib/cn';
import type { MissionChange } from '@/hooks/useMissionSettings';
import type { MissionPlan } from '@/lib/mission/types';
import type { Mission } from '@/types/api';
import { t } from '@/i18n/he';

interface MissionPlayerProps {
  plan: MissionPlan;
  mission: Mission;
  current: number;
  onStep: (delta: 1 | -1) => void;
  /** Editing: the ground's timeline opens above the stages while its tab is. */
  update?: (change: MissionChange) => void;
}

const CAMERAS: { mode: CameraMode; icon: typeof Clapperboard }[] = [
  { mode: 'cinematic', icon: Clapperboard },
  { mode: 'follow', icon: Crosshair },
  { mode: 'free', icon: Move3d },
];

/**
 * The transport for a mission: the chapters, play and pause, a stage back or forward, and how
 * the show runs: its speed, whether it waits at the end of each stage for the presenter, and
 * who holds the camera.
 */
export function MissionPlayer({ plan, mission, current, onStep, update }: MissionPlayerProps) {
  const time = useMissionStore((s) => s.time);
  const playing = useMissionStore((s) => s.playing);
  const rate = useMissionStore((s) => s.rate);
  const camera = useMissionStore((s) => s.camera);
  const stepwise = useMissionStore((s) => s.stepwise);
  const loopStage = useMissionStore((s) => s.loopStage);
  const noiseShown = useMissionStore((s) => s.noiseShown);
  const editing = useMissionStore((s) => s.editing);
  const sceneOpen = useMissionStore((s) => s.editing && s.tab === 'scene');
  const { play, pause, setRate, setCamera, setStepwise, setLoopStage, setNoiseShown } = useMissionStore.getState();
  const hasNoise = mission.noise.some(isClosed);
  const finished = time >= plan.duration - 1e-3;

  return (
    <motion.div
      dir="ltr"
      className={cn(
        'pointer-events-auto flex w-[min(980px,calc(100vw-2rem))] flex-col gap-2 rounded-2xl glass px-4 pb-3 pt-2.5',
        // The mission panel stands at the end of the screen, which this left-to-right player
        // calls its start; while it is open the player moves over to keep clear of it.
        editing && 'lg:ms-[25rem] lg:w-[min(980px,calc(100vw-27rem))]',
      )}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {sceneOpen && update && <SceneTimeline plan={plan} mission={mission} update={update} />}
      <StageTimeline plan={plan} mission={mission} current={current} />

      <div className="flex items-center gap-1">
        <IconButton label={t.mission.previousStage} size="sm" onClick={() => onStep(-1)}>
          <SkipBack size={15} />
        </IconButton>
        <button
          type="button"
          onClick={() => (playing ? pause() : play(plan))}
          aria-label={playing ? t.mission.pause : finished ? t.mission.replay : t.mission.play}
          title={playing ? t.mission.pause : finished ? t.mission.replay : t.mission.play}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-[0_8px_24px_rgba(91,156,255,0.3)] transition-all duration-200 hover:bg-accent-strong active:scale-95 focus-ring"
        >
          {playing ? <Pause size={17} /> : finished ? <RotateCcw size={16} /> : <Play size={17} className="translate-x-px" />}
        </button>
        <IconButton label={t.mission.nextStage} size="sm" onClick={() => onStep(1)}>
          <SkipForward size={15} />
        </IconButton>
        <span className="ms-2 whitespace-nowrap text-[12px] tabular-nums text-fg-3">
          <span className="text-fg">{formatClock(time)}</span> / {formatClock(plan.duration)}
        </span>

        <span className="ms-auto flex items-center gap-1">
          {hasNoise && (
            <IconButton label={t.mission.noise.layer} size="sm" active={noiseShown} onClick={() => setNoiseShown(!noiseShown)}>
              <AudioLines size={15} />
            </IconButton>
          )}
          <span className="hidden sm:contents">
            <IconButton label={t.mission.loopStage} size="sm" active={loopStage} onClick={() => setLoopStage(!loopStage)}>
              <Repeat size={15} />
            </IconButton>
            <IconButton label={t.mission.stepwise} size="sm" active={stepwise} onClick={() => setStepwise(!stepwise)}>
              <Presentation size={15} />
            </IconButton>
          </span>
          <button
            type="button"
            title={t.mission.speed}
            aria-label={`${t.mission.speed} ${rate}×`}
            onClick={() => setRate(PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(rate) + 1) % PLAYBACK_RATES.length])}
            className="h-8 min-w-11 rounded-xl px-2 text-[12px] font-semibold tabular-nums text-fg-2 transition-colors hover:bg-white/8 hover:text-fg focus-ring"
          >
            {rate}×
          </button>
          <span className="mx-1 hidden h-5 w-px bg-line-strong sm:block" />
          <span dir="rtl" className="flex items-center gap-0.5 rounded-xl bg-white/5 p-0.5">
            {CAMERAS.map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setCamera(mode)}
                title={t.mission.cameraHint[mode]}
                aria-pressed={camera === mode}
                className={cn(
                  'flex h-7 items-center gap-1.5 rounded-[10px] px-2.5 text-[12px] font-medium transition-colors focus-ring',
                  camera === mode ? 'bg-white/12 text-fg' : 'text-fg-3 hover:text-fg-2',
                )}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{t.mission.camera[mode]}</span>
              </button>
            ))}
          </span>
        </span>
      </div>
    </motion.div>
  );
}
