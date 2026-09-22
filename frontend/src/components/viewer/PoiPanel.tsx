import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PoiDetails } from './PoiDetails';
import { PoiEditor } from './PoiEditor';
import { useViewerStore } from '@/store/viewerStore';
import type { Category, Poi } from '@/types/api';

interface PoiPanelProps {
  poi: Poi | null;
  index: number;
  total: number;
  previous: Poi | null;
  next: Poi | null;
  categories: Category[];
  editable: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function PoiPanel({ poi, index, total, previous, next, categories, editable, onPrev, onNext }: PoiPanelProps) {
  const selectPoi = useViewerStore((s) => s.selectPoi);
  const pendingEditPoiId = useViewerStore((s) => s.pendingEditPoiId);
  const setPendingEdit = useViewerStore((s) => s.setPendingEdit);
  const [editing, setEditing] = useState(false);

  // A point opens straight into the editor when something asked for it, such as a new point or
  // the edit entry in the right-click menu. Moving to another point closes it again.
  useEffect(() => {
    if (editable && poi && poi.id === pendingEditPoiId) {
      setEditing(true);
      setPendingEdit(null);
    } else {
      setEditing(false);
    }
  }, [editable, poi?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const category = poi?.categoryId ? categories.find((c) => c.id === poi.categoryId) ?? null : null;

  return (
    <AnimatePresence>
      {poi && (
        <motion.aside
          key={poi.id}
          className="absolute z-20 flex flex-col overflow-hidden glass rounded-2xl inset-x-3 bottom-3 top-[45%] md:inset-x-auto md:end-4 md:top-20 md:bottom-4 md:w-[440px]"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {editing && editable ? (
            <PoiEditor
              poi={poi}
              categories={categories}
              onDone={() => setEditing(false)}
              onDeleted={() => {
                setEditing(false);
                selectPoi(null);
              }}
            />
          ) : (
            <PoiDetails
              poi={poi}
              index={index}
              total={total}
              category={category}
              previous={previous}
              next={next}
              editable={editable}
              onClose={() => selectPoi(null)}
              onEdit={() => setEditing(true)}
              onPrev={onPrev}
              onNext={onNext}
            />
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
