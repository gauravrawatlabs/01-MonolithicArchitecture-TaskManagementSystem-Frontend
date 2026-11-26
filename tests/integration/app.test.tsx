import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/App';

describe('App (setup smoke test)', () => {
  it('renders the application name and the configured API URL from .env.test', () => {
    // Arrange + Act
    render(<App />);

    // Assert: what the user sees, found by accessible role and text
    expect(
      screen.getByRole('heading', { level: 1, name: 'Task Management System' }),
    ).toBeInTheDocument();
    expect(screen.getByText('http://localhost:5075')).toBeInTheDocument();
  });
});
