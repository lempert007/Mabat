import { hexToRgba } from '@/lib/color';
import { cn } from '@/lib/cn';

interface CategoryChipProps {
  name: string;
  color: string;
  active?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export function CategoryChip({ name, color, active = true, onClick, size = 'md' }: CategoryChipProps) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium leading-none transition-all duration-200 focus-ring',
        size === 'sm' ? 'h-6 px-2 text-[11px]' : 'h-7 px-2.5 text-[12px]',
        onClick && 'hover:brightness-125 cursor-pointer',
        !active && 'opacity-45',
      )}
      style={{ background: hexToRgba(color, 0.16), color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {name}
    </Tag>
  );
}
