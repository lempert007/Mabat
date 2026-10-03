import type { Block, BlockType, ContentBlockType } from '@/types/api';
import { createId } from './id';
import { t } from '@/i18n/he';

/** Block types a section can hold. Offered both at the top level and inside a section. */
export const CONTENT_BLOCK_TYPES: ContentBlockType[] = [
  'heading',
  'text',
  'specs',
  'table',
  'images',
  'documents',
  'link',
];

/** Block types offered at the top level of a point. */
export const BLOCK_TYPES: BlockType[] = ['section', ...CONTENT_BLOCK_TYPES];

export function createBlock(type: BlockType): Block {
  const id = createId();
  switch (type) {
    case 'section':
      return { id, type, title: '', defaultOpen: true, blocks: [] };
    case 'heading':
      return { id, type, text: '' };
    case 'text':
      return { id, type, markdown: '' };
    case 'specs':
      return { id, type, items: [{ label: '', value: '' }] };
    case 'table':
      return { id, type, columns: [`${t.blocks.column} 1`, `${t.blocks.column} 2`], rows: [['', '']] };
    case 'images':
      return { id, type, items: [] };
    case 'documents':
      return { id, type, items: [] };
    case 'link':
      return { id, type, url: '', label: '' };
  }
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
