import { FileText, Heading, Image, Link2, List, Rows3, Table2, Type } from 'lucide-react';
import type { ReactNode } from 'react';
import type { BlockType } from '@/types/api';
import { t } from '@/i18n/he';

export const blockMeta: Record<BlockType, { label: string; icon: ReactNode }> = {
  section: { label: t.blocks.section, icon: <Rows3 size={15} /> },
  heading: { label: t.blocks.heading, icon: <Heading size={15} /> },
  text: { label: t.blocks.text, icon: <Type size={15} /> },
  specs: { label: t.blocks.specs, icon: <List size={15} /> },
  table: { label: t.blocks.table, icon: <Table2 size={15} /> },
  images: { label: t.blocks.images, icon: <Image size={15} /> },
  documents: { label: t.blocks.documents, icon: <FileText size={15} /> },
  link: { label: t.blocks.link, icon: <Link2 size={15} /> },
};
