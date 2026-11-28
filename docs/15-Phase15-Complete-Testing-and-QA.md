# Phase 15 — Complete Testing and QA

> Status: **✅ Verified — approved 2026-11-28**. Builds on [Phase 14 — Settings and responsiveness](14-Phase14-Settings-and-Responsiveness.md).
> This phase adds no features. It measures what is tested, closes the gaps that matter, hunts unstable tests, and
> records what is **not** proven.

## 1. Summary

| Area | Result |
|---|---|
| Unit + integration (Vitest) | **497 tests** (+10), 67 files; coverage **94.5 % lines, 89.2 % branches** (§3) |
| End-to-end, UI (Playwright, faked API) | 12 specs × 3 viewports: **142 passed** (+2 skipped by design), twice in a row |
| End-to-end, real API | 10 specs, 15 tests: **9 run always**, **6 need an Admin account** (§5) |
| Real bugs found this phase | **1**: a second token refresh caused by a late 401 (§4.1) |
| Unstable tests found | 2, both explained and fixed (§4.2) |

## 2. How to run everything

| Command | What | Needs |
|---|---|---|
| `npm run verify` | type-check, lint, format, all Vitest tests, production build | nothing |
| `npx vitest run --coverage` | the same tests with a coverage report (`coverage/index.html`) | nothing |
| `npm run test:e2e:install` then `npm run test:e2e` | UI end-to-end on desktop, tablet, phone (Playwright starts a build on :3000, or reuses a server already there) | nothing |
| `npm run test:e2e:backend` | real flows against the API | the API on :5075 **not** under the debugger (it stalls there, see Phase 8); creates `e2e-…@example.test` users |
| with `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` set | also the 6 Admin flows, including the full two-person journey | a verified Admin account (env vars only, nothing stored) |

## 3. Coverage: what the numbers said, and what was done

The first report gave **93.8 % lines and 88.0 % branches** overall. Most files sat at 85–100 %. The gaps were concentrated:

| File | Before | Why it mattered | Action |
|---|---|---|---|
| `features/board/components/KanbanBoard.tsx` | 52 % lines, 34 % branches | the **drop rules** (forbidden drop = no API call), keyboard column jumping and screen-reader messages were proven only by E2E | Pure decisions moved to `features/board/boardDnd.ts` (`nextColumn`, `shouldMove`, `dropState`, `announce`) with unit tests; the component now only wires dnd-kit |
| `features/tasks/components/TaskList.tsx` | 80 % | row-menu edit/delete and paging/page size untested below E2E | integration tests added |
| `features/design-system/pages/DesignSystemPage.tsx` | 72 % | development-only style guide, not shipped | left as is (covered by its axe E2E) |
| `components/charts/HorizontalBarChart.tsx` | 50 % | the hover tooltip needs real layout (jsdom has none) | covered by the dashboard E2E ("tooltip when hovering a bar") |

Coverage is a map of untested code, not a goal. Lines were added only where a behaviour was unproven.

## 4. Findings

### 4.1 Bug: a late 401 started a second token refresh
**Found by** a new integration test through a real page: the project overview sends six task-count requests at
once, and the access token has expired in between.

**What happened:** the first 401 starts the refresh, which finishes and stores the new token. A slower 401 from
the same batch arrives **after** that. The interceptor treated it as a new expiry and refreshed **again**. That
rotates the refresh token for nothing and, with several tabs open, raises the chance of the backend detecting
"reuse" and revoking the session. Phase 7's tests covered 401s that all arrive *before* the refresh ends, but not
this ordering. It failed 1 run in 5 at first; a loop reproduced it on the 2nd run.

**Fix** (`src/api/interceptors.ts`): if the failed request was sent with a token that is **no longer the current
one**, someone already refreshed, so retry once with the current token and don't refresh. A deterministic unit
test (the second 401 is held until the refresh has finished) failed before the fix and passes after. The page-level
test then passed 15 times in a row.

### 4.2 Unstable tests
| Test | Symptom | Cause | Fix |
|---|---|---|---|
| new parallel-refresh test | 1 of 5 runs | the bug in §4.1 (not the test) | fixed in the code |
| dashboard "figures cover all projects" (Phase 8) | timeout on a busy machine | Vitest worker oversubscription | Phase 14: `maxWorkers: '50%'` (measured) |
| one unnamed failure under `--coverage` | 1 of 4 coverage runs, name not captured | most likely the same race (it was not yet fixed then) | Coverage and the full suite were run repeatedly afterwards and recorded in §6 |

**Stability runs:** the full Vitest suite 5× in a row before the fix: 4 clean runs, 1 failure (the §4.1 race).
After the fix, see §6.

## 5. Real API: what is proven, and what isn't

| Spec | Always (regular user) | Needs Admin |
|---|---|---|
| auth-flow | register → confirm (email link) → sign in → change password → sign in → reset password | |
| session | reload, second tab, cross-tab sign-out, sign out everywhere | |
| dashboard | real figures | |
| categories | read; **API 403** on write | create, **409**, rename, delete |
| projects | empty list, **404 page**, **API 403** on create and lookup | create, **409**, member add/remove, delete |
| tasks | **403 unverified → 404 foreign project** | create + assign in UI, **real 409**, workflow, cleanup |
| board-comments | **403 → 404** for comments | real board move, member comment, **Admin can't edit (403)**, moderation delete |
| users | **own 200 / other 403 / directory 403 / PUT me 403**; profile after confirming | **self-demotion 422**, roles, **deactivate → login 401**, reactivate |
| settings | banner → resend → newest link → verified | |
| **journey** (new) | | **two people end to end:** register, confirm, Manager role, project, member, task assigned, board move, comment, sign out |

**The 6 Admin-gated tests have never run against the real API**, because no Admin credentials were provided.
They are written against the contract read from the backend, and every UI step they use is exercised by the
faked-API E2E suites. Running them once with an Admin account is the most valuable remaining check.

## 6. Final runs

| Check | Result |
|---|---|
| `npm run verify` | ✅ 497/497, lint/format/type-check clean, production build OK |
| Vitest stability after the fix | ✅ **5 of 5** full runs clean (before: 4 of 5) |
| Coverage | ✅ 94.5 % lines · 89.2 % branches · 92.2 % functions (from 93.8 / 88.0); `boardDnd.ts` 100 % lines, `interceptors.ts` 100 % lines; `KanbanBoard.tsx` now only dnd-kit wiring (57 %, covered by E2E) |
| Playwright UI | ✅ 142 passed, 2 skipped (pointer drag on tablet/phone by design), 2 consecutive runs |
| Real API (own instance, not under the debugger) | ✅ **9/9** always-run tests passed · 6 skipped (Admin credentials not provided) |

During the phase, the API on :5075 was for a while the Visual Studio debug session and did not answer (time-outs).
I left it alone and ran the real-API suite once it had ended, against a normally started instance.

## 7. Known limitations (by design or by backend)

| Limitation | Why | Where noted |
|---|---|---|
| User lookup can't match a full name ("Mira Tester") | backend matches first, last or email separately | docs/10 exercise 6 |
| No comment counts on cards, no attachments | not in any DTO (gap G6) | docs/01, docs/12 |
| Role changes reach open sessions within ≤ 15 min | roles are read when a token is issued | docs/13 |
| Team covers the first 100 projects | API page-size limit | docs/13 |
| Due date vs project end compares the **UTC** date | backend rule; the form warns before sending | docs/11 |
| Email can't be changed, accounts can't be self-deleted | no endpoints | Settings › Account |
| Preferences are per browser | no server-side user settings (gap G4) | Settings › Preferences |
| Real-API tests can't run against the API under the Visual Studio debugger | requests stall there | docs/08, this doc §2 |

## 8. Interview questions
1. What does a coverage report tell you, and what can't it tell you?
2. How would you find a race condition that fails 1 run in 5?
3. Why test token refresh through a real page as well as in unit tests?
4. Why move decision logic out of a drag-and-drop component?
5. A test passes alone and fails in the full run. List three possible causes and how to tell them apart.
6. Which tests should run against the real backend, and which against fakes? Why both?

## 9. Practical exercises
1. Run `npm run test:e2e:backend` with an Admin account and record which of the 6 gated tests pass.
2. Write a test for two TABS refreshing at the same moment (Web Locks). Which tool can simulate two tabs?
3. Add a coverage threshold to `vite.config.ts`. Which number would you choose, and why not 100 %?
4. Make the stability loop part of a nightly CI job. What would you do with a test that fails 1 in 50?
