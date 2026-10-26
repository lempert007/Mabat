import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconButton } from '@/components/ui/IconButton';
import { useDeleteCategory, useUpdateCategory } from '@/api/categories';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { errorMessage } from '@/lib/errorMessage';
import { toast } from '@/store/toastStore';
import type { Category } from '@/types/api';
import { t } from '@/i18n/he';

/** A colour picker reports every step of a drag, so the save waits until it settles. */
const COLOR_SAVE_DELAY_MS = 400;

interface CategoryRowProps {
  projectId: string;
  category: Category;
}

/** One category in the settings panel: rename on blur, recolour live, delete after asking. */
export function CategoryRow({ projectId, category }: CategoryRowProps) {
  const update = useUpdateCategory(projectId);
  const remove = useDeleteCategory(projectId);
  const [color, setColor] = useState(category.color);
  const [name, setName] = useState(category.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => setColor(category.color), [category.color]);
  useEffect(() => setName(category.name), [category.name]);

  const onError = (error: unknown) => toast.error(errorMessage(error));
  const saveColor = useDebouncedCallback(
    (value: string) => update.mutate({ id: category.id, data: { color: value } }, { onError }),
    COLOR_SAVE_DELAY_MS,
  );

  const commitName = () => {
    const value = name.trim();
    if (!value) setName(category.name); // an empty name is never saved, so do not show one
    else if (value !== category.name) update.mutate({ id: category.id, data: { name: value } }, { onError });
  };

  return (
    <li className="flex items-center gap-3 rounded-xl border border-line bg-white/3 px-3 py-2">
      <input
        type="color"
        value={color}
        aria-label={t.categories.color}
        onChange={(event) => {
          setColor(event.target.value);
          saveColor(event.target.value);
        }}
        className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
      />
      <input
        value={name}
        aria-label={t.categories.name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        className="flex-1 bg-transparent text-sm text-fg focus:outline-none"
      />
      <IconButton label={t.common.remove} size="sm" tone="danger" onClick={() => setConfirmDelete(true)}>
        <Trash2 size={14} />
      </IconButton>
      <ConfirmDialog
        open={confirmDelete}
        title={t.categories.deleteTitle}
        body={t.categories.deleteBody}
        loading={remove.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(category.id, { onSuccess: () => setConfirmDelete(false), onError })
        }
      />
    </li>
  );
}
