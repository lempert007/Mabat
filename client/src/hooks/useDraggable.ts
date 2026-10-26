import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';

interface Offset {
  x: number;
  y: number;
}

interface DragSession {
  pointerId: number;
  pointerX: number;
  pointerY: number;
  origin: Offset;
  min: Offset;
  max: Offset;
}

/** Offsets survive closing and reopening a panel for as long as the page is open. */
const remembered = new Map<string, Offset>();

/** Gap kept between a dragged element and the edge of the window. */
const EDGE_MARGIN = 8;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Makes an element draggable by a handle.
 *
 * The offset is written straight to the element's transform on each pointer move, so dragging
 * costs no React renders and does not depend on an animation library's frame loop. The element
 * must therefore be positioned with `left`/`top` and own no other transform.
 */
export function useDraggable(storageKey: string) {
  const elementRef = useRef<HTMLElement | null>(null);
  const offset = useRef<Offset>(remembered.get(storageKey) ?? { x: 0, y: 0 });
  const session = useRef<DragSession | null>(null);

  const apply = useCallback(() => {
    const element = elementRef.current;
    if (element) {
      element.style.transform = `translate3d(${offset.current.x}px, ${offset.current.y}px, 0)`;
    }
  }, []);

  /** Offset range that keeps the element inside the window, given where it sits right now. */
  const boundsFor = useCallback((element: HTMLElement): { min: Offset; max: Offset } => {
    const rect = element.getBoundingClientRect();
    const baseX = rect.left - offset.current.x;
    const baseY = rect.top - offset.current.y;
    return {
      min: { x: EDGE_MARGIN - baseX, y: EDGE_MARGIN - baseY },
      max: {
        x: window.innerWidth - rect.width - EDGE_MARGIN - baseX,
        y: window.innerHeight - rect.height - EDGE_MARGIN - baseY,
      },
    };
  }, []);

  const clampIntoView = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;
    const { min, max } = boundsFor(element);
    offset.current = {
      x: clamp(offset.current.x, min.x, Math.max(min.x, max.x)),
      y: clamp(offset.current.y, min.y, Math.max(min.y, max.y)),
    };
    apply();
  }, [apply, boundsFor]);

  const setElement = useCallback(
    (element: HTMLElement | null) => {
      elementRef.current = element;
      if (element) clampIntoView();
    },
    [clampIntoView],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      const active = session.current;
      if (!active || event.pointerId !== active.pointerId) return;
      offset.current = {
        x: clamp(active.origin.x + event.clientX - active.pointerX, active.min.x, Math.max(active.min.x, active.max.x)),
        y: clamp(active.origin.y + event.clientY - active.pointerY, active.min.y, Math.max(active.min.y, active.max.y)),
      };
      apply();
    },
    [apply],
  );

  const endDrag = useCallback(() => {
    if (!session.current) return;
    session.current = null;
    remembered.set(storageKey, { ...offset.current });
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
  }, [onPointerMove, storageKey]);

  const onHandlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const element = elementRef.current;
      if (!element || event.button !== 0) return;
      // Let buttons inside the handle (such as close) behave normally.
      if ((event.target as HTMLElement).closest('button')) return;
      event.preventDefault();
      const { min, max } = boundsFor(element);
      session.current = {
        pointerId: event.pointerId,
        pointerX: event.clientX,
        pointerY: event.clientY,
        origin: { ...offset.current },
        min,
        max,
      };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
    },
    [boundsFor, endDrag, onPointerMove],
  );

  useEffect(() => {
    window.addEventListener('resize', clampIntoView);
    return () => {
      window.removeEventListener('resize', clampIntoView);
      endDrag();
    };
  }, [clampIntoView, endDrag]);

  return { setElement, onHandlePointerDown };
}
