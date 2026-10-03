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
  /**
   * Receives an update rather than a finished list, so a change that lands late, such as an
   * upload finishing, applies to the draft as it is then and not as it was when it started.
   */
  onChange: (update: (blocks: Block[]) => Block[]) => void;
}

export function BlockEditorList({
  blocks,
  projectId,
  poiId,
  allowSections = true,
  onChange,
}: BlockEditorListProps) {
  const replace = (id: string, update: (block: Block) => Block) =>
    onChange((current) => current.map((block) => (block.id === id ? update(block) : block)));

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, index) => (
        <BlockFrame
          key={block.id}
          type={block.type}
          canMoveUp={index > 0}
          canMoveDown={index < blocks.length - 1}
          onMoveUp={() => onChange((current) => moveItem(current, index, index - 1))}
          onMoveDown={() => onChange((current) => moveItem(current, index, index + 1))}
          onRemove={() => onChange((current) => current.filter((item) => item.id !== block.id))}
        >
          {block.type === 'section' ? (
            <SectionBlockEditor block={block} onChange={(next) => replace(block.id, () => next)}>
              <BlockEditorList
                blocks={block.blocks}
                projectId={projectId}
                poiId={poiId}
                allowSections={false}
                onChange={(update) =>
                  replace(block.id, (section) => {
                    const current = section as SectionBlock;
                    return { ...current, blocks: update(current.blocks) as ContentBlock[] };
                  })
                }
              />
            </SectionBlockEditor>
          ) : (
            <BlockEditor
              block={block}
              projectId={projectId}
              poiId={poiId}
              onUpdate={(update) => replace(block.id, (current) => update(current as ContentBlock))}
            />
          )}
        </BlockFrame>
      ))}
      <AddBlockMenu
        types={allowSections ? BLOCK_TYPES : CONTENT_BLOCK_TYPES}
        onAdd={(type) => onChange((current) => [...current, createBlock(type)])}
      />
    </div>
  );
}
