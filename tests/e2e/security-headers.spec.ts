import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { FAKE_USERS, fakeEmptyWorkspace, signInWithFakeApi } from './support/fakeApi';
import { fakeTaskWorld } from './support/fakeTasks';
import { fakeUsers } from './support/fakeUsers';

/**
 * The recommended security headers (deploy/security-headers.json) must not break the app: every page is served
 * with that Content-Security-Policy, and any violation the browser reports fails the test. The policy's script
 * hash must match the inline theme script in index.html (editing one without the other fails here).
 */
const root = path.resolve(import.meta.dirname, '../..');
const headers = JSON.parse(
  readFileSync(path.join(root, 'deploy/security-headers.json'), 'utf8'),
) as Record<string, string>;
const csp = (headers['Content-Security-Policy'] ?? '').replace(
  '{API_ORIGIN}',
  'http://localhost:5075',
);

test('the CSP allows exactly the inline theme script in index.html', () => {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => m[1] ?? '',
  );
  expect(inline).toHaveLength(1);
  const hash = `'sha256-${createHash('sha256')
    .update(inline[0] ?? '')
    .digest('base64')}'`;
  expect(csp).toContain(hash);
});

test('every page works under the recommended Content-Security-Policy', async ({ page }) => {
  test.slow();
  const violations: string[] = [];
  await page.route(
    (url) => url.port === '4173' && !/\.[a-z0-9]+$/i.test(url.pathname), // HTML documents (SPA routes)
    async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: { ...response.headers(), 'content-security-policy': csp },
      });
    },
  );
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      const store = window as unknown as { __csp?: string[] };
      const what = `${e.violatedDirective} blocked ${e.blockedURI || '(inline)'}`;
      store.__csp = [...(store.__csp ?? []), what];
    });
  });
  page.on('console', (m) => {
    if (m.text().includes('Content Security Policy')) violations.push(m.text().slice(0, 200));
  });
  await fakeEmptyWorkspace(page);
  await fakeTaskWorld(page, { iOwnTheProject: true });
  await fakeUsers(page, FAKE_USERS.admin);
  await signInWithFakeApi(page, FAKE_USERS.admin, '/dashboard');

  for (const path of [
    '/dashboard',
    '/tasks',
    '/tasks/1',
    '/projects/7/board',
    '/projects',
    '/settings/appearance',
    '/admin/users',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    violations.push(
      ...(await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])),
    );
  }
  // Dialogs, menus and tooltips inject styles/portals: open one of each.
  await page.goto('/tasks/1');
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  // Submitting runs Zod validation (the moment its eval probe would happen without jitless mode).
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: /Account menu for/ }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  violations.push(
    ...(await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])),
  );

  expect([...new Set(violations)]).toEqual([]);
});
