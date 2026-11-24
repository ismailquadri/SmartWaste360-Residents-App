import { useCallback, useEffect, useRef, useState } from "react";

export const MEDIA_UNDO_MS = 10_000;
export type RemovedMedia<T> = { item: T; index: number };

/** Keep deleted blobs usable until undo expires; never revoke them on deletion. */
export function useMediaUndo<T>(release: (item: T) => void) {
  const [pending, setPending] = useState<RemovedMedia<T>[]>([]);
  const pendingRef = useRef(pending);
  const releaseRef = useRef(release);
  releaseRef.current = release;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pendingRef.current.forEach(({ item }) => releaseRef.current(item));
    pendingRef.current = [];
    setPending([]);
  }, []);
  const remove = (item: T, index = 0) => {
    if (timer.current) clearTimeout(timer.current);
    pendingRef.current = [...pendingRef.current, { item, index }];
    setPending(pendingRef.current);
    timer.current = setTimeout(clear, MEDIA_UNDO_MS);
  };
  const restore = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const restored = pendingRef.current;
    pendingRef.current = [];
    setPending([]);
    return restored;
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    pendingRef.current.forEach(({ item }) => releaseRef.current(item));
  }, []);
  return { pending, remove, restore, clear };
}

export function restoreMedia<T>(current: T[], removed: RemovedMedia<T>[]): T[] {
  const next = [...current];
  [...removed].reverse().forEach(({ item, index }) => next.splice(index, 0, item));
  return next;
}