import { useEffect } from 'react';
import { useMissionStore } from '@/store/missionStore';
import { editActor, editKey, facingAt, removeKey, wrapDegrees } from '@/lib/mission/keys';
import type { MissionChange } from './useMissionSettings';
import type { MissionPlan } from '@/lib/mission/types';
import type { Actor } from '@/types/api';

interface MissionShortcuts {
  open: boolean;
  plan: MissionPlan | null;
  update: (change: MissionChange) => void;
  undo: () => void;
  redo: () => void;
}

/** A focused field or a dialog keeps its keys to itself. */
const busy = (event: KeyboardEvent) => {
  const el = event.target as HTMLElement | null;
  return Boolean(
    el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable || el.getAttribute('role') === 'slider'),
  ) || document.querySelector('[aria-modal="true"]') !== null;
};

/** How far `[` and `]` turn a keyframe, degrees. */
const TURN = 15;

/**
 * The keys that work while the mission panel is open: undo and redo (Ctrl+Z, Ctrl+Shift+Z or
 * Ctrl+Y), and for the selected keyframe, `[` and `]` to turn it and Delete to remove it.
 */
export function useMissionShortcuts({ open, plan, update, undo, redo }: MissionShortcuts) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (busy(event)) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (mod && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === 'y') {
        event.preventDefault();
        redo();
        return;
      }

      const { selected, placing } = useMissionStore.getState();
      if (!plan || !selected || selected.key === null || placing !== null) return;
      const index = plan.cast.findIndex((member) => member.actor.id === selected.actor);
      if (index === -1 || !plan.cast[index].actor.keys[selected.key]) return;
      const keyIndex = selected.key;
      const change = (edit: (actor: Actor) => Actor) => update(editActor(selected.actor, edit));

      if (event.key === '[' || event.key === ']') {
        event.preventDefault();
        const heading = wrapDegrees(facingAt(plan, index, keyIndex) + (event.key === ']' ? TURN : -TURN));
        change((actor) => editKey(actor, keyIndex, { heading }));
      } else if (event.key === 'Delete') {
        event.preventDefault();
        useMissionStore.getState().select({ actor: selected.actor, key: null });
        change((actor) => removeKey(actor, keyIndex));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, plan, update, undo, redo]);
}
