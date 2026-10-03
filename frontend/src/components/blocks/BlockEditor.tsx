import type { ContentBlock, DocumentsBlock, ImagesBlock } from '@/types/api';
import { HeadingBlockEditor } from './HeadingBlockEditor';
import { TextBlockEditor } from './TextBlockEditor';
import { SpecsBlockEditor } from './SpecsBlockEditor';
import { TableBlockEditor } from './TableBlockEditor';
import { ImagesBlockEditor } from './ImagesBlockEditor';
import { DocumentsBlockEditor } from './DocumentsBlockEditor';
import { LinkBlockEditor } from './LinkBlockEditor';

interface BlockEditorProps {
  block: ContentBlock;
  projectId: string;
  poiId: string;
  /** Applies an update to the block as it is when the update lands. */
  onUpdate: (update: (block: ContentBlock) => ContentBlock) => void;
}

export function BlockEditor({ block, projectId, poiId, onUpdate }: BlockEditorProps) {
  // Typing produces the next block straight from the current props, which are always fresh.
  const onChange = (next: ContentBlock) => onUpdate(() => next);
  switch (block.type) {
    case 'heading':
      return <HeadingBlockEditor block={block} onChange={onChange} />;
    case 'text':
      return <TextBlockEditor block={block} onChange={onChange} />;
    case 'specs':
      return <SpecsBlockEditor block={block} onChange={onChange} />;
    case 'table':
      return <TableBlockEditor block={block} onChange={onChange} />;
    case 'images':
      return (
        <ImagesBlockEditor
          block={block}
          projectId={projectId}
          poiId={poiId}
          onUpdate={(update) => onUpdate((current) => update(current as ImagesBlock))}
        />
      );
    case 'documents':
      return (
        <DocumentsBlockEditor
          block={block}
          projectId={projectId}
          poiId={poiId}
          onUpdate={(update) => onUpdate((current) => update(current as DocumentsBlock))}
        />
      );
    case 'link':
      return <LinkBlockEditor block={block} onChange={onChange} />;
  }
}
