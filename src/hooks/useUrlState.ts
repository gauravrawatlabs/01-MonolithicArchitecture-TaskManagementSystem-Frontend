import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Several URL query parameters as one piece of React state (docs/02 §5: search, sort and filters live in
 * the URL, so links, refresh and Back keep them).
 *
 *   const [state, update] = useUrlState({ search: '', sort: 'Name', dir: 'Asc' });
 *   update({ sort: 'CreatedAt', dir: 'Desc' });   // ONE history update for both
 *
 * Why care about ORDER: React Router computes setSearchParams() from the URL as it was when the
 * component last RENDERED. Two updates before the next render (two keys in one click, or two quick
 * changes in a row) would overwrite each other and the first change would be lost. So every update
 * starts from the latest PENDING URL (kept in a ref until the router has rendered it).
 * Defaults are not written to the URL (short links), and updates REPLACE the history entry (typing a
 * search doesn't add a Back step per keystroke).
 */
export function useUrlState<TState extends Record<string, string>>(
  defaults: TState,
): [TState, (updates: Partial<TState>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  // The URL we asked for but the router hasn't rendered yet (null when nothing is pending).
  const pending = useRef<URLSearchParams | null>(null);
  useEffect(() => {
    pending.current = null; // the router has caught up
  }, [searchParams]);

  // Keys and defaults are expected to be stable; serialize to avoid recomputing on every render.
  const defaultsKey = JSON.stringify(defaults);
  const state = useMemo(() => {
    const parsedDefaults = JSON.parse(defaultsKey) as TState;
    return Object.fromEntries(
      Object.entries(parsedDefaults).map(([key, fallback]) => [
        key,
        searchParams.get(key) ?? fallback,
      ]),
    ) as TState;
  }, [searchParams, defaultsKey]);

  const update = useCallback(
    (updates: Partial<TState>) => {
      const parsedDefaults = JSON.parse(defaultsKey) as TState;
      const params = new URLSearchParams(pending.current ?? searchParams);
      for (const [key, value] of Object.entries(updates) as [string, string | undefined][]) {
        if (value === undefined || value === '' || value === parsedDefaults[key])
          params.delete(key);
        else params.set(key, value);
      }
      pending.current = params;
      setSearchParams(params, { replace: true });
    },
    [defaultsKey, searchParams, setSearchParams],
  );

  return [state, update];
}
