import { CategoryChip } from '@/components/ui/CategoryChip';
import { useViewerStore } from '@/store/viewerStore';
import type { Category } from '@/types/api';
import { cn } from '@/lib/cn';
import { t } from '@/i18n/he';

export function CategoryFilter({ categories }: { categories: Category[] }) {
  const filter = useViewerStore((s) => s.categoryFilter);
  const setFilter = useViewerStore((s) => s.setCategoryFilter);
  if (categories.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => setFilter(null)}
        className={cn(
          'h-7 rounded-full px-2.5 text-[12px] font-medium transition-colors focus-ring',
          filter === null ? 'bg-white/12 text-fg' : 'bg-white/5 text-fg-3 hover:text-fg-2',
        )}
      >
        {t.viewer.allCategories}
      </button>
      {categories.map((category) => (
        <CategoryChip
          key={category.id}
          name={category.name}
          color={category.color}
          active={filter === null || filter === category.id}
          onClick={() => setFilter(filter === category.id ? null : category.id)}
        />
      ))}
    </div>
  );
}
