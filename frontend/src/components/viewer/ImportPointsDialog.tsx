import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { useImportPoints } from '@/api/transfer';
import { errorMessage } from '@/lib/errorMessage';
import { toast } from '@/store/toastStore';
import { counted } from '@/lib/counted';
import { fill } from '@/lib/interpolate';
import type { ImportMode, PointsDocument } from '@/types/api';
import { t } from '@/i18n/he';

interface ImportPointsDialogProps {
  projectId: string;
  /** The parsed file, or null when the dialog is closed. */
  document: PointsDocument | null;
  existingPointCount: number;
  onClose: () => void;
}

export function ImportPointsDialog({
  projectId,
  document,
  existingPointCount,
  onClose,
}: ImportPointsDialogProps) {
  const [mode, setMode] = useState<ImportMode>('append');
  const importPoints = useImportPoints(projectId);

  const run = () => {
    if (!document) return;
    importPoints.mutate(
      { document, mode },
      {
        onSuccess: (result) => {
          const points = counted(
            result.pointsCreated,
            t.transfer.onePoint,
            t.transfer.manyPoints,
          );
          const files = counted(
            result.attachmentsCopied,
            t.transfer.oneFile,
            t.transfer.manyFiles,
          );
          toast.success(
            result.attachmentsCopied > 0
              ? fill(t.transfer.doneWithFiles, { points, files })
              : fill(t.transfer.done, { points }),
          );

          if (result.attachmentsMissing > 0) {
            toast.show(
              counted(result.attachmentsMissing, t.transfer.missingFile, t.transfer.missingFiles),
            );
          }
          onClose();
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };

  return (
    <Dialog
      open={document !== null}
      onClose={onClose}
      title={t.transfer.title}
      description={t.transfer.afterHint}
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={importPoints.isPending}>
            {t.common.cancel}
          </Button>
          <Button
            variant="primary"
            icon={<Download size={15} />}
            loading={importPoints.isPending}
            onClick={run}
          >
            {t.transfer.confirm}
          </Button>
        </>
      }
    >
      {document && (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-line bg-white/3 px-3.5 py-3">
            {document.sourceProjectName && (
              <p className="text-[13px] text-fg-3">
                {t.transfer.from} <span className="font-medium text-fg">{document.sourceProjectName}</span>
              </p>
            )}
            <p className="mt-1 text-[13px] text-fg-2">
              {fill(t.transfer.summary, {
                points: counted(
                  document.points.length,
                  t.transfer.onePoint,
                  t.transfer.manyPoints,
                ),
                categories: counted(
                  document.categories.length,
                  t.transfer.oneCategory,
                  t.transfer.manyCategories,
                ),
              })}
            </p>
          </div>

          <Field label={t.transfer.mode}>
            <Segmented<ImportMode>
              size="sm"
              value={mode}
              options={[
                { value: 'append', label: t.transfer.append },
                { value: 'replace', label: t.transfer.replace },
              ]}
              onChange={setMode}
            />
          </Field>

          {mode === 'replace' && existingPointCount > 0 && (
            <p className="text-[13px] text-danger">
              {fill(t.transfer.replaceWarning, { count: existingPointCount })}
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
