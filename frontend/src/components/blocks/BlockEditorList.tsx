import { BlockFrame } from './BlockFrame';
import { BlockEditor } from './BlockEditor';
import { AddBlockMenu } from './AddBlockMenu';
import { SectionBlockEditor } from './SectionBlockEditor';
import { BLOCK_TYPES, CONTENT_BLOCK_TYPES, createBlock, moveItem } from '@/lib/blocks';
import type { Block, ContentBlock, SectionBlock } from '@/types/api';

interface BlockEditorListProps {
  blocks: Block[];
  projectId: string;
  poiId: string;
  /** False inside a section, because sections do not nest. */
  allowSections?: boolean;
  onChange: (blocks: Block[]) => void;
}

export function BlockEditorList({
  blocks,
  projectId,
  poiId,
  allowSections = true,
  onChange,
}: BlockEditorListProps) {
  const replace = (id: string, next: Block) =>
    onChange(blocks.map((block) => (block.id === id ? next : block)));

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, index) => (
        <BlockFrame
          key={block.id}
          type={block.type}
          canMoveUp={index > 0}
          canMoveDown={index < blocks.length - 1}
          onMoveUp={() => onChange(moveItem(blocks, index, index - 1))}
          onMoveDown={() => onChange(moveItem(blocks, index, index + 1))}
          onRemove={() => onChange(blocks.filter((item) => item.id !== block.id))}
        >
          {block.type === 'section' ? (
            <SectionBlockEditor block={block} onChange={(next) => replace(block.id, next)}>
              <BlockEditorList
                blocks={block.blocks}
                projectId={projectId}
                poiId={poiId}
                allowSections={false}
                onChange={(nested) =>
                  replace(block.id, { ...block, blocks: nested as ContentBlock[] } satisfies SectionBlock)
                }
              />
            </SectionBlockEditor>
          ) : (
            <BlockEditor
              block={block}
              projectId={projectId}
              poiId={poiId}
              onChange={(next) => replace(block.id, next)}
            />
          )}
        </BlockFrame>
      ))}
      <AddBlockMenu
        types={allowSections ? BLOCK_TYPES : CONTENT_BLOCK_TYPES}
        onAdd={(type) => onChange([...blocks, createBlock(type)])}
      />
    </div>
  );
}
