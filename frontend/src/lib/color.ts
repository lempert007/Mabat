export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.replace(/./g, '$&$&') : clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const CATEGORY_PALETTE = [
  '#8b9cff',
  '#5ad1a8',
  '#f0b35a',
  '#ff6b6b',
  '#c084fc',
  '#38bdf8',
  '#f472b6',
  '#a3e635',
];
