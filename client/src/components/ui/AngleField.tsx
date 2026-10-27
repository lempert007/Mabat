import { useEffect, useState, type ComponentProps } from 'react';
import { AngleDial } from './AngleDial';
import { cn } from '@/lib/cn';

type AngleFieldProps = ComponentProps<typeof AngleDial>;

/**
 * An angle as a dial to turn and, under it, its name and a box for typing an exact number of
 * degrees. Typing past the dial's limit stops at the limit.
 */
export function AngleField(props: AngleFieldProps) {
  const { label, value, implied, limit = 180, onChange } = props;
  const [text, setText] = useState(String(Math.round(value)));
  useEffect(() => setText(String(Math.round(value))), [value]);

  const commit = () => {
    const parsed = Number(text);
    if (text.trim() && Number.isFinite(parsed)) {
      const next = Math.min(Math.max(parsed, -limit), limit);
      if (next !== value) onChange(next);
      setText(String(Math.round(next)));
    } else setText(String(Math.round(value)));
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <AngleDial {...props} />
      <span className="text-[12px] text-fg-3">{label}</span>
      <span dir="ltr" className="flex items-center">
        <input
          value={text}
          inputMode="numeric"
          aria-label={label}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          className={cn(
            'h-6 w-12 rounded-md border border-line bg-white/5 px-1 text-center text-[12px] tabular-nums transition-colors hover:border-line-strong focus:border-accent focus-ring',
            implied ? 'text-fg-3' : 'text-fg',
          )}
        />
        <span className="ps-0.5 text-[12px] text-fg-3">°</span>
      </span>
    </div>
  );
}
