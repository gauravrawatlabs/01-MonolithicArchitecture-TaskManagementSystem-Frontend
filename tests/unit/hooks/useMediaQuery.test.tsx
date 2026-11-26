import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DESKTOP_QUERY, TABLET_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';

import { setViewportWidth } from '../../utils/matchMedia';

describe('useMediaQuery', () => {
  it('returns the current answer and updates when the viewport changes', () => {
    setViewportWidth(1280);
    const { result } = renderHook(() => useMediaQuery(DESKTOP_QUERY));
    expect(result.current).toBe(true);

    act(() => {
      setViewportWidth(800);
    });

    expect(result.current).toBe(false);
  });

  it('evaluates different breakpoints independently', () => {
    setViewportWidth(800);

    expect(renderHook(() => useMediaQuery(TABLET_QUERY)).result.current).toBe(true);
    expect(renderHook(() => useMediaQuery(DESKTOP_QUERY)).result.current).toBe(false);
  });
});
