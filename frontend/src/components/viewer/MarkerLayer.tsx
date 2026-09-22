import { useMemo } from 'react';
import { Marker } from './Marker';
import { useViewerStore } from '@/store/viewerStore';
import type { Category, Poi } from '@/types/api';

interface MarkerLayerProps {
  pois: Poi[];
  categories: Category[];
  onSelect: (poi: Poi) => void;
  onContextMenu: ((poi: Poi, screen: { x: number; y: number }) => void) | null;
}

const FALLBACK_COLOR = '#8b9cff';

export function MarkerLayer({ pois, categories, onSelect, onContextMenu }: MarkerLayerProps) {
  const selectedPoiId = useViewerStore((s) => s.selectedPoiId);
  const hoveredPoiId = useViewerStore((s) => s.hoveredPoiId);
  const setHovered = useViewerStore((s) => s.setHovered);
  const categoryFilter = useViewerStore((s) => s.categoryFilter);
  const introVisible = useViewerStore((s) => s.introVisible);
  const colorOf = useMemo(() => new Map(categories.map((c) => [c.id, c.color])), [categories]);

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-500 ${introVisible ? 'opacity-0' : 'opacity-100'}`}
      aria-hidden={introVisible}
    >
      {pois.map((poi, index) => (
        <Marker
          key={poi.id}
          poi={poi}
          index={index}
          color={(poi.categoryId && colorOf.get(poi.categoryId)) || FALLBACK_COLOR}
          selected={poi.id === selectedPoiId}
          hovered={poi.id === hoveredPoiId}
          muted={Boolean(categoryFilter) && poi.categoryId !== categoryFilter}
          onSelect={onSelect}
          onHover={setHovered}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}
