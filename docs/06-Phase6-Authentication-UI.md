# Phase 6 — Authentication UI

> Status: **✅ Verified — approved 2026-11-26**. Builds on [Phase 5 — Layout and Navigation](05-Phase5-Layout-and-Navigation.md).
> Try it with your backend running: `npm run dev` → **Create one** → open the confirmation email from the backend's
> `src/TaskManagementSystem/emails/` folder → sign in → Settings › Security.

## 1. What this phase does, in simple words

Every account page now works against the **real ASP.NET Core API**: sign in, register, "check your email",
forgot password, reset password, confirm email, change password and sign out. Each form:

1. **checks input in the browser first** (fast feedback, the same rules and messages as the backend),
2. **sends the request** through one shared HTTP client,
3. **shows the server's answer where it belongs**: under the right field, as a form message, or as a full-page outcome.

What is **deliberately left for Phase 7**: tokens survive only until the page reloads (memory only); there is
no automatic token refresh, no cross-tab sync and no startup session check. The temporary development
preview accounts also stay until then.

## 2. Concepts

### 2.1 Forms with React Hook Form + Zod
```
 Zod schema ──► zodResolver ──► useForm()
 (rules)                         │ register('email') → ref + onChange on the native input
                                 │ handleSubmit(fn)  → validates, then calls fn with typed, trimmed values
                                 ▼
 <FormField label error hint>{(control) => <Input {...control} {...register('email')} />}</FormField>
```
- **Uncontrolled inputs:** React Hook Form reads values from the DOM through refs, so typing doesn't re-render the
  whole form.
- **One schema per form** (`features/auth/schemas/authSchemas.ts`), built from shared pieces
  (`src/schemas/common.ts`: `emailSchema`, `passwordSchema`, `requiredText`).
- **`z.infer<typeof schema>`** gives the form's TypeScript type, so the rules and the types can't disagree.
- **Cross-field rules** ("passwords do not match", "new ≠ current") use `.refine(…, { when })`. `when` lets the
  mismatch appear as soon as both fields have a value, instead of only after every other field is valid.

### 2.2 One password policy, two uses
`PASSWORD_RULES` (`src/schemas/common.ts`) is the **single source** for both the Zod validation and the live
`PasswordChecklist`. It mirrors the backend exactly: 8–128 characters, upper, lower, digit, special character,
and **at least 4 different characters**. That last rule is Identity's `RequiredUniqueChars`. The FluentValidation
rules don't check it, but Identity enforces it when hashing, so showing it avoids a surprise server error. (A
password that meets the other four character rules always has ≥ 4 distinct characters, so in practice it never
decides the outcome. It's kept so the UI states the backend's policy completely.)

The checklist is the password field's **description** (`aria-describedby`): screen readers read it on focus,
and each item says "(met)" / "(not met)" in text, not just with a green tick. It is deliberately **not** a live
region, because announcing every keystroke would be noise.

### 2.3 The HTTP layer and one error shape
```
 component ─► mutation hook (TanStack Query) ─► authApi.login() ─► apiClient (Axios, fetch adapter)
                                                                      request:  Authorization: Bearer <token>
                                                                      response: any failure → ApiError
```
`ApiError` (`src/api/apiError.ts`) is the only error type the UI sees:

| Field | From |
|---|---|
| `kind` | `network`, `timeout`, `canceled`, `validation` (400), `unauthorized` (401), `forbidden` (403), `notFound` (404), `conflict` (409), `businessRule` (422), `server` (5xx), `unknown` |
| `status`, `title`, `detail` | the backend's RFC 9457 ProblemDetails |
| `fieldErrors` | ProblemDetails `errors`, keys already camelCase (backend `ValidationErrorKeys`) |
| `correlationId` | body `correlationId`, or the `X-Correlation-ID` header (exposed by the backend's CORS policy) |

`getErrorMessage()` turns any error into a safe sentence. For **5xx it ignores `detail` on purpose**: in Development
the backend puts the full exception (stack trace) there.

### 2.4 Putting server errors where users look: `applyServerErrors`
| Server answer | Where it appears | Example |
|---|---|---|
| 400 with `errors.<field>` the form has | under that field; the first one is focused | `currentPassword: "The current password is incorrect."` |
| 400 with keys the form doesn't have | one form-level message (`FormErrorSummary`, `role="alert"`) | |
| status mapped with `statusToField` | under that field | register: `409 → email` "An account with this email address already exists." |
| anything else (401, network, 5xx) | form-level message | login: "Invalid email or password." |

Index keys are converted: ASP.NET's `roles[0]` → React Hook Form's `roles.0`.

### 2.5 Security decisions visible in the UI
| Decision | Why |
|---|---|
| Login shows **one** generic message and marks **no** field | Saying "unknown email" would tell attackers which emails have accounts |
| Forgot password / resend confirmation **always** show the same neutral message | The API always answers 202 for the same reason (no account enumeration) |
| The registered email travels in **router state**, not the URL | URLs end up in browser history, proxies and server logs |
| Emails are shown **masked** (`j***@example.com`) | Shoulder surfing, screenshots |
| 5xx `detail` is never displayed | It can contain stack traces in Development |
| Tokens are in memory only (Phase 6) and never logged | `no-console` lint rule; the error parser never copies request headers |
| Sign-out clears the session **locally first**, then revokes the refresh token on the server (best effort) and clears the query cache | Instant sign-out even offline; the next person on this browser sees no cached data |
| Change/reset password → the user is signed out | The backend revokes every session; the UI follows and explains why |

### 2.6 Link-based pages (from the backend's emails)
- **`/confirm-email?userId&token`** confirms **automatically and exactly once**. React StrictMode runs effects
  twice in development, and a second request with the already-used token would show a false error, so a ref guards
  it (tested under StrictMode). If the visitor is signed in, the profile is reloaded so the "verify" banner disappears.
- **`/reset-password?email&token`**: an incomplete link, or an invalid/expired token (`400 errors.token`),
  replaces the form with **"Request a new link"**, instead of a form that can't work.
- Malformed links (missing token, non-GUID user id) are detected **before** calling the API.

## 3. Files

### 3.1 Shared infrastructure
| File | Responsibility |
|---|---|
| `src/api/client.ts` | the Axios instance: base URL, 15 s timeout, **fetch adapter**, Bearer header, every failure → `ApiError` |
| `src/api/apiError.ts` | `ApiError`, `toApiError()` (ProblemDetails parsing), `getErrorMessage()` |
| `src/services/tokenStorage.ts` | `setSession` / `getAccessToken` / `getRefreshToken` / `clearSession`: memory only in Phase 6, same interface in Phase 7 |
| `src/app/providers/queryClient.ts` | TanStack Query defaults: retry only network/timeout/5xx (queries), never retry writes |
| `src/app/providers/AppProviders.tsx` | + `QueryClientProvider` (outside `AuthProvider`, which clears the cache on sign-out) |
| `src/schemas/common.ts` | `PASSWORD_RULES`, `passwordSchema`, `emailSchema`, `requiredText` |
| `src/utils/formErrors.ts` | `applyServerErrors`, `toFormPath`, `ROOT_SERVER_ERROR` |
| `src/utils/maskEmail.ts`, `src/hooks/useCountdown.ts` | masked address; resend cooldown (can start in the initial state) |
| `src/components/forms/FormErrorSummary.tsx`, `PasswordChecklist.tsx` | form-level error; live password rules |
| `src/components/forms/FormField.tsx` | hint is now a `<div>` (it can contain the checklist list); the required `*` sits **next to** the label |
| `src/types/api.ts` | + aliases for every auth/account DTO |

### 3.2 Auth feature (`src/features/auth/`)
| File | Responsibility |
|---|---|
| `api/authApi.ts` | `authApi` (login, register, logout, me) and `accountApi` (confirm, resend, forgot, reset, change): one typed function per endpoint |
| `hooks/useAuthMutations.ts` | one TanStack mutation per action; login stores the session, confirm refreshes the profile |
| `schemas/authSchemas.ts` | login, register, email-only, reset, change-password schemas |
| `types.ts` | router-state types (`LoginNotice`, `LoginLocationState`) and defensive readers (state is `unknown`) |
| `authContext.ts`, `AuthProvider.tsx` | + `completeSignIn`, `signOut({ notice })`, `refreshProfile`, `endedSession` |
| `components/` | `AuthPageHeader`, `AuthStatusMessage`, `EmailForm`, `ChangePasswordForm` |
| `pages/` | Login, Register, RegisterSuccess, ForgotPassword, ResetPassword, ConfirmEmail |

`src/features/settings/pages/SettingsPage.tsx`: the **Security** tab now hosts `ChangePasswordForm` (other tabs: Phase 14).
`src/app/router/guards/RequireAuth.tsx`: the single place that navigates after a deliberate sign-out (§4, #1).

## 4. Problems found and fixed

| # | Found by | Problem | Fix / lesson |
|---|---|---|---|
| 1 | Integration test | **Race after a password change:** `signOut()` made `RequireAuth` redirect to `/login?returnUrl=…` while our own `navigate('/login', { notice })` was still waiting for the lazy login page, so the explanation was lost | `signOut({ notice })` records an `endedSession`; **`RequireAuth` is the only navigator** after a deliberate sign-out (plain `/login` + notice, no returnUrl). Callers don't navigate. *One source of truth for navigation* |
| 2 | Integration test | "Resend email" was **enabled for one render** before the cooldown effect started, so a double email was possible | `useCountdown(60, { startImmediately })` starts in the **initial state**; the effect was removed |
| 3 | Integration tests (27 at once) | The required `*` was **inside** the `<label>`, so the label text was "Email*" | Asterisk moved next to the label: exact field names for voice control and tests, same look |
| 4 | Unit test | jsdom's XHR **enforces CORS**; mocked cross-origin responses failed as "network" | `apiClient` uses Axios's **`fetch` adapter**. In browsers CORS still applies (the API allows this origin) |
| 5 | HTML review | The password checklist (`<ul>`) sat inside the hint's `<p>`, which is invalid HTML | Hint wrapper is a `<div>` |
| 6 | ESLint | Axios response body is `any`; Zod's `message` option deprecated; useless type assertions | `unknown` + type guards; `error:`; removed |
| 7 | Bundle check | (from Phase 5) dev-preview UI must not ship | Re-verified: no "Continue as" text in production |

Mistakes in my own tests, corrected:
- An email-length case that was exactly at the limit (256), so it didn't test the limit.
- Two countdown steps inside one `act()`, so the timer was never scheduled.
- A table row with special-case logic inside the test (removed).
- An exact "60 s" assertion that a slow run legitimately shows as 59.
- Playwright's `getByLabel` matching substrings ("New password" ⊂ "Confirm new password"), fixed with `exact: true`.

## 5. Tests

| Level | File | Tests | Covers |
|---|---|---|---|
| Unit | `api/apiClient` | 18 | Bearer header on/off; **real** responses through the client: ProblemDetails parsing, 8 status→kind mappings, header correlation id, network failure, timeout; safe messages (5xx detail hidden) |
| Unit | `schemas/common` | 17 | every password rule + message, unique-characters rule, email, required text |
| Unit | `features/auth/authSchemas` | 6 | mismatch shown early, empty confirmation, new ≠ current |
| Unit | `utils/formErrors` | 6 | field mapping + focus, `roles[0]`, unknown keys, 409 → field, safe fallback |
| Unit | `utils/maskEmail`, `hooks/useCountdown` | 5 + 4 | masking edge cases; countdown, restart, immediate start |
| Integration | `auth/login` | 9 | validation + focus, trimmed body, session stored, returnUrl, generic 401, network, busy button, **logout sends the refresh token**, logout still works offline |
| Integration | `auth/register` | 8 | live checklist, described-by, client errors, body without `confirmPassword`, masked email + cooldown, 409 on email + focus, 400 under field, direct visit resend |
| Integration | `auth/passwordReset` | 8 | neutral forgot message, validation, 5xx hidden; reset: incomplete link, success → notice, expired token, server policy error, mismatch |
| Integration | `auth/confirmEmail` | 5 | **one request under StrictMode**, incomplete link, expired → resend, retry after 503, signed-in profile refresh |
| Integration | `auth/changePassword` | 3 | Bearer + body, signed out with notice; wrong current password under field; same password blocked |
| **Vitest total** | 32 files | **243** (+89) | ✅ stable over 3 runs; line coverage ≈ 92 % |
| E2E (UI) | `auth.spec.ts` | 10 × 3 viewports | browser validation + focus, generic 401, live checklist, 409, keyboard show/hide, **axe on every auth page incl. with errors shown** |
| **Playwright UI total** | | **69** | ✅ desktop, tablet, mobile |
| **E2E (real API)** | `backend/auth-flow.backend.spec.ts` | 1 | register → **real confirmation email** → sign in → wrong current password (real Identity 400) → change → old password refused → new accepted → sign out → **real reset email** → reset → sign in. ✅ passed against the running backend |

How to run the real-API flow: start the backend (Development), then `npm run test:e2e:backend`.
It reads links from the backend's email pickup folder (override with `E2E_EMAIL_DIR`) and **creates one
`e2e-<timestamp>@example.test` user in the development database per run**.

## 6. Verification

| Check | Result |
|---|---|
| `npm run verify` | ✅ typecheck, lint, format, 243/243 tests, build |
| `npm run test:e2e` | ✅ 69/69 |
| `npm run test:e2e:backend` | ✅ 1/1 against the real API |
| Production bundle | ✅ one chunk per page; no preview UI |
| Main bundle | ⚠️ 229.7 kB gzip (was 183.5): Axios, TanStack Query and the auth provider now load at startup. To be measured and reduced in Phase 16 |

## 7. Common mistakes and best practices

| Mistake | Better |
|---|---|
| Validating only on the client | Client for speed, server is the authority. Show both errors in the same place |
| Different password rules in UI and API | One rule list mirrored from the backend, used by schema **and** checklist |
| "Unknown email" vs "wrong password" messages | One generic message (account enumeration) |
| Showing `error.message` / 5xx details to users | A mapped, safe message + correlation id |
| Putting emails or tokens in URLs you create | Router state; mask addresses on screen |
| Two code paths navigating after sign-out | One navigator (the guard) reacting to auth state |
| Starting "disabled until…" timers in an effect | Initial state, so the first render is already correct |
| `useEffect` that calls an API on mount without a guard | A ref guard (StrictMode) or a query with a stable key |
| `aria-hidden` asterisk inside `<label>` | Next to the label; `aria-required` on the control |

## 8. Interview questions
1. Why use both client-side (Zod) and server-side (FluentValidation) validation?
2. How does React Hook Form avoid re-rendering on every keystroke?
3. What is account enumeration, and which three places in this app defend against it?
4. Why must a login error not say which field was wrong?
5. How do you map a 400 ValidationProblemDetails onto form fields? What about errors for fields the form doesn't have?
6. Why can't you show the `detail` of a 500 response to users here?
7. Why does React StrictMode run effects twice, and how do you keep a one-time request one-time?
8. Describe the race between a route guard and an explicit `navigate()` after sign-out, and how a single navigation source solves it.
9. Why does a change of password sign the user out of every device?
10. What does `aria-describedby` do, and why is the password checklist not an `aria-live` region?

## 9. Practical exercises
1. Add a "Remember my email" checkbox to the login form that pre-fills the email next time (`localStorage`, never the password). Write one integration test.
2. Make the resend cooldown 30 seconds and update the tests. Which tests had to change, and why?
3. With the backend running, register with a password that passes the checklist but contains your email address.
   Does the backend accept it? Should the client check this too?
4. Open a confirmation link twice. What does the second visit show, and which backend response causes it?
5. Read `applyServerErrors` and draw what happens for: 400 `{ email, general }`, 409 with `statusToField`, and a network error.
