import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useTheme } from '@/contexts/theme';

import { setSystemPrefersDark } from '../../utils/matchMedia';
import { renderWithProviders } from '../../utils/renderWithProviders';

function ThemeProbe() {
  const { preference, resolvedTheme } = useTheme();
  return <p>{`${preference}:${resolvedTheme}`}</p>;
}

const html = () => document.documentElement;

describe('ThemeProvider + ThemeToggle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('follows the operating system by default', () => {
    setSystemPrefersDark(true);

    renderWithProviders(<ThemeProbe />);

    expect(screen.getByText('system:dark')).toBeInTheDocument();
    expect(html()).toHaveClass('dark');
  });

  it('reacts live when the OS switches theme while preference is "system"', () => {
    renderWithProviders(<ThemeProbe />);
    expect(html()).not.toHaveClass('dark');

    act(() => {
      setSystemPrefersDark(true);
    });

    expect(screen.getByText('system:dark')).toBeInTheDocument();
    expect(html()).toHaveClass('dark');
  });

  it('applies and saves an explicit choice, ignoring the OS', async () => {
    setSystemPrefersDark(true);
    const { user } = renderWithProviders(
      <>
        <ThemeToggle />
        <ThemeProbe />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'Light' }));

    expect(screen.getByText('light:light')).toBeInTheDocument();
    expect(html()).not.toHaveClass('dark');
    expect(window.localStorage.getItem('tms.theme')).toBe('light');
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('restores the saved preference on the next visit', () => {
    window.localStorage.setItem('tms.theme', 'dark');

    renderWithProviders(<ThemeProbe />);

    expect(screen.getByText('dark:dark')).toBeInTheDocument();
  });

  it('useTheme outside the provider fails with a clear message', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // React logs the thrown error

    expect(() => render(<ThemeProbe />)).toThrow('useTheme must be used inside <ThemeProvider>.');
  });
});
