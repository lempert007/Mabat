import type { Block } from '@/types/api';
import { BlockRenderer } from './BlockRenderer';
import { SectionBlockView } from './SectionBlockView';

interface BlockListProps {
  blocks: Block[];
  /** Set by expand-all / collapse-all; null leaves each section under its own control. */
  forcedOpen?: boolean | null;
}

export function BlockList({ blocks, forcedOpen = null }: BlockListProps) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block) =>
        block.type === 'section' ? (
          <SectionBlockView
            key={block.id}
            title={block.title}
            defaultOpen={block.defaultOpen}
            forcedOpen={forcedOpen}
            isEmpty={block.blocks.length === 0}
          >
            <BlockList blocks={block.blocks} />
          </SectionBlockView>
        ) : (
          <BlockRenderer key={block.id} block={block} />
        ),
      )}
    </div>
  );
}
