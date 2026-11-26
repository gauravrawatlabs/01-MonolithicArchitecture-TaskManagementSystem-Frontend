import { HttpResponse } from 'msw';

/** Same base URL as .env.test, so MSW intercepts exactly what the app calls. */
export const API_BASE_URL = 'http://localhost:5075';

export const apiUrl = (path: string): string => `${API_BASE_URL}${path}`;

export interface ProblemInit {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
  correlationId?: string;
}

/**
 * An RFC 9457 ProblemDetails response shaped exactly like the backend's
 * (ExceptionHandlingMiddleware): title, status, detail, errors, traceId, correlationId.
 */
export function problem(
  status: number,
  { title, detail, errors, correlationId = 'test-correlation-id' }: ProblemInit = {},
) {
  return HttpResponse.json(
    {
      type: `https://tools.ietf.org/html/rfc9110#section-15.${status >= 500 ? '6' : '5'}.1`,
      title: title ?? (status === 400 ? 'One or more validation errors occurred.' : 'Error'),
      status,
      ...(detail ? { detail } : {}),
      ...(errors ? { errors } : {}),
      traceId: '00-test-trace-00',
      correlationId,
    },
    {
      status,
      headers: { 'Content-Type': 'application/problem+json', 'X-Correlation-ID': correlationId },
    },
  );
}
