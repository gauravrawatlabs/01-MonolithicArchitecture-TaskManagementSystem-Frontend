import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Several URL query parameters as one piece of React state (docs/02 §5: search, sort and filters live in
 * the URL, so links, refresh and Back keep them).
 *
 *   const [state, update] = useUrlState({ search: '', sort: 'Name', dir: 'Asc' });
 *   update({ sort: 'CreatedAt', dir: 'Desc' });   // ONE history update for both
 *
 * Why one updater for many keys: React Router computes each setSearchParams() from the URL as it was
 * when the component RENDERED. Two separate calls in one event therefore overwrite each other and the
 * first change is lost. Defaults are not written to the URL (short links), and updates REPLACE the
 * history entry (typing a search doesn't add a Back step per keystroke).
 */
export function useUrlState<TState extends Record<string, string>>(
  defaults: TState,
): [TState, (updates: Partial<TState>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

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
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          for (const [key, value] of Object.entries(updates) as [string, string | undefined][]) {
            if (value === undefined || value === '' || value === parsedDefaults[key])
              params.delete(key);
            else params.set(key, value);
          }
          return params;
        },
        { replace: true },
      );
    },
    [defaultsKey, setSearchParams],
  );

  return [state, update];
}
