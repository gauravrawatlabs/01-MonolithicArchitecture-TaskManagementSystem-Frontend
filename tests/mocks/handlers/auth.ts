import { http, HttpResponse } from 'msw';

import { apiUrl } from '../api';
import { buildAuthResponse } from '../factories/auth';
import { buildUser } from '../factories/users';

/**
 * Happy-path handlers for AuthController and AccountController. Status codes and bodies follow
 * the real endpoints (docs/01 §0.2). Tests override one endpoint at a time with server.use(...).
 */
export const authHandlers = [
  http.post(apiUrl('/api/auth/login'), () => HttpResponse.json(buildAuthResponse())),
  http.post(apiUrl('/api/auth/register'), () =>
    HttpResponse.json(buildUser({ emailConfirmed: false }), { status: 201 }),
  ),
  http.post(apiUrl('/api/auth/refresh'), () => HttpResponse.json(buildAuthResponse())),
  http.post(apiUrl('/api/auth/logout'), () => new HttpResponse(null, { status: 204 })),
  http.post(apiUrl('/api/auth/logout-all'), () => new HttpResponse(null, { status: 204 })),
  http.get(apiUrl('/api/auth/me'), () => HttpResponse.json(buildUser())),
  http.post(apiUrl('/api/account/confirm-email'), () => new HttpResponse(null, { status: 204 })),
  http.post(
    apiUrl('/api/account/resend-confirmation'),
    () => new HttpResponse(null, { status: 202 }),
  ),
  http.post(apiUrl('/api/account/forgot-password'), () => new HttpResponse(null, { status: 202 })),
  http.post(apiUrl('/api/account/reset-password'), () => new HttpResponse(null, { status: 204 })),
  http.post(apiUrl('/api/account/change-password'), () => new HttpResponse(null, { status: 204 })),
];
