import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import type { TableBlock } from '@/types/api';
import { t } from '@/i18n/he';

const cellClass =
  'w-full min-w-[110px] h-8 px-2 rounded-md bg-white/5 border border-line text-sm text-fg placeholder:text-fg-4 focus:border-accent focus-ring';

export function TableBlockEditor({ block, onChange }: { block: TableBlock; onChange: (b: TableBlock) => void }) {
  const setColumn = (index: number, value: string) =>
    onChange({ ...block, columns: block.columns.map((c, i) => (i === index ? value : c)) });
  const setCell = (row: number, col: number, value: string) =>
    onChange({
      ...block,
      rows: block.rows.map((r, ri) => (ri === row ? r.map((c, ci) => (ci === col ? value : c)) : r)),
    });
  const addColumn = () =>
    onChange({
      ...block,
      columns: [...block.columns, `${t.blocks.column} ${block.columns.length + 1}`],
      rows: block.rows.map((r) => [...r, '']),
    });
  const removeColumn = (index: number) =>
    onChange({
      ...block,
      columns: block.columns.filter((_, i) => i !== index),
      rows: block.rows.map((r) => r.filter((_, i) => i !== index)),
    });
  const addRow = () => onChange({ ...block, rows: [...block.rows, block.columns.map(() => '')] });
  const removeRow = (index: number) => onChange({ ...block, rows: block.rows.filter((_, i) => i !== index) });

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              {block.columns.map((column, index) => (
                <th key={index} className="relative">
                  <input className={`${cellClass} font-medium`} value={column} onChange={(e) => setColumn(index, e.target.value)} />
                  {block.columns.length > 1 && (
                    <button
                      type="button"
                      aria-label={t.common.remove}
                      onClick={() => removeColumn(index)}
                      className="absolute -top-1.5 -end-1.5 h-4 w-4 rounded-full bg-surface-3 text-fg-3 hover:text-danger flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                  )}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {block.columns.map((_, colIndex) => (
                  <td key={colIndex}>
                    <input className={cellClass} value={row[colIndex] ?? ''} onChange={(e) => setCell(rowIndex, colIndex, e.target.value)} />
                  </td>
                ))}
                <td>
                  <IconButton label={t.common.remove} size="sm" onClick={() => removeRow(rowIndex)}>
                    <X size={14} />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={addRow}>
          {t.blocks.addRow}
        </Button>
        <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={addColumn}>
          {t.blocks.addColumn}
        </Button>
      </div>
    </div>
  );
}
