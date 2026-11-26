import { useCallback, useEffect, useState } from 'react';

/**
 * A seconds countdown, e.g. "Resend email (42 s)". `start()` begins it; `remaining` is 0 when idle.
 * Based on an end timestamp rather than counting ticks, so a throttled background tab stays accurate.
 *
 * `startImmediately` starts it in the INITIAL state, so the very first render already counts down.
 * (Starting it from a useEffect leaves one render where a "disabled until…" button is enabled.)
 */
export function useCountdown(
  seconds: number,
  { startImmediately = false }: { startImmediately?: boolean } = {},
): { remaining: number; start: () => void } {
  const [now, setNow] = useState(() => Date.now());
  const [endsAt, setEndsAt] = useState<number | null>(() =>
    startImmediately ? Date.now() + seconds * 1000 : null,
  );

  useEffect(() => {
    if (endsAt === null) return undefined;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt) {
        setEndsAt(null);
      }
    }, 250);
    return () => {
      window.clearInterval(timer);
    };
  }, [endsAt]);

  const start = useCallback(() => {
    const current = Date.now();
    setNow(current);
    setEndsAt(current + seconds * 1000);
  }, [seconds]);

  const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
  return { remaining, start };
}
