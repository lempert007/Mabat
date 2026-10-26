import { useEffect } from 'react';
import { useViewerStore } from '@/store/viewerStore';
import { useMissionStore } from '@/store/missionStore';

interface ViewerKeyboardHandlers {
  /** The arrow keys, by the side they point to. What that means depends on what is showing. */
  left: () => void;
  right: () => void;
  /** Space, when there is something to play. */
  togglePlay?: () => void;
  /** Enter, while the intro is up. */
  enter: () => void;
}

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable));
};

/** Space on a focused button presses that button; it should not also play or pause. */
const onButton = (target: EventTarget | null) => Boolean((target as HTMLElement | null)?.closest?.('button'));

/** A dialog is on top and owns the keyboard, including its own Escape. */
const dialogOpen = () => document.querySelector('[aria-modal="true"]') !== null;

export function useViewerKeyboard({ left, right, togglePlay, enter }: ViewerKeyboardHandlers) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target) || dialogOpen()) return;
      const state = useViewerStore.getState();
      const mission = useMissionStore.getState();
      switch (event.key) {
        case 'Escape':
          if (mission.placing !== null) {
            // Ends the placement only; the panel it was started from stays open.
            event.stopImmediatePropagation();
            mission.setPlacing(null);
          } else if (state.movingPoiId) state.setMovingPoi(null);
          else if (state.tourPlaying) state.setTourPlaying(false);
          else if (state.selectedPoiId) state.whenEditorClean(() => state.selectPoi(null));
          break;
        case 'ArrowRight':
          if (!state.introVisible) right();
          break;
        case 'ArrowLeft':
          if (!state.introVisible) left();
          break;
        case ' ':
          if (!state.introVisible && togglePlay && !onButton(event.target)) {
            event.preventDefault();
            togglePlay();
          }
          break;
        case 'Enter':
          if (state.introVisible) enter();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [left, right, togglePlay, enter]);
}
