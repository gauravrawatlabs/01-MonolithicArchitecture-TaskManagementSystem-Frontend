import axios from 'axios';

/**
 * What went wrong, as a small closed set. UI code switches on `kind`, never on raw status codes
 * or Axios internals (docs/02 §7.5).
 */
export type ApiErrorKind =
  | 'network' // no response at all (offline, DNS, CORS, server down)
  | 'timeout'
  | 'canceled' // request aborted on purpose (e.g. component unmounted): never shown to users
  | 'validation' // 400
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'notFound' // 404
  | 'conflict' // 409
  | 'businessRule' // 422
  | 'server' // 5xx
  | 'unknown';

interface ApiErrorInit {
  kind: ApiErrorKind;
  status?: number;
  title?: string;
  detail?: string;
  fieldErrors?: Record<string, string[]>;
  correlationId?: string;
}

/** The ONE error type the rest of the app sees for failed API calls. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;
  readonly title: string | undefined;
  readonly detail: string | undefined;
  /** ProblemDetails `errors`: camelCase field name → messages (backend ValidationErrorKeys). */
  readonly fieldErrors: Readonly<Record<string, string[]>>;
  /** Quote this to support; it finds the request in the server logs. */
  readonly correlationId: string | undefined;

  constructor({ kind, status, title, detail, fieldErrors = {}, correlationId }: ApiErrorInit) {
    super(detail ?? title ?? `API request failed (${kind})`);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
    this.correlationId = correlationId;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseFieldErrors(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) return {};
  const result: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(value)) {
    if (Array.isArray(messages)) {
      const strings = messages.filter((message): message is string => typeof message === 'string');
      if (strings.length > 0) result[field] = strings;
    }
  }
  return result;
}

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 400) return 'validation';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status === 422) return 'businessRule';
  if (status >= 500) return 'server';
  return 'unknown';
}

/**
 * Converts anything thrown by an API call into an ApiError. Reads the backend's RFC 9457
 * ProblemDetails body (title, detail, errors, correlationId) when present. Request headers
 * (which carry the Bearer token) are never copied into the error, so tokens can't leak into logs.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (!axios.isAxiosError(error)) {
    return new ApiError({
      kind: 'unknown',
      detail: error instanceof Error ? error.message : undefined,
    });
  }

  if (error.code === 'ERR_CANCELED') return new ApiError({ kind: 'canceled' });
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
    return new ApiError({ kind: 'timeout' });
  if (!error.response) return new ApiError({ kind: 'network' });

  const { status, headers } = error.response;
  // Axios types the body as `any`; treat it as unknown and narrow it with type guards.
  const data: unknown = error.response.data;
  const body = isRecord(data) ? data : {};
  const headerCorrelationId: unknown = isRecord(headers) ? headers['x-correlation-id'] : undefined;

  return new ApiError({
    kind: kindFromStatus(status),
    status,
    title: optionalString(body.title),
    detail: optionalString(body.detail),
    fieldErrors: parseFieldErrors(body.errors),
    correlationId: optionalString(body.correlationId) ?? optionalString(headerCorrelationId),
  });
}

const GENERIC_MESSAGES: Partial<Record<ApiErrorKind, string>> = {
  network: "We couldn't reach the server. Check your connection and try again.",
  timeout: 'The server took too long to respond. Please try again.',
  server: 'Something went wrong on our side. Please try again in a moment.',
  forbidden: "You don't have permission to do that.",
  notFound: "We couldn't find what you were looking for.",
};

/**
 * A message that is safe to show to users. For 5xx the server's `detail` is ignored on purpose:
 * in Development it contains a stack trace (see the backend's ExceptionHandlingMiddleware).
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  const apiError = toApiError(error);
  const generic = GENERIC_MESSAGES[apiError.kind];
  if (apiError.kind === 'server' || apiError.kind === 'network' || apiError.kind === 'timeout') {
    return generic ?? fallback;
  }
  return apiError.detail ?? generic ?? apiError.title ?? fallback;
}
