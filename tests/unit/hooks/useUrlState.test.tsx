import { act, renderHook } from '@testing-library/react';
import { type ReactNode, useState } from 'react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useUrlState } from '@/hooks/useUrlState';

const DEFAULTS = { status: '', priority: '', sort: 'DueDate' };

/** A memory router created ONCE per test, rendering whatever the hook's wrapper passes in. */
function Router({ initialUrl, children }: { initialUrl: string; children: ReactNode }) {
  const [router] = useState(() =>
    createMemoryRouter([{ path: '*', element: children }], { initialEntries: [initialUrl] }),
  );
  return <RouterProvider router={router} />;
}

/** Renders the hook inside a real (memory) router and exposes the current URL. */
function renderUrlState(initialUrl = '/tasks') {
  return renderHook(
    () => {
      const [state, update] = useUrlState(DEFAULTS);
      const location = useLocation();
      return { state, update, url: `${location.pathname}${location.search}` };
    },
    { wrapper: ({ children }) => <Router initialUrl={initialUrl}>{children}</Router> },
  );
}

describe('useUrlState', () => {
  it('reads values from the URL, with defaults for missing keys', () => {
    const { result } = renderUrlState('/tasks?status=Done');
    expect(result.current.state).toEqual({ status: 'Done', priority: '', sort: 'DueDate' });
  });

  it('updates several keys at once and leaves defaults out of the URL', () => {
    const { result } = renderUrlState('/tasks?sort=Title');
    act(() => {
      result.current.update({ status: 'Todo', sort: 'DueDate' });
    });
    expect(result.current.url).toBe('/tasks?status=Todo');
  });

  it('keeps BOTH of two updates made before the next render (fast successive changes)', () => {
    const { result } = renderUrlState();
    act(() => {
      result.current.update({ status: 'InReview' });
      result.current.update({ priority: 'Critical' }); // same render: must not overwrite the first
    });
    expect(result.current.url).toBe('/tasks?status=InReview&priority=Critical');
    expect(result.current.state).toMatchObject({ status: 'InReview', priority: 'Critical' });
  });
});
