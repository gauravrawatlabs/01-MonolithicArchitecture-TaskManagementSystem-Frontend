import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError, getErrorMessage, toApiError } from '@/api/apiError';
import { apiClient } from '@/api/client';
import { setSession } from '@/services/tokenStorage';

import { apiUrl, problem } from '../../mocks/api';
import { buildAuthResponse } from '../../mocks/factories/auth';
import { server } from '../../mocks/server';

const PROBE = '/api/probe';

/** Calls the probe endpoint through the REAL client and returns what it threw. */
async function failingCall(config?: { timeout?: number }): Promise<ApiError> {
  try {
    await apiClient.get(PROBE, config);
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error('Expected the request to fail');
}

describe('apiClient', () => {
  it('sends the access token as a Bearer header when signed in', async () => {
    let authorization: string | null = 'not captured';
    server.use(
      http.get(apiUrl(PROBE), ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    setSession(buildAuthResponse(undefined, { accessToken: 'abc.def.ghi' }));
    await apiClient.get(PROBE);

    expect(authorization).toBe('Bearer abc.def.ghi');
  });

  it('sends no Authorization header when signed out', async () => {
    let authorization: string | null = 'not captured';
    server.use(
      http.get(apiUrl(PROBE), ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiClient.get(PROBE);

    expect(authorization).toBeNull();
  });
});

describe('ApiError from real responses', () => {
  it('parses a 400 ValidationProblemDetails: field errors, detail and correlation id', async () => {
    server.use(
      http.get(apiUrl(PROBE), () =>
        problem(400, {
          detail: 'One or more validation errors occurred.',
          errors: { email: ['Email is required.'], 'roles[0]': ['Unknown role.'] },
          correlationId: 'CORR-400',
        }),
      ),
    );

    const error = await failingCall();

    expect(error.kind).toBe('validation');
    expect(error.status).toBe(400);
    expect(error.fieldErrors).toEqual({
      email: ['Email is required.'],
      'roles[0]': ['Unknown role.'],
    });
    expect(error.correlationId).toBe('CORR-400');
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'notFound'],
    [409, 'conflict'],
    [422, 'businessRule'],
    [500, 'server'],
    [503, 'server'],
    [418, 'unknown'],
  ] as const)('maps HTTP %i to kind "%s"', async (status, kind) => {
    server.use(http.get(apiUrl(PROBE), () => problem(status, { detail: 'x' })));

    expect((await failingCall()).kind).toBe(kind);
  });

  it('reads the correlation id from the X-Correlation-ID header when the body has none', async () => {
    server.use(
      http.get(apiUrl(PROBE), () =>
        HttpResponse.text('Bad gateway', { status: 502, headers: { 'X-Correlation-ID': 'HDR-1' } }),
      ),
    );

    const error = await failingCall();

    expect(error.kind).toBe('server');
    expect(error.correlationId).toBe('HDR-1');
    expect(error.fieldErrors).toEqual({});
  });

  it('reports a network failure (server unreachable) as kind "network"', async () => {
    server.use(http.get(apiUrl(PROBE), () => HttpResponse.error()));

    expect((await failingCall()).kind).toBe('network');
  });

  it('reports a slow server as kind "timeout"', async () => {
    server.use(
      http.get(apiUrl(PROBE), async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );

    expect((await failingCall({ timeout: 50 })).kind).toBe('timeout');
  });
});

describe('getErrorMessage', () => {
  it('shows the server detail for expected errors (401, 409, …)', () => {
    const error = new ApiError({
      kind: 'unauthorized',
      status: 401,
      detail: 'Invalid email or password.',
    });
    expect(getErrorMessage(error)).toBe('Invalid email or password.');
  });

  it('never shows the detail of a 5xx (in Development it contains a stack trace)', () => {
    const error = new ApiError({
      kind: 'server',
      status: 500,
      detail: 'System.NullReferenceException at …',
    });
    expect(getErrorMessage(error)).toBe(
      'Something went wrong on our side. Please try again in a moment.',
    );
  });

  it('explains network problems in plain language', () => {
    expect(getErrorMessage(new ApiError({ kind: 'network' }))).toMatch(/couldn't reach the server/);
  });

  it('wraps non-API errors safely', () => {
    expect(toApiError(new Error('boom')).kind).toBe('unknown');
    expect(getErrorMessage('a string was thrown')).toBe('Something went wrong. Please try again.');
  });
});
