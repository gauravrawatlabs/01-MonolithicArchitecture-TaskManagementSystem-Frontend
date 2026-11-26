import { http, type HttpResponseResolver } from 'msw';

import { apiUrl } from './api';
import { server } from './server';

export interface CapturedRequest {
  body: unknown;
  authorization: string | null;
}

/**
 * Overrides one endpoint and records every call to it, so a test can assert what the app SENT
 * (body, Authorization header), not just what it showed.
 */
export function captureRequests(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  respond: () => Response,
): CapturedRequest[] {
  const calls: CapturedRequest[] = [];
  const resolver: HttpResponseResolver = async ({ request }) => {
    const text = await request.text();
    calls.push({
      body: text ? (JSON.parse(text) as unknown) : undefined,
      authorization: request.headers.get('Authorization'),
    });
    return respond();
  };
  server.use(http[method](apiUrl(path), resolver));
  return calls;
}
