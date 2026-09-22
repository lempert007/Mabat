import { useCallback, useMemo, useState } from 'react';
import { MapPinPlus, Pencil, Trash2 } from 'lucide-react';
import type { ContextMenuAnchor, ContextMenuItem } from '@/components/ui/ContextMenu';
import type { Poi, Vec3 } from '@/types/api';
import { t } from '@/i18n/he';

/** What the editor right-clicked: an existing point, or a spot on the model. */
type Target = { kind: 'poi'; poi: Poi } | { kind: 'surface'; position: Vec3; normal: Vec3 };

interface Actions {
  addPointAt: (position: Vec3, normal: Vec3) => void;
  editPoint: (poi: Poi) => void;
}

/**
 * The right-click menu in the viewer: what it offers on a marker, what it offers on the model,
 * and the point it is waiting to have confirmed for deletion.
 *
 * Deleting is confirmed by the caller, which owns the dialog; this only decides what was asked
 * for and remembers which point it was.
 */
export function usePointContextMenu({ addPointAt, editPoint }: Actions) {
  const [anchor, setAnchor] = useState<ContextMenuAnchor | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Poi | null>(null);

  const close = useCallback(() => {
    setAnchor(null);
    setTarget(null);
  }, []);

  const openForMarker = useCallback((poi: Poi, at: ContextMenuAnchor) => {
    setTarget({ kind: 'poi', poi });
    setAnchor(at);
  }, []);

  const openForSurface = useCallback((position: Vec3, normal: Vec3, at: ContextMenuAnchor) => {
    setTarget({ kind: 'surface', position, normal });
    setAnchor(at);
  }, []);

  const items = useMemo((): ContextMenuItem[] => {
    if (!target) return [];
    if (target.kind === 'poi') {
      return [
        {
          id: 'edit',
          label: t.panel.editPoint,
          icon: <Pencil size={15} />,
          onSelect: () => editPoint(target.poi),
        },
        {
          id: 'delete',
          label: t.panel.deletePoint,
          icon: <Trash2 size={15} />,
          tone: 'danger',
          onSelect: () => setPendingDelete(target.poi),
        },
      ];
    }
    return [
      {
        id: 'add',
        label: t.viewer.addPointHere,
        icon: <MapPinPlus size={15} />,
        onSelect: () => addPointAt(target.position, target.normal),
      },
    ];
  }, [target, editPoint, addPointAt]);

  return {
    anchor,
    items,
    close,
    openForMarker,
    openForSurface,
    pendingDelete,
    clearPendingDelete: () => setPendingDelete(null),
  };
}
