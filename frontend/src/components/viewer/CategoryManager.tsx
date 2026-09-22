import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { useCreateCategory, useDeleteCategory, useUpdateCategory } from '@/api/categories';
import { CATEGORY_PALETTE } from '@/lib/color';
import { errorMessage } from '@/lib/errorMessage';
import { toast } from '@/store/toastStore';
import type { Category } from '@/types/api';
import { t } from '@/i18n/he';

interface CategoryManagerProps {
  projectId: string;
  categories: Category[];
}

function ColorDot({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={color}
      onClick={onClick}
      className="h-5 w-5 rounded-full transition-transform hover:scale-110 focus-ring"
      style={{ background: color, boxShadow: selected ? `0 0 0 2px var(--color-bg), 0 0 0 4px ${color}` : undefined }}
    />
  );
}

export function CategoryManager({ projectId, categories }: CategoryManagerProps) {
  const create = useCreateCategory(projectId);
  const update = useUpdateCategory(projectId);
  const remove = useDeleteCategory(projectId);
  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_PALETTE[4]);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {categories.map((category) => (
          <li key={category.id} className="flex items-center gap-3 rounded-xl border border-line bg-white/3 px-3 py-2">
            <input
              type="color"
              value={category.color}
              aria-label={t.categories.color}
              onChange={(e) => update.mutate({ id: category.id, data: { color: e.target.value } })}
              className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
            />
            <input
              defaultValue={category.name}
              aria-label={t.categories.name}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && value !== category.name) update.mutate({ id: category.id, data: { name: value } });
              }}
              className="flex-1 bg-transparent text-sm text-fg focus:outline-none"
            />
            <IconButton
              label={t.common.remove}
              size="sm"
              tone="danger"
              onClick={() => remove.mutate(category.id, { onError: (error) => toast.error(errorMessage(error)) })}
            >
              <Trash2 size={14} />
            </IconButton>
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-fg-4">{t.categories.deleteHint}</p>
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-white/3 p-3">
        <div className="flex items-center gap-2">
          <Input placeholder={t.categories.name} value={name} onChange={(e) => setName(e.target.value)} />
          <Button
            size="md"
            variant="primary"
            icon={<Plus size={14} />}
            loading={create.isPending}
            disabled={!name.trim()}
            onClick={() => create.mutate({ name: name.trim(), color }, { onSuccess: () => setName('') })}
          >
            {t.common.add}
          </Button>
        </div>
        <div className="flex items-center gap-2 px-0.5">
          {CATEGORY_PALETTE.map((c) => (
            <ColorDot key={c} color={c} selected={c === color} onClick={() => setColor(c)} />
          ))}
        </div>
      </div>
    </div>
  );
}
