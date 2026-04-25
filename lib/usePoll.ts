"use client";

import { useEffect, useRef } from "react";

/**
 * Run `fn` immediately on mount and then every `ms` milliseconds. Clears on unmount.
 * The callback stays fresh via a ref so it can close over state without resetting
 * the timer.
 */
export function usePoll(fn: () => void | Promise<void>, ms = 5000): void {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  }, [fn]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        await ref.current();
      } catch {
        // swallow — next tick will retry
      }
    };
    void tick();
    const id = setInterval(tick, ms);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [ms]);
}
