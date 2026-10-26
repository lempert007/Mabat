import { useEffect, useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
  /** What may be typed, where that goes past the slider. Defaults to the slider's range. */
  limits?: [number, number];
  /** Shown under the slider, such as a check on the value. */
  hint?: ReactNode;
}

/**
 * A slider for feeling out a value and a box for typing an exact one. The box can go past the
 * slider, for the rare flight that needs it, as far as `limits`.
 */
export function NumberField({ label, value, min, max, step = 1, unit, onChange, limits = [min, max], hint }: NumberFieldProps) {
  const id = useId();
  const [text, setText] = useState(String(round(value, step)));
  useEffect(() => setText(String(round(value, step))), [value, step]);

  const commit = () => {
    const parsed = Number(text);
    const next = Number.isFinite(parsed) && text.trim() ? Math.min(Math.max(parsed, limits[0]), limits[1]) : value;
    if (next !== value) onChange(next);
    setText(String(round(next, step)));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[13px] text-fg-2">
          {label}
        </label>
        <span className="flex items-center gap-1.5">
          <input
            id={id}
            inputMode="decimal"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
            dir="ltr"
            className="h-7 w-16 rounded-lg border border-line bg-white/5 px-2 text-end text-[13px] tabular-nums text-fg transition-colors hover:border-line-strong focus:border-accent focus-ring"
          />
          <span className="w-10 text-[12px] text-fg-3">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(value, min), max)}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(
          'h-1 w-full cursor-pointer appearance-none rounded-full bg-white/12 accent-accent focus-ring',
          '[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-fg',
          '[&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(0,0,0,0.5)]',
        )}
      />
      {hint}
    </div>
  );
}

function round(value: number, step: number): number {
  const decimals = step < 1 ? Math.min(2, Math.ceil(-Math.log10(step))) : 0;
  return Number(value.toFixed(decimals));
}
