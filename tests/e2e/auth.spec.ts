import { expect, test } from '@playwright/test';

import { expectNoAccessibilityViolations } from './support/accessibility';
import { fakeApi } from './support/fakeApi';

test.describe('Authentication pages', () => {
  test('login: browser-side validation, then one generic message for wrong credentials', async ({
    page,
  }) => {
    await fakeApi(page, '/api/auth/login', 401, {
      title: 'Unauthorized',
      status: 401,
      detail: 'Invalid email or password.',
    });
    await page.goto('/login');

    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Email is required.')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeFocused();

    await page.getByLabel('Email').fill('jane@example.com');
    await page.getByLabel('Password', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toContainText('Invalid email or password.');
  });

  test('register: live password checklist and "email already exists" on the email field', async ({
    page,
  }) => {
    await fakeApi(page, '/api/auth/register', 409, {
      title: 'Conflict',
      status: 409,
      detail: 'An account with this email address already exists.',
    });
    await page.goto('/register');

    const upper = page.getByText(/An upper-case letter/);
    await expect(upper).toContainText('(not met)');
    await page.getByLabel('Password', { exact: true }).fill('A');
    await expect(upper).toContainText('(met)');

    await page.getByLabel('First name').fill('Jane');
    await page.getByLabel('Last name').fill('Doe');
    await page.getByLabel('Email').fill('jane@example.com');
    await page.getByLabel('Password', { exact: true }).fill('Str0ng!Pass');
    await page.getByLabel('Confirm password').fill('Str0ng!Pass');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(
      page.getByText('An account with this email address already exists.'),
    ).toBeVisible();
    await expect(page.getByLabel('Email')).toBeFocused();
  });

  test('password field can be revealed with the keyboard', async ({ page }) => {
    await page.goto('/login');
    const password = page.getByLabel('Password', { exact: true });
    await password.fill('Secret1!');

    await password.press('Tab'); // focus moves to the show/hide button
    await page.keyboard.press('Enter');

    await expect(password).toHaveAttribute('type', 'text');
  });
});

test.describe('Accessibility of the authentication pages', () => {
  test('login with errors visible', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Email is required.')).toBeVisible();

    await expectNoAccessibilityViolations(page);
  });

  test('register with errors visible', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('First name is required.')).toBeVisible();

    await expectNoAccessibilityViolations(page);
  });

  for (const [name, path, heading] of [
    ['forgot password', '/forgot-password', 'Forgot your password?'],
    [
      'reset password',
      '/reset-password?email=jane%40example.com&token=abc',
      'Choose a new password',
    ],
    ['reset password, incomplete link', '/reset-password', "This reset link can't be used"],
    ['check your email', '/register/success', 'Check your email'],
    ['confirm email, incomplete link', '/confirm-email', 'This confirmation link is incomplete'],
  ] as const) {
    test(name, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();

      await expectNoAccessibilityViolations(page);
    });
  }
});
