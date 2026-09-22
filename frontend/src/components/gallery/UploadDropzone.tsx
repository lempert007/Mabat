import { useRef, useState, type DragEvent } from 'react';
import { FileBox, UploadCloud } from 'lucide-react';
import { formatBytes } from '@/lib/format';
import { MODEL_ACCEPT } from '@/lib/uploadFormats';
import { t } from '@/i18n/he';

interface UploadDropzoneProps {
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}

export function UploadDropzone({ file, onFile, disabled }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) onFile(dropped);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`w-full rounded-2xl border border-dashed p-6 text-center transition-all duration-200 focus-ring ${
        dragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-white/3 hover:bg-white/5'
      } disabled:opacity-60`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={MODEL_ACCEPT}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="flex items-center justify-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-accent-soft text-accent-strong flex items-center justify-center">
            <FileBox size={18} />
          </span>
          <div className="text-start">
            {/* A filename and a size are Latin runs: without isolation "64 B" reads as "B 64". */}
            <p className="text-sm font-medium truncate max-w-[260px]">
              <bdi>{file.name}</bdi>
            </p>
            <p className="text-[12px] text-fg-3">
              <bdi>{formatBytes(file.size)}</bdi>
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <UploadCloud size={28} strokeWidth={1.5} className="text-fg-3" />
          <p className="text-sm font-medium">{t.upload.dropHere}</p>
          <p className="text-[12px] text-fg-4">{t.upload.formats}</p>
        </div>
      )}
    </button>
  );
}
