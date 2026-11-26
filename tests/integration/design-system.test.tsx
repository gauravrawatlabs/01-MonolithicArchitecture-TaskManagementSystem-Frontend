import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DesignSystemPage } from '@/features/design-system/pages/DesignSystemPage';

import { renderWithProviders } from '../utils/renderWithProviders';

/** Integration: the design system page with the real providers (theme, toasts). */
describe('Design system showcase', () => {
  it('renders the page heading and every component section', () => {
    renderWithProviders(<DesignSystemPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Component library' }),
    ).toBeInTheDocument();
    for (const section of ['Colours', 'Buttons', 'Forms', 'Data table and pagination']) {
      expect(screen.getByRole('heading', { level: 2, name: section })).toBeInTheDocument();
    }
  });

  it('switches to dark mode from the theme toggle', async () => {
    const { user } = renderWithProviders(<DesignSystemPage />);

    const themeGroup = screen.getAllByRole('group', { name: 'Theme' })[0];
    if (!themeGroup) throw new Error('Theme toggle not found');
    await user.click(within(themeGroup).getByRole('button', { name: 'Dark' }));

    expect(document.documentElement).toHaveClass('dark');
  });

  it('sorts and pages the sample table together', async () => {
    const { user } = renderWithProviders(<DesignSystemPage />);
    const table = screen.getByRole('table', { name: 'Sample tasks' });

    await user.click(within(table).getByRole('button', { name: 'Title' }));
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Sample task 1');

    await user.click(within(table).getByRole('button', { name: 'Title' }));
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Sample task 23');

    await user.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(screen.getByText('Showing 21–23 of 23 tasks')).toBeInTheDocument();
  });

  it('shows a toast from a button click', async () => {
    const { user } = renderWithProviders(<DesignSystemPage />);

    await user.click(screen.getByRole('button', { name: 'Success toast' }));

    expect(await screen.findByText('Task created')).toBeInTheDocument();
  });

  it('contains a crashing widget inside its error boundary', async () => {
    const { user } = renderWithProviders(<DesignSystemPage />);

    const originalError = console.error;
    console.error = () => undefined;
    await user.click(screen.getByRole('button', { name: 'Crash this widget' }));
    console.error = originalError;

    // The page has other alerts (danger banner, sample error state), so look for this one by text.
    expect(screen.getByText('This widget crashed')).toBeInTheDocument();
    expect(screen.getByText('Only this card is affected.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Component library' }),
    ).toBeInTheDocument();
  });
});
