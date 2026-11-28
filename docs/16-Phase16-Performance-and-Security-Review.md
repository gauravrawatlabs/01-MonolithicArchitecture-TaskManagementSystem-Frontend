# Phase 16 — Performance and Security Review

> Status: **✅ Verified — approved 2026-11-28**. Refresh-token storage: **option A kept** for now (§3.4). Builds on [Phase 15 — Complete testing and QA](15-Phase15-Complete-Testing-and-QA.md).
> Rule for this phase: **measure first, change only what the measurements show, and record what was accepted.**

## 1. Summary

| Area | Finding | Result |
|---|---|---|
| Entry bundle | Zod + React Hook Form + a password form shipped on **every** page | **−41 KB gzip** (236 → 195 KB); dashboard downloads −39 KB of JS |
| Page loads (throttled mobile) | LCP ≈ 3–4 s on the "Slow 4G + 4× CPU" profile; ±1 s noise between runs | documented with options (§2.4) |
| Duplicate requests | none on 8 main pages | nothing to fix |
| XSS sinks, `eval`, `_blank`, secrets, source maps | none | ✅ |
| Token leakage through logged errors | not possible (errors carry no request) | **regression test added** |
| Dependencies | `npm audit`: **0** vulnerabilities (production and dev) | ✅ |
| Security headers / CSP | none defined yet (hosting is Phase 17) | **policy written and tested against the real build** (§3.3) |
| Refresh token in `localStorage` | accepted in Phase 1, flagged for review | analysis and recommendation (§3.4), **decision for you** |

## 2. Performance

### 2.1 How it was measured
- **Bundle composition:** production build with source maps; every byte of the entry file attributed to the npm
  package or source folder it came from (`source-map-js`, already installed).
- **Page loads:** production builds served with `vite preview`. Chromium was throttled like Lighthouse's mobile
  profile (150 ms latency, 1.6 Mbps, CPU ×4) with a cold cache. 3 runs per page, median reported; before and after
  measured **alternately**, one server at a time.
- **Before** = the previous commit, built in a temporary git worktree (removed afterwards).

### 2.2 What the entry file contained
| Package | Share | Needed on every page? |
|---|---|---|
| react-dom, react-router, axios, @tanstack/query-core | 62 % | yes (framework, routing, API, cache) |
| **zod** | **11 %** | **no**: only forms |
| **react-hook-form** | **5 %** | **no**: only forms |
| tailwind-merge, lucide, Radix menu/toast/tooltip/dialog | ~14 % | yes (the app shell uses them) |

**Why Zod was there:**
1. `constants/env.ts` and `services/devicePreferences.ts` (both run at startup) used Zod for a few simple checks.
2. `@/features/auth`'s public index re-exported `ChangePasswordForm`. Its schema module calls `z.object(...)` at
   module level, so the bundler must keep it (a top-level call might have side effects), even though only the
   lazy Settings page uses it. The app shell imports that index for `useAuth`, so the form and Zod came along.

**Fixes:**
1. Plain checks in `env.ts` and `devicePreferences.ts`. Identical behaviour; the existing tests are unchanged and pass.
2. **Account-management UI moved to the settings feature:** `ChangePasswordForm`, `SessionsCard` and
   `ResendConfirmationButton` now live in `features/settings/components`, with the change-password schema in
   `features/settings/schemas`. The shared `passwordsMatch` helper moved to `src/schemas/common.ts`. The auth index
   now exports only the mutation hooks and the cooldown constant (no Zod).

**Lesson:** a feature's public index is part of every bundle that imports *anything* from it. Keep it free of
modules with top-level side effects (schemas, registrations).

### 2.3 Results
| | Before | After |
|---|---|---|
| Entry file (min / gzip) | 742 / **236 KB** | 605 / **195 KB** |
| JS for `/dashboard` (signed in, cold) | 357 KB | **318 KB** |
| JS for `/login` (cold) | 233 KB | 233 KB (needs its form code either way, now in a separate chunk) |
| Duplicate API requests (8 pages) | none | none |

**Timings** (median of 3, two alternating rounds):

| | Before | After |
|---|---|---|
| `/login`: LCP | 3.6 s / 4.2 s | 3.0 s / 3.7 s |
| `/dashboard`: LCP | 4.0 s / 3.5 s | 4.1 s / 3.0 s |

The trend favours the new build, but **the run-to-run noise (±1 s on this busy machine) is as large as the
difference**. The byte savings are the reliable result. A first measurement (7.2 s before) was an outlier, found
by re-measuring before reporting it.

### 2.4 Remaining options (not done: no measurement justifies them yet)
| Option | Expected effect | Cost |
|---|---|---|
| Preload the first route's chunk (`<link rel="modulepreload">` for `/login` and `/dashboard`) | removes one request round trip (≈ 150 ms on slow 4G) | a small Vite plugin or manual entries |
| Separate vendor chunk (`manualChunks` for react/router) | better **cache reuse across deployments**, not a faster first load | config |
| Smaller validation library on forms (`zod/mini`) | ~40–60 KB less on form pages | rewrite every schema |
| Brotli at the host | ~15–20 % smaller transfers than gzip | hosting config (Phase 17) |

The Vite "chunk larger than 500 kB" warning stays: the entry is the framework itself (605 KB minified, 195 KB gzip).

## 3. Security

### 3.1 Checks
| Risk | Check | Result |
|---|---|---|
| XSS | search for `dangerouslySetInnerHTML`, `innerHTML`, `insertAdjacentHTML`, `eval`, `new Function` | **none**; React escapes all text |
| Links from data | `href` built from data | only `mailto:${email}` (prefix fixed; can't become `javascript:`) |
| Reverse tabnabbing | `target="_blank"` | none |
| Open redirect | `returnUrl` | same-origin paths only (Phase 6, tested with `https://evil…`, `//evil…`, `/\evil…`) |
| Secrets in the bundle | source and committed `.env*` | only the public API URL and app name |
| Source maps in production | Vite default | not generated |
| Token leakage | errors logged by error boundaries | `ApiError` carries no request or config. **New test:** a failed request's error, fully serialized, contains neither the token nor "Authorization" |
| What the browser stores | `localStorage` keys | `tms.refreshToken`, `tms.theme`, `tms.sidebar`, `tms.preferences`: no personal data except the token |
| CSRF | API auth | bearer tokens in a header, no cookies, so not applicable |
| Dependencies | `npm audit` | **0** vulnerabilities |

### 3.2 Recommended headers: `deploy/security-headers.json`
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-…'; style-src 'self' 'unsafe-inline';
  img-src 'self' data:; font-src 'self'; connect-src 'self' {API_ORIGIN}; object-src 'none';
  base-uri 'self'; form-action 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Strict-Transport-Security: max-age=31536000; includeSubDomains   (HTTPS only)
```
- **Scripts are strict:** `'self'` plus the hash of the one inline script (theme bootstrap, Phase 4). No `'unsafe-inline'`
  and no `'unsafe-eval'`.
- **Styles allow inline.** Radix (dialogs, scroll lock) and other libraries inject style elements and attributes at
  runtime, and a static host can't issue per-request nonces. Inline *styles* are a much smaller risk than inline
  scripts, so this is accepted.
- `frame-ancestors 'none'` stops clickjacking (it replaces `X-Frame-Options`).

### 3.3 The policy is tested, not just written
`tests/e2e/security-headers.spec.ts` (Playwright project **security**, part of `npm run test:e2e`):
1. The policy's script hash must equal the SHA-256 of the inline script in `index.html`, so changing one without
   the other fails the build.
2. A **fresh build** (port 4173, never a reused dev server, because the dev server injects inline scripts) is
   served with the policy. Pages, a dialog, a form submit and a menu are opened, and **any violation fails**.

**Found by this test:** Zod 4 probes `new Function` once (a speed optimisation) and reports a CSP violation. It
falls back gracefully, but a clean policy shouldn't report violations. Fixed with `z.config({ jitless: true })` in
`src/schemas/common.ts`, which every form imports. I proved it's required by disabling it: the test then fails
with `script-src blocked eval`.

### 3.4 Decision for you: the refresh token in `localStorage`
**Today:** the access token lives in memory only, and the refresh token (7 days) lives in `localStorage` so a reload
or a new tab can restore the session (Phase 1/7). The backend rotates refresh tokens and **detects reuse**: a revoked
token used again revokes all of that user's sessions.

**The risk:** if an attacker ever gets JavaScript running in the page (XSS), they can read the refresh token and use
it from elsewhere until it's revoked or rotated. Reuse detection limits this: the first time either party
refreshes, the other's token becomes "reused", and every session ends.

| Option | Protects the refresh token from XSS | Needs | Trade-offs |
|---|---|---|---|
| **A. Keep `localStorage`** (now) | no (mitigated by rotation + reuse detection, short access tokens, the CSP above) | nothing | simplest; works across origins |
| **B. HttpOnly cookie for the refresh token** | **yes**: JavaScript can't read it | **backend:** set/clear a `Secure; HttpOnly; SameSite` cookie on login/refresh/logout and read it on refresh; CORS with credentials for the frontend origin; CSRF protection for the refresh endpoint (SameSite=Strict on the same site, or an anti-forgery header). **Frontend:** `withCredentials` on auth calls, drop the token from storage, adapt cross-tab sync | more moving parts; cross-site deployments need SameSite=None (CSRF then matters more) |

**Recommendation:** **B** if the frontend and API will be served from the **same site** (e.g. `app.example.com` and
`api.example.com`), because SameSite cookies then make it straightforward and close the XSS token-theft path.
Otherwise stay with **A**, with the CSP above, which mainly reduces the chance of XSS in the first place. **XSS is
the real enemy either way:** with B, injected script still acts *as* the user while the page is open.

Implementing B changes the backend contract, so it isn't done without your decision. It would fit as a small
backend change plus a frontend update, before or during deployment (Phase 17).

## 4. Files

| File | Change |
|---|---|
| `src/constants/env.ts`, `src/services/devicePreferences.ts` | plain validation (no Zod at startup) |
| `src/features/settings/components/{ChangePasswordForm,SessionsCard,ResendConfirmationButton}.tsx` | moved from auth |
| `src/features/settings/schemas/changePasswordSchema.ts` | moved from auth |
| `src/features/auth/index.ts` | exports hooks + constant instead of components |
| `src/schemas/common.ts` | + `passwordsMatch`; `z.config({ jitless: true })` |
| `deploy/security-headers.json` | recommended headers |
| `tests/e2e/security-headers.spec.ts`, `playwright.config.ts`, `package.json` | **security** project on a fresh build (:4173); `test:e2e` runs it |
| `tests/e2e/support/fakeApi.ts` | CORS echoes the page's origin (app on :3000 or :4173) |
| `tests/unit/api/interceptors.test.ts` | token-leak regression test |

## 5. Interview questions
1. Why can importing one hook from a feature's index pull a whole form library into the entry bundle?
2. How do you attribute bundle bytes to dependencies without a bundle-analyzer plugin?
3. Why measure before and after alternately, and report medians?
4. What does a CSP hash protect, and why must it be tested against a real build?
5. Why is `'unsafe-inline'` acceptable for styles but not for scripts?
6. What does refresh-token rotation with reuse detection protect against, and what not?
7. HttpOnly cookies remove token theft by XSS. Why is XSS still dangerous?
8. Why can't a static host use CSP nonces?

## 6. Practical exercises
1. Add `modulepreload` for the dashboard chunk and measure LCP before and after (use the method in §2.1).
2. Apply `deploy/security-headers.json` in a local reverse proxy (or `vite preview` middleware) and check it with the
   browser's Security panel.
3. Sketch the backend changes for option B (§3.4): endpoints, cookie attributes, CORS, CSRF.
4. Change one character of the inline theme script and run `npm run test:e2e`. Which test fails, and why is that
   good?
