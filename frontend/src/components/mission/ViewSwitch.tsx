import { Compass, Navigation } from 'lucide-react';
import { useMissionStore, type ShowcaseView } from '@/store/missionStore';
import { cn } from '@/lib/cn';
import { t } from '@/i18n/he';

const VIEWS: { view: ShowcaseView; icon: typeof Compass }[] = [
  { view: 'mission', icon: Navigation },
  { view: 'explore', icon: Compass },
];

/** Moves between the mission and the model with its points. Both share one scene and camera. */
export function ViewSwitch({ onWatch }: { onWatch: () => void }) {
  const view = useMissionStore((s) => s.view);
  const setView = useMissionStore((s) => s.setView);
  const pause = useMissionStore((s) => s.pause);

  return (
    <div
      role="tablist"
      aria-label={t.mission.viewSwitch}
      className="pointer-events-auto absolute left-1/2 top-20 z-30 flex h-10 -translate-x-1/2 items-center gap-0.5 rounded-full glass p-1 md:top-5"
    >
      {VIEWS.map(({ view: option, icon: Icon }) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={view === option}
          onClick={() => {
            if (option === view) return;
            if (option === 'mission') onWatch();
            else {
              pause();
              setView('explore');
            }
          }}
          className={cn(
            'flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-colors duration-200 focus-ring',
            view === option ? 'bg-white/12 text-fg' : 'text-fg-3 hover:text-fg-2',
          )}
        >
          <Icon size={14} />
          {t.mission.views[option]}
        </button>
      ))}
    </div>
  );
}
