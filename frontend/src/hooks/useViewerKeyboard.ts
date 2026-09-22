import { useEffect } from 'react';
import { useViewerStore } from '@/store/viewerStore';

interface ViewerKeyboardHandlers {
  next: () => void;
  prev: () => void;
}

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable));
};

export function useViewerKeyboard({ next, prev }: ViewerKeyboardHandlers) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      const state = useViewerStore.getState();
      switch (event.key) {
        case 'Escape':
          if (state.movingPoiId) state.setMovingPoi(null);
          else if (state.tourPlaying) state.setTourPlaying(false);
          else if (state.selectedPoiId) state.selectPoi(null);
          break;
        // The interface reads right to left, so the right arrow steps backwards.
        case 'ArrowRight':
          if (!state.introVisible) prev();
          break;
        case 'ArrowLeft':
          if (!state.introVisible) next();
          break;
        case 'Enter':
          if (state.introVisible) state.dismissIntro();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);
}
