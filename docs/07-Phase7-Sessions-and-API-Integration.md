# Phase 7 — Authentication and API Integration (sessions)

> Status: **✅ Verified — approved 2026-11-26**. Builds on [Phase 6 — Authentication UI](06-Phase6-Authentication-UI.md).
> Try it with the backend running: sign in → reload (still signed in) → open a second tab (also signed in) →
> sign out in one tab (the other follows) → Settings › Security › **Sign out of all devices**.

## 1. What this phase does, in simple words

Until now a reload signed you out. Now the app keeps a **real session**:

- **Survives reloads and new tabs.** A refresh token is stored; on startup the app silently exchanges it for a
  new access token.
- **Renews itself.** The access token lives 15 minutes. The app renews it ~60 s before it expires, and if a
  request still meets a 401, it renews and **retries once**, invisibly to the user.
- **Is safe across tabs.** Several tabs share one session without ever tripping the backend's theft detection.
- **Ends cleanly.** Session expired, signed out in another tab, signed out of all devices: each case has its
  own message on the sign-in page, and the user returns to where they were when that makes sense.

The temporary development preview accounts are **removed**.

## 2. The backend contract this is built on

| Fact (from `AuthService.RefreshAsync`) | Consequence for the frontend |
|---|---|
| Access token: JWT, 15 min, `Authorization: Bearer` | Keep it in memory; renew before it expires |
| Refresh token: opaque, 7 days, sent **in the JSON body** (not a cookie) | The frontend must store it (decision A1: `localStorage`) |
| **Rotation**: every refresh returns a new refresh token and revokes the old one | Always send the **newest** token |
| **Reuse detection**: presenting an already-rotated token revokes **all** the user's sessions | Never send the same token twice, not even from two tabs at once |
| Two parallel refreshes with the same token: the second fails its compare-and-set → treated as reuse | Refreshes must be **serialized across tabs**, not just within one |
| `POST /api/auth/logout-all` revokes every refresh token | "Sign out of all devices" |

## 3. Architecture

```
                         ┌──────────────── one browser tab ────────────────┐
  any API call ─► apiClient ─► request interceptor: Bearer <access token (memory)>
                     │
                     └─► 401? ──► refreshSession() ◄── proactive timer (expiry − 60 s)
                                     │              ◄── startup (stored refresh token)
                                     │              ◄── email confirmed while signed in
                     single-flight:  │ all concurrent callers share ONE promise
                                     ▼
                     withRefreshLock (Web Locks API: one holder across ALL tabs)
                                     │ read refresh token from localStorage NOW (newest)
                                     ▼
                     POST /api/auth/refresh ─► 200: store pair, notify listeners ─► retry request once
                                            └► 401: clear session, notify "expired"
                                            └► network: keep session, report error
                         └──────────────────────────────────────────────────┘
  other tabs ◄── `storage` event on tms.refreshToken: removed → sign out · added → restore · changed → ignore
```

### 3.1 Where the tokens live (decision A1)
| Token | Where | Why |
|---|---|---|
| Access token | this tab's **memory** (`tokenStorage.ts` module variable) | Short-lived. Never in storage, so a stolen `localStorage` dump can't call the API directly |
| Refresh token | `localStorage["tms.refreshToken"]` as `{ token, expiresAtUtc }` | Survives reloads and is shared by tabs. Rotated on every use; reuse revokes everything |

The refresh token is **read from storage every time it's needed** (never cached in a variable), because another tab
may have rotated it a moment ago. An expired, malformed or missing value counts as "no session".

**Trade-off (recorded in Phase 1 §14.3):** JavaScript can read `localStorage`, so an XSS bug could steal the refresh
token. Mitigations: rotation + reuse detection (a stolen token used by the attacker *or* the user kills every
session), a 7-day lifetime, no `dangerouslySetInnerHTML`, strict linting, and a Content-Security-Policy in Phase 16.
An `HttpOnly` cookie would remove this risk, but it needs a backend change; it's re-evaluated in Phase 16.

### 3.2 One refresh at a time: single-flight + Web Lock + re-read
1. **In one tab**: `refreshSession()` keeps the in-flight promise. Ten requests failing with 401 at once await
   **one** refresh, then all retry. (Tested: 5 parallel 401s → exactly 1 refresh call.)
2. **Across tabs**: `navigator.locks.request('tms-auth-refresh', …)` lets only one tab refresh at a time. Browsers
   (and jsdom) without Web Locks fall back to an in-tab promise queue.
3. **Re-read inside the lock**: the refresh token is read *after* the lock is acquired, so a tab that waited uses
   the token the previous tab just received. This is what prevents reuse revocation. A mutation test confirmed it:
   reading the token *before* the lock makes the test fail.

> **Correction to Phase 1 §14.3.** The plan said a waiting tab would "adopt the new tokens instead of calling /refresh".
> That's impossible without sharing access tokens between tabs (they are memory-only by design). The implemented rule,
> **serialize and re-read**, gives each tab its own access token and never reuses a refresh token.

### 3.3 Only a 401 ends a session
| Refresh result | What happens |
|---|---|
| 200 | New pair stored; listeners update the user (e.g. `emailConfirmed`) |
| **401** (expired, revoked, reused) | Session cleared everywhere; "Your session has expired" + return to the same page after signing in |
| Network / timeout / 5xx | **Session kept** (a Wi-Fi blip must not sign anyone out). At startup: "We couldn't restore your session" + *Try again* |

### 3.4 The interceptor rules (`src/api/interceptors.ts`)
- Adds `Authorization: Bearer <token>` to every request (on retries, the **new** token).
- Refreshes on **401 only**, never on 403/404/…
- **At most one retry** per request (`_retry`): no endless loop if the new token is rejected too.
- **Never** for requests marked `skipAuthRefresh`: login, register and logout. There, a 401 means "wrong credentials",
  not "token expired".
- No refresh attempt when there's no stored session at all.
- The refresh itself uses a **separate, interceptor-free Axios instance** (`src/api/session.ts`), so a failing
  refresh can't trigger another refresh, and there's no import cycle with `apiClient`.

### 3.5 Session state in React (`AuthProvider`)
A **reducer** keeps `status`, `user`, token expiry, `endedSession` and `sessionCheckFailed` consistent (no
"authenticated without a user"). Effects:
1. subscribe to `onSessionRefreshed` / `onSessionExpired` (from interceptor, timer, startup);
2. **startup check** once (StrictMode-safe) when a refresh token is stored;
3. **other tabs** via the `storage` event: signed out elsewhere → sign out here; signed in elsewhere → restore here;
4. **proactive timer** at expiry − 60 s, never closer than 5 s (guards against loops with a wrong clock).

`RequireAuth` remains the **single navigator** when a session ends (Phase 6 lesson):

| How the session ended | Sign-in page shows | Returns to the page afterwards? |
|---|---|---|
| Never signed in | — | yes (`returnUrl`) |
| Session expired (refresh 401, startup or mid-use) | "Your session has expired…" | **yes** |
| Signed out (menu) | — | no |
| Password changed / reset | "Your password was changed…" / "…has been reset" | no |
| Signed out in another tab | "You signed out in another tab." | no |
| Sign out of all devices | "You were signed out on all devices." | no |

### 3.6 Email verification takes effect immediately
The access token carries `email_verified`. After confirming the email **while signed in**, the app now **refreshes the
session** (not just `/me`). The new token says `true`, so write actions stop returning 403 at once, and the
banner disappears.

## 4. Files

| File | Responsibility |
|---|---|
| `src/services/tokenStorage.ts` | access token in memory; refresh token in `localStorage` (read every time); `clearAccessToken` (this tab) vs `clearSession` (everywhere) |
| `src/services/sessionSync.ts` | `withRefreshLock` (Web Locks + fallback queue); `onOtherTabSessionChange` (`storage` event → signedOut/signedIn/rotated elsewhere) |
| `src/api/session.ts` | `refreshSession()` (single-flight, lock, re-read, 401-only expiry), listeners, `computeRefreshDelay()` (capped at the `setTimeout` maximum) |
| `src/api/interceptors.ts` | Bearer header; 401 → refresh → retry once; error normalisation |
| `src/api/client.ts` | creates `apiClient` and installs the interceptors |
| `src/types/axios.d.ts` | typed request options `skipAuthRefresh`, `_retry` |
| `src/features/auth/AuthProvider.tsx` | session reducer, startup check, listeners, cross-tab, proactive timer, sign-out |
| `src/features/auth/authContext.ts` | + `sessionCheckFailed`, `retrySessionCheck`, `EndedSession.keepReturnUrl`; − `previewSignIn` |
| `src/features/auth/api/authApi.ts` | `skipAuthRefresh` on login/register/logout; + `logoutAll` |
| `src/features/auth/hooks/useAuthMutations.ts` | confirm email → `refreshSession`; + `useLogoutAllMutation` |
| `src/features/auth/components/SessionsCard.tsx` | Settings › Security: "Sign out of all devices" with confirmation |
| `src/features/auth/types.ts`, `pages/LoginPage.tsx` | + notices `sessionExpired`, `signedOutElsewhere`, `signedOutEverywhere`; preview panel removed |
| `src/app/router/guards/RequireAuth.tsx`, `RequireGuest.tsx` | expired → `returnUrl` + notice; offline startup → `SessionCheckFailedPage` |
| `src/app/router/pages/SessionCheckFailedPage.tsx` | "We couldn't restore your session" + Try again / Sign out |
| **Removed:** `src/features/auth/previewUsers.ts` | the temporary preview accounts (no references remain) |

## 5. Problems found and fixed

| # | Found by | Problem | Fix / lesson |
|---|---|---|---|
| 1 | Integration tests | **`setTimeout` overflow**: delays above 2³¹−1 ms (~24.8 days) fire **immediately**, so a long-lived token caused a refresh right after every sign-in | `computeRefreshDelay` caps at `MAX_TIMER_DELAY_MS`; unit-tested |
| 2 | Backend code review | Parallel refreshes with the same token are treated as theft by the backend | Web Lock across tabs + re-read inside the lock (mutation-tested) |
| 3 | Design | Phase 1's "adopt the other tab's tokens" isn't possible with memory-only access tokens | Serialize-and-re-read (documented correction, §3.2) |
| 4 | Type checker | DOM typings make `navigator.locks.request` return `Promise<Promise<T>>` for async callbacks | `await` inside an `async` wrapper |
| 5 | ESLint | Test stub spread `navigator` (`{ ...navigator }` drops the prototype) | define only `locks` on the real object |
| 6 | Real-API E2E | `fill()` typed into the **previous** page's "Email" field while the next page was still lazy-loading | Wait for the new page's heading before filling (also on the other navigations in that spec) |

**About the real-API runs.** The API on port 5075 was **your Visual Studio debug session** (I didn't stop it). During the
first runs some requests stalled for many seconds exactly when the backend threw (wrong password, invalid refresh
token), and others took ~1 s for a simple 401, which is typical for a process with a debugger attached (possibly set to
break on thrown exceptions). The backend project therefore allows 15 s per assertion. After the fixes above, both
real-API specs passed. Each run creates `e2e-…@example.test` users in the development database.

## 6. Tests

| Level | File | Tests | Covers |
|---|---|---|---|
| Unit | `services/tokenStorage` | 4 | access token never stored; refresh token re-read; expired/malformed ignored; clear this tab vs everywhere |
| Unit | `services/sessionSync` | 4 | lock serializes and releases on failure; Web Locks used when present; storage events mapped (incl. `clear()`) |
| Unit | `api/session` | 10 | rotation; **single-flight**; **re-read after lock**; 401 ends session; **network keeps session**; no-session; delay maths incl. overflow cap |
| Unit | `api/interceptors` | 7 | 401 → refresh → retry with new token; **5 parallel 401s → 1 refresh**; refresh rejected → original 401; **no retry loop**; `skipAuthRefresh`; no session; 403 untouched |
| Integration | `auth/session` | 13 | restore after reload (loader → page); **one refresh under StrictMode**; revoked → expired + returnUrl; offline → retry; nothing stored → no request; transparent refresh mid-action; expiry mid-use; refresh token stored on sign-in; logout-all; **proactive timer** (fake timers); other tab signs out / signs in / rotates |
| **Vitest total** | 37 files | **281** (+38) | ✅ stable over 3 runs |
| E2E (UI, faked API) | `session.spec.ts` | 3 × 3 | reload keeps session (and storage holds no access token); revoked → expired + returnUrl; offline → retry; axe on both screens |
| E2E (UI) | `navigation.spec.ts`, `auth.spec.ts` | migrated | sign in through the real form against a faked API (preview accounts removed) |
| **Playwright UI total** | | **78** | ✅ desktop, tablet, mobile |
| E2E (real API) | `backend/session.backend.spec.ts` | 1 | reload with **real rotation**; second tab shares session; **both tabs reload at once without reuse revocation**; cross-tab sign-out; logout-all ends a session in **another browser** |
| E2E (real API) | `backend/auth-flow.backend.spec.ts` | 1 | the Phase 6 flow, still green |

## 7. Common mistakes and best practices

| Mistake | Better |
|---|---|
| Access token in `localStorage` | Memory only; only the (rotated) refresh token persists |
| Caching the refresh token in a variable | Read it from storage each time: another tab may have rotated it |
| Every 401 triggers its own refresh | Single-flight promise |
| Two tabs refreshing in parallel | Cross-tab lock (Web Locks) + re-read inside the lock |
| Signing out on any refresh failure | Only on 401; keep the session on network errors |
| Refreshing on login 401 | `skipAuthRefresh` for auth endpoints |
| Unlimited retries | One retry per request |
| Refresh call through the same intercepted client | A separate client without interceptors |
| `setTimeout(fn, hugeDelay)` | Cap at 2³¹−1 ms |
| Losing the user's page on expiry | `returnUrl` + a clear notice |
| Filling fields right after a navigation in E2E | Wait for the new page first |

## 8. Interview questions
1. Why keep the access token in memory but the refresh token in storage? What does each choice protect against?
2. What is refresh-token rotation, and what does reuse detection add?
3. How can two browser tabs accidentally revoke every session, and how do you prevent it?
4. What is a single-flight promise? Why isn't it enough across tabs?
5. Why must the refresh request not go through the same interceptor?
6. Which refresh failures should sign the user out, and which shouldn't?
7. How does a tab learn that another tab signed out? Why doesn't the `storage` event fire in the tab that made the change?
8. Why does confirming the email require a token refresh, not just reloading the profile?
9. What happens if you pass 30 days in milliseconds to `setTimeout`?
10. Where would an `HttpOnly` refresh cookie change this design, and what new risk (CSRF) would it introduce?

## 9. Practical exercises
1. Open two tabs, sign out in one, and watch the other. Then sign in in one and watch the other again.
2. In DevTools › Application › Local Storage, edit `tms.refreshToken` to a wrong value and reload. Explain the result.
3. In DevTools › Network, set "Offline" and reload. What do you see, and why isn't the session deleted?
4. Temporarily change `PROACTIVE_REFRESH_LEAD_MS` to 14 minutes, sign in, and watch the refresh happen after about a minute.
5. Explain, with the diagram in §3, what happens when five requests fail with 401 at the same moment in two tabs.
