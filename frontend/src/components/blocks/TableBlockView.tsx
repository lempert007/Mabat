import type { TableBlock } from '@/types/api';

export function TableBlockView({ block }: { block: TableBlock }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white/4 text-start">
            {block.columns.map((column, index) => (
              <th key={index} className="px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-3 whitespace-nowrap">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-line">
              {block.columns.map((_, colIndex) => (
                <td key={colIndex} className="px-3 py-2 text-fg-2 whitespace-nowrap">
                  {row[colIndex] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
