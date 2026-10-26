import { ExternalLink, FileText } from 'lucide-react';
import { attachmentFileUrl } from '@/api/attachments';
import type { DocumentsBlock } from '@/types/api';
import { t } from '@/i18n/he';

export function DocumentsBlockView({ block }: { block: DocumentsBlock }) {
  if (block.items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {block.items.map((item) => (
        <li key={item.attachmentId}>
          <a
            href={attachmentFileUrl(item.attachmentId)}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-line bg-white/3 px-3 py-2.5 transition-colors hover:bg-white/6 focus-ring"
          >
            <span className="h-9 w-9 shrink-0 rounded-lg bg-danger-soft text-danger flex items-center justify-center">
              <FileText size={17} />
            </span>
            <span className="flex-1 truncate text-sm font-medium">{item.title || t.blocks.untitledDocument}</span>
            <ExternalLink size={14} className="text-fg-4 group-hover:text-fg-2" />
          </a>
        </li>
      ))}
    </ul>
  );
}
