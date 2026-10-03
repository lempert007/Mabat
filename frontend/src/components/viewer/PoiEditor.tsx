import { useEffect, useMemo, useState } from 'react';
import { Camera, Check, Eye, Move3d, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { Badge } from '@/components/ui/Badge';
import { BlockEditorList } from '@/components/blocks/BlockEditorList';
import { useDeletePoi, useUpdatePoi } from '@/api/pois';
import { useViewerStore } from '@/store/viewerStore';
import { deepEqual } from '@/lib/deepEqual';
import { errorMessage } from '@/lib/errorMessage';
import { toast } from '@/store/toastStore';
import type { Block, CameraPose, Category, Poi } from '@/types/api';
import { t } from '@/i18n/he';

interface PoiEditorProps {
  poi: Poi;
  categories: Category[];
  onDone: () => void;
  onDeleted: () => void;
}

/** Identifiers are assigned by the server, so they are shown but never edited here. */
interface Draft {
  title: string;
  summary: string;
  categoryId: string;
  camera: CameraPose | null;
  blocks: Block[];
}

const draftFrom = (poi: Poi): Draft => ({
  title: poi.title,
  summary: poi.summary,
  categoryId: poi.categoryId ?? '',
  camera: poi.camera,
  blocks: poi.blocks,
});

export function PoiEditor({ poi, categories, onDone, onDeleted }: PoiEditorProps) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(poi));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = useUpdatePoi(poi.projectId);
  const remove = useDeletePoi(poi.projectId);
  const cameraApi = useViewerStore((s) => s.cameraApi);
  const setMovingPoi = useViewerStore((s) => s.setMovingPoi);
  const movingPoiId = useViewerStore((s) => s.movingPoiId);
  const setEditorDirty = useViewerStore((s) => s.setEditorDirty);
  const whenEditorClean = useViewerStore((s) => s.whenEditorClean);

  useEffect(() => {
    setDraft(draftFrom(poi));
  }, [poi.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (partial: Partial<Draft>) => setDraft((current) => ({ ...current, ...partial }));

  // Everything in here is a draft until it is saved, so the editor has to say so plainly.
  const saved = useMemo(() => draftFrom(poi), [poi]);
  const dirty = !deepEqual(draft, saved);
  const cameraChanged = !deepEqual(draft.camera, saved.camera);

  // Anything that would take the editor away asks first while there is something to lose.
  useEffect(() => {
    setEditorDirty(dirty);
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, setEditorDirty]);
  useEffect(() => () => setEditorDirty(false), [setEditorDirty]);

  const close = () => whenEditorClean(onDone);

  const save = () => {
    update.mutate(
      {
        id: poi.id,
        data: {
          title: draft.title.trim() || t.common.untitled,
          summary: draft.summary,
          categoryId: draft.categoryId || undefined,
          clearCategory: !draft.categoryId,
          camera: draft.camera ?? undefined,
          clearCamera: draft.camera === null,
          blocks: draft.blocks,
        },
      },
      { onSuccess: onDone, onError: (error) => toast.error(errorMessage(error)) },
    );
  };

  const moving = movingPoiId === poi.id;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 hairline-b">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-[15px] font-semibold tracking-title">{t.panel.editPoint}</h2>
          <bdi className="text-[12px] tabular-nums text-fg-4">{poi.identifier}</bdi>
        </div>
        <div className="flex items-center gap-1">
          <IconButton label={t.panel.deletePoint} size="sm" tone="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} />
          </IconButton>
          <IconButton label={t.common.close} size="sm" onClick={close}>
            <X size={16} />
          </IconButton>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        <Field label={t.panel.title}>
          <Input value={draft.title} onChange={(event) => patch({ title: event.target.value })} autoFocus />
        </Field>
        <Field label={t.panel.category}>
          <Select value={draft.categoryId} onChange={(event) => patch({ categoryId: event.target.value })}>
            <option value="">{t.common.none}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.panel.summary}>
          <TextArea
            rows={2}
            value={draft.summary}
            placeholder={t.panel.summaryPlaceholder}
            onChange={(event) => patch({ summary: event.target.value })}
          />
        </Field>

        <Field
          label={t.panel.cameraView}
          trailing={
            <Badge tone={cameraChanged ? 'accent' : draft.camera ? 'success' : 'neutral'}>
              {cameraChanged
                ? t.panel.cameraChanged
                : draft.camera
                  ? t.panel.cameraSet
                  : t.panel.cameraUnset}
            </Badge>
          }
        >
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={<Camera size={14} />} onClick={() => cameraApi && patch({ camera: cameraApi.getPose() })}>
              {t.panel.useCurrentView}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<Eye size={14} />}
              disabled={!draft.camera}
              onClick={() => draft.camera && cameraApi?.flyTo(draft.camera)}
            >
              {t.panel.previewView}
            </Button>
            <Button
              size="sm"
              variant={moving ? 'primary' : 'ghost'}
              icon={<Move3d size={14} />}
              onClick={() => setMovingPoi(moving ? null : poi.id)}
            >
              {moving ? t.viewer.cancelPlacing : t.viewer.movePoint}
            </Button>
          </div>
          {moving && <p className="text-[12px] text-accent-strong">{t.viewer.movingPoint}</p>}
        </Field>

        <Field label={t.panel.content}>
          <BlockEditorList blocks={draft.blocks} projectId={poi.projectId} poiId={poi.id} onChange={(update) => setDraft((current) => ({ ...current, blocks: update(current.blocks) }))} />
        </Field>
      </div>

      <footer className="flex items-center gap-3 px-4 py-3 hairline-t bg-white/3">
        <span className="flex flex-1 items-center gap-1.5 text-[12px] text-accent-strong">
          {dirty && (
            <>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {t.common.unsaved}
            </>
          )}
        </span>
        <Button variant="ghost" onClick={close}>
          {t.common.cancel}
        </Button>
        <Button
          variant="primary"
          icon={<Check size={15} />}
          loading={update.isPending}
          disabled={!dirty}
          onClick={save}
        >
          {t.common.save}
        </Button>
      </footer>

      <ConfirmDialog
        open={confirmDelete}
        title={t.panel.deletePoint}
        body={t.panel.deletePointBody}
        loading={remove.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(poi.id, {
            onSuccess: () => {
              setConfirmDelete(false);
              onDeleted();
            },
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      />
    </div>
  );
}
