import type { ContentBlock } from '@/types/api';
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
  onChange: (block: ContentBlock) => void;
}

export function BlockEditor({ block, projectId, poiId, onChange }: BlockEditorProps) {
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
      return <ImagesBlockEditor block={block} projectId={projectId} poiId={poiId} onChange={onChange} />;
    case 'documents':
      return <DocumentsBlockEditor block={block} projectId={projectId} poiId={poiId} onChange={onChange} />;
    case 'link':
      return <LinkBlockEditor block={block} onChange={onChange} />;
  }
}
