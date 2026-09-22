import { ArrowUpRight } from 'lucide-react';
import type { LinkBlock } from '@/types/api';

export function LinkBlockView({ block }: { block: LinkBlock }) {
  if (!block.url) return null;
  return (
    <a
      href={block.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-strong hover:underline focus-ring rounded"
    >
      {block.label || block.url}
      <ArrowUpRight size={14} />
    </a>
  );
}
