import { screen } from '@testing-library/react';
import { type UserEvent } from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { getAccessToken, setSession } from '@/services/tokenStorage';

import { problem } from '../../mocks/api';
import { captureRequests } from '../../mocks/capture';
import { buildAuthResponse } from '../../mocks/factories/auth';
import { buildUser } from '../../mocks/factories/users';
import { currentUrl, renderRoute } from '../../utils/renderRoute';

async function fill(user: UserEvent, current: string, next: string, confirm = next) {
  await user.type(await screen.findByLabelText('Current password'), current);
  await user.type(screen.getByLabelText('New password'), next);
  await user.type(screen.getByLabelText('Confirm new password'), confirm);
  await user.click(screen.getByRole('button', { name: 'Change password' }));
}

function renderSignedIn() {
  const signedInUser = buildUser();
  setSession(buildAuthResponse(signedInUser, { accessToken: 'jwt-change' }));
  return renderRoute('/settings/security', { user: signedInUser });
}

describe('Change password (Settings › Security)', () => {
  it('changes the password with the Bearer token, signs out everywhere and explains why', async () => {
    const calls = captureRequests(
      'post',
      '/api/account/change-password',
      () => new HttpResponse(null, { status: 204 }),
    );
    const { user, router } = renderSignedIn();

    await fill(user, 'Old!Pass1', 'N3w!Password');

    expect(
      await screen.findByText(/Your password was changed and you were signed out everywhere/),
    ).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/login');
    expect(calls[0]).toEqual({
      body: { currentPassword: 'Old!Pass1', newPassword: 'N3w!Password' },
      authorization: 'Bearer jwt-change',
    });
    expect(getAccessToken()).toBeNull();
  });

  it('shows a wrong current password (400 currentPassword) under that field', async () => {
    captureRequests('post', '/api/account/change-password', () =>
      problem(400, { errors: { currentPassword: ['The current password is incorrect.'] } }),
    );
    const { user, router } = renderSignedIn();

    await fill(user, 'Wrong!Pass1', 'N3w!Password');

    expect(await screen.findByText('The current password is incorrect.')).toBeInTheDocument();
    expect(screen.getByLabelText('Current password')).toHaveFocus();
    expect(currentUrl(router)).toBe('/settings/security');
    expect(getAccessToken()).toBe('jwt-change');
  });

  it('rejects reusing the current password before calling the API', async () => {
    const calls = captureRequests(
      'post',
      '/api/account/change-password',
      () => new HttpResponse(null, { status: 204 }),
    );
    const { user } = renderSignedIn();

    await fill(user, 'Same!Pass1', 'Same!Pass1');

    expect(
      await screen.findByText('New password must be different from the current password.'),
    ).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });
});
