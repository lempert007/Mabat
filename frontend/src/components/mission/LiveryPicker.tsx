import { cn } from '@/lib/cn';
import { t } from '@/i18n/he';

const LIVERIES = ['#5b9cff', '#34c76f', '#f5b544', '#ff6b6b', '#b48cff', '#e8ecf2', '#c9a27a', '#2a2d34'];

/** The colour a built-in model is painted in. */
export function LiveryPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-fg-2">{t.mission.panel.livery}</span>
      <span className="flex flex-wrap items-center justify-end gap-1.5">
        {LIVERIES.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={color}
            aria-pressed={value === color}
            onClick={() => onChange(color)}
            className={cn(
              'h-5 w-5 rounded-full border-2 transition-transform duration-200 hover:scale-110 focus-ring',
              value === color ? 'border-fg' : 'border-white/10',
            )}
            style={{ background: color }}
          />
        ))}
      </span>
    </div>
  );
}
