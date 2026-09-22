import { memo, useCallback } from 'react';
import { markerRegistry } from '@/store/markerRegistry';
import { hexToRgba } from '@/lib/color';
import { cn } from '@/lib/cn';
import type { Poi } from '@/types/api';

interface MarkerProps {
  poi: Poi;
  index: number;
  color: string;
  selected: boolean;
  hovered: boolean;
  muted: boolean;
  onSelect: (poi: Poi) => void;
  onHover: (id: string | null) => void;
  onContextMenu: ((poi: Poi, screen: { x: number; y: number }) => void) | null;
}

/**
 * One pin. Its screen position is written directly by MarkerProjector every frame, so this
 * component only re-renders when its appearance changes, never when the camera moves.
 *
 * Every state change animates `scale`, colour or shadow, never width or height, so a marker
 * never triggers layout while the camera is moving.
 */
export const Marker = memo(function Marker({
  poi,
  index,
  color,
  selected,
  hovered,
  muted,
  onSelect,
  onHover,
  onContextMenu,
}: MarkerProps) {
  const poiId = poi.id;
  const registerRef = useCallback(
    (element: HTMLDivElement | null) => markerRegistry.register(poiId, element),
    [poiId],
  );
  const showLabel = selected || hovered;

  return (
    <div ref={registerRef} className="marker" data-behind="false" data-occluded="false">
      <div
        className={cn('marker-body absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2', muted && 'opacity-30')}
        style={{ color }}
      >
        <button
          type="button"
          aria-label={`${poi.identifier} ${poi.title}`}
          aria-pressed={selected}
          onClick={() => onSelect(poi)}
          onContextMenu={(event) => {
            if (!onContextMenu) return;
            event.preventDefault();
            onContextMenu(poi, { x: event.clientX, y: event.clientY });
          }}
          onMouseEnter={() => onHover(poiId)}
          onMouseLeave={() => onHover(null)}
          className={cn(
            'pointer-events-auto relative flex h-8 w-8 items-center justify-center rounded-full border-2 text-[12px] font-semibold tabular-nums',
            'transition-[scale,background-color,border-color,box-shadow,color] duration-300 ease-out-soft focus-ring',
            selected ? 'scale-[1.15] marker-pulse' : 'hover:scale-110',
          )}
          style={{
            borderColor: color,
            background: selected ? color : hexToRgba(color, 0.42),
            color: selected ? '#0a0a0c' : '#ffffff',
            boxShadow: selected
              ? `0 0 0 6px ${hexToRgba(color, 0.18)}, 0 10px 30px rgba(0,0,0,0.55)`
              : '0 6px 18px rgba(0,0,0,0.5)',
          }}
        >
          {index + 1}
        </button>
        <div
          className={cn(
            'marker-label pointer-events-none absolute start-full top-1/2 ms-2.5 -translate-y-1/2 whitespace-nowrap rounded-full glass px-3 py-1.5 text-[13px]',
            'transition-[opacity,translate] duration-200 ease-out-soft',
            showLabel ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1 rtl:translate-x-1',
          )}
        >
          <bdi className="text-fg-3 me-1.5 text-[11px] tabular-nums">{poi.identifier}</bdi>
          <span className="font-medium text-fg">{poi.title}</span>
        </div>
      </div>
    </div>
  );
});
