import type { ReactNode } from 'react';
import { Crosshair, ScanEye, X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import { t } from '@/i18n/he';

interface PlaceRowProps {
  icon: ReactNode;
  label: string;
  /** What the place is now, in words: set, or what happens without it. */
  status: string;
  set: boolean;
  /** The next click on the model places this. */
  active: boolean;
  onPlace: () => void;
  /** Flies the camera in to look at the place. */
  onView?: () => void;
  /** Places that are optional can be cleared again. */
  onClear?: () => void;
}

/** One place the mission is built around, with the click-on-the-model control that sets it. */
export function PlaceRow({ icon, label, status, set, active, onPlace, onView, onClear }: PlaceRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors duration-200',
        active ? 'border-accent/60 bg-accent-soft' : 'border-line bg-white/3',
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          set ? 'bg-accent-soft text-accent-strong' : 'bg-white/6 text-fg-4',
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="truncate text-[12px] text-fg-3">{status}</p>
      </div>
      {onView && set && (
        <IconButton label={t.mission.panel.view} size="sm" onClick={onView}>
          <ScanEye size={15} />
        </IconButton>
      )}
      <IconButton label={set ? t.mission.panel.move : t.mission.panel.place} size="sm" active={active} onClick={onPlace}>
        <Crosshair size={15} />
      </IconButton>
      {onClear && set && (
        <IconButton label={t.mission.panel.clear} size="sm" tone="danger" onClick={onClear}>
          <X size={15} />
        </IconButton>
      )}
    </div>
  );
}
