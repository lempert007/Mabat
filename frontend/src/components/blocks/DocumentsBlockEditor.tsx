import { FilePlus2, FileText, X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { AttachmentUploadButton } from './AttachmentUploadButton';
import type { DocumentsBlock } from '@/types/api';
import { t } from '@/i18n/he';

interface DocumentsBlockEditorProps {
  block: DocumentsBlock;
  projectId: string;
  poiId: string;
  onChange: (b: DocumentsBlock) => void;
}

export function DocumentsBlockEditor({ block, projectId, poiId, onChange }: DocumentsBlockEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      {block.items.map((item, index) => (
        <div key={item.attachmentId} className="flex items-center gap-2">
          <span className="h-9 w-9 shrink-0 rounded-lg bg-danger-soft text-danger flex items-center justify-center">
            <FileText size={16} />
          </span>
          <Input
            placeholder={t.blocks.documentTitle}
            value={item.title}
            onChange={(e) => onChange({ ...block, items: block.items.map((it, i) => (i === index ? { ...it, title: e.target.value } : it)) })}
          />
          <IconButton label={t.common.remove} size="sm" onClick={() => onChange({ ...block, items: block.items.filter((_, i) => i !== index) })}>
            <X size={14} />
          </IconButton>
        </div>
      ))}
      <AttachmentUploadButton
        projectId={projectId}
        poiId={poiId}
        accept="application/pdf"
        icon={<FilePlus2 size={14} />}
        label={t.blocks.addDocuments}
        onUploaded={(attachment) =>
          onChange({ ...block, items: [...block.items, { attachmentId: attachment.id, title: attachment.filename.replace(/\.pdf$/i, '') }] })
        }
      />
    </div>
  );
}
