import type { HeadingBlock } from '@/types/api';

export function HeadingBlockView({ block }: { block: HeadingBlock }) {
  return <h3 className="text-[15px] font-semibold tracking-title text-fg pt-2">{block.text}</h3>;
}
