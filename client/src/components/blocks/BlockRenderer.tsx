import type { ContentBlock } from '@/types/api';
import { HeadingBlockView } from './HeadingBlockView';
import { TextBlockView } from './TextBlockView';
import { SpecsBlockView } from './SpecsBlockView';
import { TableBlockView } from './TableBlockView';
import { ImagesBlockView } from './ImagesBlockView';
import { DocumentsBlockView } from './DocumentsBlockView';
import { LinkBlockView } from './LinkBlockView';

export function BlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'heading':
      return <HeadingBlockView block={block} />;
    case 'text':
      return <TextBlockView block={block} />;
    case 'specs':
      return <SpecsBlockView block={block} />;
    case 'table':
      return <TableBlockView block={block} />;
    case 'images':
      return <ImagesBlockView block={block} />;
    case 'documents':
      return <DocumentsBlockView block={block} />;
    case 'link':
      return <LinkBlockView block={block} />;
  }
}
