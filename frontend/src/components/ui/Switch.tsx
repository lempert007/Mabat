import { cn } from '@/lib/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-10 rounded-full transition-colors duration-200 focus-ring',
        checked ? 'bg-accent' : 'bg-white/15',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 start-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out-soft',
          checked && 'translate-x-4 rtl:-translate-x-4',
        )}
      />
    </button>
  );
}
