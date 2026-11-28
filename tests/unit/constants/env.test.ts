import { describe, expect, it } from 'vitest';

import { parseEnv, withRuntimeConfig } from '@/constants/env';

describe('parseEnv', () => {
  it('returns the API URL and app name from valid variables', () => {
    // Arrange
    const raw = { VITE_API_BASE_URL: 'https://api.example.com', VITE_APP_NAME: 'Tasks' };

    // Act
    const env = parseEnv(raw);

    // Assert
    expect(env).toEqual({ apiBaseUrl: 'https://api.example.com', appName: 'Tasks' });
  });

  it('removes trailing slashes so URLs can be joined safely', () => {
    const env = parseEnv({ VITE_API_BASE_URL: 'http://localhost:5075//' });

    expect(env.apiBaseUrl).toBe('http://localhost:5075');
  });

  it('uses a default app name when none is configured', () => {
    const env = parseEnv({ VITE_API_BASE_URL: 'http://localhost:5075' });

    expect(env.appName).toBe('Task Management System');
  });

  it('returns a frozen object so configuration cannot be changed at runtime', () => {
    const env = parseEnv({ VITE_API_BASE_URL: 'http://localhost:5075' });

    expect(Object.isFrozen(env)).toBe(true);
  });

  it.each([
    ['missing', {}],
    ['empty', { VITE_API_BASE_URL: '' }],
    ['not a URL', { VITE_API_BASE_URL: 'localhost:5075' }],
    ['not http(s)', { VITE_API_BASE_URL: 'ftp://files.example.com' }],
  ])('throws a helpful error when the API URL is %s', (_case, raw) => {
    expect(() => parseEnv(raw)).toThrow(/VITE_API_BASE_URL[\s\S]*\.env\.example/);
  });
});

describe('withRuntimeConfig (public/config.js)', () => {
  const buildTime = { VITE_API_BASE_URL: 'http://localhost:5075', VITE_APP_NAME: 'Tasks' };

  it('lets a deployment point the same build at another API without rebuilding', () => {
    expect(
      parseEnv(withRuntimeConfig(buildTime, { apiBaseUrl: 'https://api.example.com/' })),
    ).toEqual({
      apiBaseUrl: 'https://api.example.com',
      appName: 'Tasks',
    });
  });

  it('keeps the build-time values when the runtime file is empty or missing', () => {
    expect(withRuntimeConfig(buildTime, {})).toEqual(buildTime);
    expect(withRuntimeConfig(buildTime, undefined)).toEqual(buildTime);
    expect(withRuntimeConfig(buildTime, { apiBaseUrl: '' })).toEqual(buildTime);
  });

  it('still validates a runtime value (a typo fails clearly at start-up)', () => {
    expect(() => parseEnv(withRuntimeConfig(buildTime, { apiBaseUrl: 'api.example.com' }))).toThrow(
      /VITE_API_BASE_URL/,
    );
  });
});
