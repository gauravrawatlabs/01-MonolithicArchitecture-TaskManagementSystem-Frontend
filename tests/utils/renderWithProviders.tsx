import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { type ReactElement } from 'react';

import { AppProviders } from '@/app/providers/AppProviders';

/**
 * Renders a component inside the real app providers (theme, toasts; router/query/auth from later
 * phases) and returns a user-event instance, so tests interact the way a user does.
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult & { user: UserEvent } {
  const user = userEvent.setup();
  return { user, ...render(ui, { wrapper: AppProviders, ...options }) };
}
