import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { IconButton } from '@/components/ui/IconButton';
import { BlockList } from '@/components/blocks/BlockList';
import type { Category, Poi } from '@/types/api';
import { t } from '@/i18n/he';

interface PoiDetailsProps {
  poi: Poi;
  index: number;
  total: number;
  category: Category | null;
  previous: Poi | null;
  next: Poi | null;
  editable: boolean;
  onClose: () => void;
  onEdit: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const FALLBACK_COLOR = '#8b9cff';
const pad = (value: number) => String(value).padStart(2, '0');

export function PoiDetails({
  poi,
  index,
  total,
  category,
  previous,
  next,
  editable,
  onClose,
  onEdit,
  onPrev,
  onNext,
}: PoiDetailsProps) {
  // null leaves every section under its own control; true or false overrides all of them at once.
  const [forcedOpen, setForcedOpen] = useState<boolean | null>(null);
  const sectionCount = useMemo(
    () => poi.blocks.filter((block) => block.type === 'section').length,
    [poi.blocks],
  );
  const accent = category?.color ?? FALLBACK_COLOR;

  return (
    <div className="flex h-full flex-col">
      <span aria-hidden="true" className="h-[3px] shrink-0" style={{ background: accent }} />

      <header className="flex shrink-0 items-start justify-between gap-3 px-6 pt-4 pb-4">
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span dir="ltr" className="text-[12px] font-medium tabular-nums text-fg-3">
              {pad(index + 1)} / {pad(total)}
            </span>
            <span aria-hidden="true" className="text-fg-4">·</span>
            <bdi className="text-[12px] font-medium tabular-nums text-fg-3">{poi.identifier}</bdi>
            {category && <CategoryChip name={category.name} color={category.color} size="sm" />}
          </div>
          <h2 className="text-[25px] font-semibold leading-[1.15] tracking-[-0.02em] text-balance">
            {poi.title}
          </h2>
          {poi.summary && (
            <p className="text-[15px] leading-relaxed text-fg-2 text-balance">{poi.summary}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center">
          {editable && (
            <IconButton label={t.panel.editPoint} size="sm" onClick={onEdit}>
              <Pencil size={15} />
            </IconButton>
          )}
          <IconButton label={t.common.close} size="sm" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6">
        {poi.blocks.length === 0 ? (
          <p className="text-[13px] text-fg-4">{t.panel.noContent}</p>
        ) : (
          <>
            {sectionCount > 1 && (
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setForcedOpen((current) => current === false)}
                  className="rounded-lg px-2 py-1 text-[12px] font-medium text-fg-3 transition-colors hover:bg-white/6 hover:text-fg focus-ring"
                >
                  {forcedOpen === false ? t.panel.expandAll : t.panel.collapseAll}
                </button>
              </div>
            )}
            <BlockList blocks={poi.blocks} forcedOpen={forcedOpen} />
          </>
        )}
      </div>

      {total > 1 && (
        <footer className="flex shrink-0 items-center gap-2 px-3 py-2.5 hairline-t bg-white/3">
          <button
            type="button"
            onClick={onPrev}
            className="group flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 py-1.5 text-start transition-colors hover:bg-white/6 focus-ring"
          >
            <ChevronRight size={15} className="shrink-0 text-fg-3 group-hover:text-fg" />
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-[0.1em] text-fg-4">{t.viewer.previous}</span>
              <span className="block truncate text-[13px] text-fg-2 group-hover:text-fg">{previous?.title}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={onNext}
            className="group flex min-w-0 flex-1 items-center justify-end gap-1.5 rounded-lg px-2 py-1.5 text-end transition-colors hover:bg-white/6 focus-ring"
          >
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-[0.1em] text-fg-4">{t.viewer.next}</span>
              <span className="block truncate text-[13px] text-fg-2 group-hover:text-fg">{next?.title}</span>
            </span>
            <ChevronLeft size={15} className="shrink-0 text-fg-3 group-hover:text-fg" />
          </button>
        </footer>
      )}
    </div>
  );
}
