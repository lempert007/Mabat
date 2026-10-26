import type { SpecsBlock } from '@/types/api';

export function SpecsBlockView({ block }: { block: SpecsBlock }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
      {block.items.map((item, index) => (
        <div key={index} className="bg-surface-2/80 px-3.5 py-2.5">
          <dt className="text-[11px] uppercase tracking-[0.08em] text-fg-3">{item.label}</dt>
          <dd className="mt-0.5 text-[15px] font-medium text-fg tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
