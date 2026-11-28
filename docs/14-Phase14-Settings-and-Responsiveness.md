# Phase 14 — Settings and Responsiveness

> Status: **✅ Verified — approved 2026-11-28**. Builds on [Phase 13 — Team and user management](13-Phase13-Team-and-User-Management.md).
> Try it: **Settings** (sidebar or account menu): Account, Security, Appearance, Preferences.

## 1. What this phase does, in simple words

- **Settings**, all four tabs:
  - **Account:** your email and whether it's verified, with a "Resend confirmation email" button.
  - **Security:** change password and signed-in sessions (built in Phases 6–7).
  - **Appearance:** theme, and reduce motion.
  - **Preferences:** rows per page and how long notifications stay.
- **Responsiveness:** every page checked on phone, tablet and desktop, automatically and by eye, with fixes.

## 2. What the backend offers (and doesn't)

| Need | Backend | Decision |
|---|---|---|
| Resend confirmation | `POST /api/account/resend-confirmation` `{email}` (same answer whether or not it sent) | Account tab button, 60 s cooldown (as after registration), neutral message |
| Change password, sessions | `change-password`, `logout-all` | Already built (Phase 6–7), now on the Security tab |
| Change email, delete account | **none** | Said plainly: "can't be changed"; "ask an administrator to deactivate it" |
| User settings / notifications | **none** | **Device preferences** in `localStorage`, labelled "Saved in this browser only" (Phase 1 gap G4) |

## 3. How it works

### 3.1 Device preferences
- `services/devicePreferences.ts` stores `{ pageSize, toastDuration, motion }` under `tms.preferences`.
- **Validated field by field when read:** a corrupt, old or tampered value only resets the field that's wrong,
  never the whole set, and never breaks the app. Blocked storage (private mode) falls back to the defaults.
- `PreferencesProvider` saves every change, **follows other tabs** (the `storage` event), and applies
  **reduce motion** as a class on `<html>`. `styles/index.css` uses the same rules as the operating system's
  `prefers-reduced-motion`.
- **Where each preference applies:**

| Preference | Effect |
|---|---|
| Rows per page (10/20/50/100) | default page size of task and user tables; a `?size=` in the link still wins, and the preference isn't written into links |
| Notifications (short/normal/long) | multiplies each toast's duration (errors still stay longest) |
| Motion (follow device / reduce) | turns animations and transitions off app-wide |

### 3.2 Account tab and the banner
- Unverified users see why actions are blocked, plus the resend button with its cooldown and a neutral
  message.
- **One place to resend.** The layout's "Please verify your email address" banner now links to
  Settings › Account ("Resend the email"), and hides the link on that page itself. Two buttons with two separate
  cooldowns would have allowed double sends.

### 3.3 Appearance controls
`ChoiceGroup` is a fieldset of **native radio buttons** drawn as cards: one tab stop, arrow keys inside, and
"1 of 3" read out with no custom ARIA. The focus ring is shown on the card (`has-[:focus-visible]`).

### 3.4 Responsiveness sweep
`e2e/responsive.spec.ts` opens **22 pages** on each project (phone, tablet, desktop) as an Admin who owns a project
with tasks, and asserts for every page:
- **no sideways page scrolling** (`scrollWidth ≤ innerWidth`); only inner scrollers such as the board may scroll;
- **axe** with WCAG 2.2 AA, which includes **target size (minimum) 24 × 24 px**.

It collects every problem and fails once with the full list, so one run shows everything.

Screenshots were also reviewed by eye. Two layout problems were found that automated checks can't see (§5).

## 4. Files

| File | Responsibility |
|---|---|
| `src/services/devicePreferences.ts` | storage, per-field validation, defaults, toast factors |
| `src/contexts/preferences/*` (new) | provider (save, cross-tab sync, reduce-motion class), `usePreferences` |
| `src/contexts/toast/ToastProvider.tsx` | duration × preference |
| `src/styles/index.css` | `html.reduce-motion` rules |
| `src/features/settings/components/*` | `AccountSettings`, `AppearanceSettings`, `PreferenceSettings`, `ChoiceGroup` |
| `src/features/settings/pages/SettingsPage.tsx` | the four tabs (each its own URL) |
| `src/features/auth/components/ResendConfirmationButton.tsx`, `constants.ts` | resend with cooldown (constant shared with registration) |
| `src/app/layouts/AppLayout.tsx` | banner link to Settings › Account |
| `src/features/tasks/components/TaskList.tsx`, `src/features/users/pages/AdminUsersPage.tsx` | page size from preferences |
| `src/features/tasks/pages/TaskDetailsPage.tsx` | details first on phones (§5) |
| `tests/e2e/responsive.spec.ts`, `tests/e2e/support/fakeUsers.ts` | the sweep; shared users fake |
| `vite.config.ts` | Vitest `maxWorkers: '50%'` (§5) |

## 5. Problems found and fixed

| # | Found by | Problem | Fix / lesson |
|---|---|---|---|
| 1 | Screenshot (phone) | **Admin › Users:** deactivated / unverified accounts looked like everyone else on phones (Status column hidden) | Badges under the email below md |
| 2 | Screenshot (phone) | **Task page:** assignee and due date came after the whole discussion | Details first in the page order; on large screens it is placed in the right column with grid placement, so the reading order still matches what phones show |
| 3 | Design review | Two resend buttons (banner + Account tab) with separate cooldowns | A single button; the banner links to it |
| 4 | Writing the button | A constant imported from a **page** would pull that page into another chunk | Moved to `features/auth/constants.ts` |
| 5 | Extra test run | A Phase 8 dashboard test timed out once (10.4 s) on a busy machine; a default-worker run then had 3 timeouts | **Measured** default vs. 50 % vs. 8 workers: only the default failed (1 of 2 runs), the caps passed 4 of 4 at similar speed. Vitest now uses `maxWorkers: '50%'` (same lesson as Playwright in Phase 10) instead of longer timeouts |

The automated sweep found **no** sideways scrolling and **no** axe violations (target size included) on any of the
22 pages × 3 viewports. The board overflow fixed in Phase 12 and the filter folding from Phase 11 hold.

## 6. Tests

| Level | File | Tests | Covers |
|---|---|---|---|
| Unit | `services/devicePreferences` | 3 | defaults for nothing/garbage, per-field fallback, storage round trip |
| Unit | `contexts/preferences` | 3 | save + reduce-motion class + reset; another tab's change; defaults outside the provider |
| Integration | `settings.test.tsx` | 6 | verified account; **resend** (exact body, toast, 60 s cooldown); **banner → Account**, link hidden there; theme + reduce motion (classes, storage); **rows per page → task query, URL wins, reset**; notification duration + sample |
| Updated | `users.test.tsx` | — | "Deactivated" now shown for both screen sizes |
| **Vitest total** | 65 files | **487** (+12) | ✅ (verify ×2 after the worker cap: 26 s idle, 67 s busy machine) |
| E2E (UI) | `responsive.spec.ts` | 1 × 3 | **22 pages**: no sideways scroll, axe incl. target size |
| **Playwright UI total** | | **142** (+2 skipped by design) | ✅ 2 consecutive runs |
| E2E (real API) | `backend/settings.backend.spec.ts` | 1 | unverified → banner → Account → **real resend** → cooldown → **newest email link** → confirmed → "Verified", no banner, profile editable |
| **Real API total** | | **9 passed, 5 skipped** | ✅ |

## 7. Common mistakes and best practices

| Mistake | Better |
|---|---|
| Pretending device settings are account settings | Say "saved in this browser only" |
| Discarding all preferences when one is invalid | Validate and fall back per field |
| Ignoring the OS motion setting, or offering only it | Respect the OS, and offer an in-app override |
| Hiding a column that carries meaning on phones | Move the meaning into the visible cell |
| Visual order ≠ reading order | Change the DOM order, then place on large screens |
| Two buttons for the same rate-limited action | One button, one cooldown |
| Checking responsiveness on one page by eye | Sweep every page on every viewport, automatically, and also look |

## 8. Interview questions
1. What belongs in `localStorage` and what must never go there?
2. How do you keep a preference in sync across tabs?
3. Why validate stored preferences field by field?
4. What does WCAG 2.2 "target size (minimum)" require, and how is it tested here?
5. What's the difference between CSS `order` and changing the DOM order, for accessibility?
6. How do you detect sideways scrolling in an automated test?
7. Why should a resend button have a cooldown, and why a neutral success message?

## 9. Practical exercises
1. Add a "Compact tables" preference that reduces row padding. Where would the class go?
2. Store preferences per signed-in user on the same device. What changes in the key, and why?
3. Make the sweep also run in dark mode.
4. Add "Start page" (Dashboard or My tasks) as a preference and use it after sign-in.
5. Propose the backend endpoint that would let users change their email safely (think re-verification).
