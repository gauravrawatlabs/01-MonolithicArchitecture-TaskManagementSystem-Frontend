import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/App';

describe('App', () => {
  it('sends a signed-out visitor from "/" to the sign-in page', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome back' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });
});
