import { useCallback, useEffect, useRef } from 'react';

/**
 * Delays a call until the caller stops firing it. Any pending call is flushed on unmount so a
 * last change is never dropped.
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delayMs: number,
): (...args: A) => void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const timer = useRef<number | null>(null);
  const pending = useRef<A | null>(null);

  const flush = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current) {
      const args = pending.current;
      pending.current = null;
      callbackRef.current(...args);
    }
  }, []);

  useEffect(() => flush, [flush]);

  return useCallback(
    (...args: A) => {
      pending.current = args;
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, delayMs);
    },
    [delayMs, flush],
  );
}
