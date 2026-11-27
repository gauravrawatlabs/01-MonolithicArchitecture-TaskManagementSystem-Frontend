import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('changes only after the value has stopped changing for the delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'w' },
    });

    rerender({ value: 'we' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: 'web' }); // typing again restarts the wait
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('w');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('web');
  });
});
