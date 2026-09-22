import { useCallback, useRef, useState } from 'react';
import { downloadPoints, readPointsDocument } from '@/api/transfer';
import { toast } from '@/store/toastStore';
import type { PointsDocument, Project } from '@/types/api';
import { t } from '@/i18n/he';

/**
 * Carrying a set of points between models: writing them to a file, and reading one back.
 *
 * The file input is kept out of the component tree by the caller rendering `inputRef` wherever
 * it likes; everything else lives here so the toolbar only has to call two functions.
 */
export function usePointsTransfer(project: Project) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<PointsDocument | null>(null);
  const [isExporting, setExporting] = useState(false);

  const exportPoints = useCallback(async () => {
    setExporting(true);
    try {
      await downloadPoints(project.id, project.name);
    } catch {
      toast.error(t.settings.exportFailed);
    } finally {
      setExporting(false);
    }
  }, [project.id, project.name]);

  const openFilePicker = useCallback(() => inputRef.current?.click(), []);

  const onFilePicked = useCallback(async (file: File | undefined) => {
    if (file) {
      try {
        setIncoming(await readPointsDocument(file));
      } catch {
        toast.error(t.transfer.invalidFile);
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const clearIncoming = useCallback(() => setIncoming(null), []);

  return { inputRef, incoming, isExporting, exportPoints, openFilePicker, onFilePicked, clearIncoming };
}
