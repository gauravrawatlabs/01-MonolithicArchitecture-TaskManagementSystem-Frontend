import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCountdown } from '@/hooks/useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is idle (0) until started', () => {
    const { result } = renderHook(() => useCountdown(60));
    expect(result.current.remaining).toBe(0);
  });

  it('counts down in whole seconds and ends at 0', () => {
    const { result } = renderHook(() => useCountdown(3));

    act(() => {
      result.current.start();
    });
    expect(result.current.remaining).toBe(3);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.remaining).toBe(2);

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.remaining).toBe(0);
  });

  it('can be restarted', () => {
    const { result } = renderHook(() => useCountdown(5));
    act(() => {
      result.current.start();
    });
    // Separate act(): the interval is scheduled by an effect that runs after start() re-renders.
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.remaining).toBe(1);

    act(() => {
      result.current.start();
    });
    expect(result.current.remaining).toBe(5);
  });

  it('can start immediately, so the first render is already counting down', () => {
    const { result } = renderHook(() => useCountdown(60, { startImmediately: true }));

    expect(result.current.remaining).toBe(60);
  });
});
