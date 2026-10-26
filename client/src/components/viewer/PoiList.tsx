import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, Search } from 'lucide-react';
import { CategoryFilter } from './CategoryFilter';
import { PoiListItem } from './PoiListItem';
import { useViewerStore } from '@/store/viewerStore';
import { useReorderPois } from '@/api/pois';
import { moveItem } from '@/lib/blocks';
import type { Category, Poi } from '@/types/api';
import { t } from '@/i18n/he';

interface PoiListProps {
  projectId: string;
  ordered: Poi[];
  categories: Category[];
  editable: boolean;
  onSelect: (poi: Poi) => void;
}

const FALLBACK_COLOR = '#8b9cff';

export function PoiList({ projectId, ordered, categories, editable, onSelect }: PoiListProps) {
  const listOpen = useViewerStore((s) => s.listOpen);
  const introVisible = useViewerStore((s) => s.introVisible);
  const search = useViewerStore((s) => s.search);
  const setSearch = useViewerStore((s) => s.setSearch);
  const categoryFilter = useViewerStore((s) => s.categoryFilter);
  const selectedPoiId = useViewerStore((s) => s.selectedPoiId);
  const setHovered = useViewerStore((s) => s.setHovered);
  const reorder = useReorderPois(projectId);
  const colorOf = useMemo(() => new Map(categories.map((c) => [c.id, c.color])), [categories]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return ordered.filter(
      (poi) =>
        (!categoryFilter || poi.categoryId === categoryFilter) &&
        (!needle || poi.title.toLowerCase().includes(needle) || poi.identifier.toLowerCase().includes(needle) || poi.summary.toLowerCase().includes(needle)),
    );
  }, [ordered, search, categoryFilter]);

  const move = (poi: Poi, delta: 1 | -1) => {
    const from = ordered.findIndex((p) => p.id === poi.id);
    reorder.mutate(moveItem(ordered, from, from + delta).map((p) => p.id));
  };

  return (
    <AnimatePresence>
      {listOpen && !introVisible && (
        <motion.aside
          className="absolute start-4 top-20 bottom-4 z-20 hidden w-[300px] flex-col overflow-hidden rounded-2xl glass md:flex"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="flex flex-col gap-3 px-4 pt-4 pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-fg-3">{t.viewer.points}</h2>
              <span className="text-[12px] tabular-nums text-fg-4">{ordered.length}</span>
            </div>
            <label className="relative block">
              <Search size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-fg-4" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.viewer.searchPoints}
                className="h-9 w-full rounded-xl bg-white/5 border border-line ps-9 pe-3 text-sm text-fg placeholder:text-fg-4 focus:border-accent focus-ring"
              />
            </label>
            <CategoryFilter categories={categories} />
          </div>
          <ul className="flex-1 overflow-y-auto px-2 pb-2">
            {ordered.length === 0 && (
              <li className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <MapPin size={22} className="text-fg-4" />
                <p className="text-sm font-medium">{t.viewer.noPoints}</p>
                {editable && <p className="text-[12px] text-fg-4">{t.viewer.noPointsHint}</p>}
              </li>
            )}
            {ordered.length > 0 && visible.length === 0 && (
              <li className="px-4 py-8 text-center text-[13px] text-fg-4">{t.viewer.noMatches}</li>
            )}
            {visible.map((poi) => {
              const index = ordered.indexOf(poi);
              return (
                <PoiListItem
                  key={poi.id}
                  poi={poi}
                  index={index}
                  color={(poi.categoryId && colorOf.get(poi.categoryId)) || FALLBACK_COLOR}
                  selected={poi.id === selectedPoiId}
                  editable={editable && !search && !categoryFilter}
                  canMoveUp={index > 0}
                  canMoveDown={index < ordered.length - 1}
                  onSelect={() => onSelect(poi)}
                  onHover={setHovered}
                  onMove={(delta) => move(poi, delta)}
                />
              );
            })}
          </ul>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
