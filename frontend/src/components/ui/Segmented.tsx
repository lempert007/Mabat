import { cn } from '@/lib/cn';

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

export function Segmented<T extends string>({ value, options, onChange, size = 'md' }: SegmentedProps<T>) {
  return (
    <div className={cn('inline-flex rounded-xl bg-white/5 border border-line p-0.5', size === 'sm' ? 'h-8' : 'h-10')}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'px-3 rounded-[10px] text-sm font-medium transition-all duration-200 focus-ring',
            option.value === value ? 'bg-white/10 text-fg shadow-sm' : 'text-fg-3 hover:text-fg-2',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
