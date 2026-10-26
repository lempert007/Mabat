import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ColorDot } from './ColorDot';
import { CategoryRow } from './CategoryRow';
import { useCreateCategory } from '@/api/categories';
import { CATEGORY_PALETTE } from '@/lib/color';
import { errorMessage } from '@/lib/errorMessage';
import { toast } from '@/store/toastStore';
import type { Category } from '@/types/api';
import { t } from '@/i18n/he';

interface CategoryManagerProps {
  projectId: string;
  categories: Category[];
}

export function CategoryManager({ projectId, categories }: CategoryManagerProps) {
  const create = useCreateCategory(projectId);
  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_PALETTE[4]);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {categories.map((category) => (
          <CategoryRow key={category.id} projectId={projectId} category={category} />
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
            onClick={() =>
              create.mutate(
                { name: name.trim(), color },
                { onSuccess: () => setName(''), onError: (error) => toast.error(errorMessage(error)) },
              )
            }
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
