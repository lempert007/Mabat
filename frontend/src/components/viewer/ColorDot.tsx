interface ColorDotProps {
  color: string;
  selected: boolean;
  onClick: () => void;
}

export function ColorDot({ color, selected, onClick }: ColorDotProps) {
  return (
    <button
      type="button"
      aria-label={color}
      aria-pressed={selected}
      onClick={onClick}
      className="h-5 w-5 rounded-full transition-transform hover:scale-110 focus-ring"
      style={{ background: color, boxShadow: selected ? `0 0 0 2px var(--color-bg), 0 0 0 4px ${color}` : undefined }}
    />
  );
}
