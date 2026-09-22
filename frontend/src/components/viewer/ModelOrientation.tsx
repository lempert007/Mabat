import { RotateCcw, RotateCw, Undo2 } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { quarterTurn, isUpright, type TurnAxis } from '@/lib/orientation';
import type { Quaternion } from '@/types/api';
import { t } from '@/i18n/he';

interface ModelOrientationProps {
  rotation: Quaternion | null;
  onChange: (rotation: Quaternion | null) => void;
}

/** Each row is one way of turning the model, and each press is a quarter turn. */
const ROWS: { axis: TurnAxis; label: string }[] = [
  { axis: 'tip', label: t.settings.orientationTip },
  { axis: 'turn', label: t.settings.orientationTurn },
  { axis: 'lean', label: t.settings.orientationLean },
];

/**
 * Straightens a model that was exported the wrong way up.
 *
 * There is no axis vocabulary here on purpose: the model turns under the pointer as each button
 * is pressed, so the editor stops when it looks right rather than working out which axis a
 * particular exporter treats as up.
 */
export function ModelOrientation({ rotation, onChange }: ModelOrientationProps) {
  const upright = isUpright(rotation);

  return (
    <div className="flex flex-col gap-2">
      {ROWS.map(({ axis, label }) => (
        <div key={axis} className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-fg-2">{label}</span>
          <span className="flex items-center gap-1">
            <IconButton
              label={`${label} · ${t.settings.orientationCounter}`}
              size="sm"
              onClick={() => onChange(quarterTurn(rotation, axis, 1))}
            >
              <RotateCcw size={15} />
            </IconButton>
            <IconButton
              label={`${label} · ${t.settings.orientationClockwise}`}
              size="sm"
              onClick={() => onChange(quarterTurn(rotation, axis, -1))}
            >
              <RotateCw size={15} />
            </IconButton>
          </span>
        </div>
      ))}

      <button
        type="button"
        disabled={upright}
        onClick={() => onChange(null)}
        className="mt-1 inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-[12px] text-fg-3 transition-colors hover:bg-white/6 hover:text-fg focus-ring disabled:pointer-events-none disabled:opacity-40"
      >
        <Undo2 size={13} />
        {t.settings.orientationReset}
      </button>
    </div>
  );
}
