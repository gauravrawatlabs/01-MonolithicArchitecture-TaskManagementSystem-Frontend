# Frontend Progress Tracker

Statuses: Pending · In Progress · Implemented · Testing · Verified · Blocked

| # | Phase | Status | Tests written | Tests passed | Build | Notes |
|---|---|---|---|---|---|---|
| 1 | Requirements and UI/UX design | **Verified** (2026-11-26) | — (design only) | Backend: 188/188 after G1/G2 | — | [01-Phase1-Requirements-and-UI-Design.md](01-Phase1-Requirements-and-UI-Design.md) |
| 2 | Frontend architecture | **Verified** (2026-11-26) | — (design only) | — | — | [02-Phase2-Frontend-Architecture.md](02-Phase2-Frontend-Architecture.md); D1–D6 approved |
| 3 | Project setup | **Verified** (2026-11-26) | 8 unit · 1 integration · 1 e2e (×3 viewports) | 9/9 + 3/3 | ✅ | [03-Phase3-Project-Setup.md](03-Phase3-Project-Setup.md); D7 = A (implemented) |
| 4 | Design system and common components | **Verified** (2026-11-26) | 102 unit/integration · 6 e2e (×3 viewports) | 102/102 + 18/18 | ✅ | [04-Phase4-Design-System-and-Common-Components.md](04-Phase4-Design-System-and-Common-Components.md) |
| 5 | Application layout and navigation | **Verified** (2026-11-26) | 52 new Vitest (154 total) · 13 e2e ×3 | 154/154 + 39/39 | ✅ | [05-Phase5-Layout-and-Navigation.md](05-Phase5-Layout-and-Navigation.md) |
| 6 | Authentication UI | **Verified** (2026-11-26) | 89 new Vitest (243 total) · 10 e2e ×3 · 1 real-API flow | 243/243 + 69/69 + 1/1 | ✅ | [06-Phase6-Authentication-UI.md](06-Phase6-Authentication-UI.md) |
| 7 | Authentication and API integration | **Verified** (2026-11-26) | 38 new Vitest (281 total) · 3 e2e ×3 · 1 real-API session flow | 281/281 + 78/78 + 2/2 | ✅ | [07-Phase7-Sessions-and-API-Integration.md](07-Phase7-Sessions-and-API-Integration.md) |
| 8 | Dashboard | **Verified** (2026-11-27) | 37 new Vitest (318 total) · 5 e2e ×3 · 1 real-API | 318/318 + 93/93 + 3/3 | ✅ | [08-Phase8-Dashboard.md](08-Phase8-Dashboard.md) |
| 9 | Category management | **Verified** (2026-11-27) | 19 new Vitest (337 total) · 3 e2e ×3 · real-API 1 (+1 admin, skipped) | 337/337 + 102/102 + 4/4 (1 skipped) | ✅ | [09-Phase9-Category-Management.md](09-Phase9-Category-Management.md) |
| 10 | Project management | **Verified** (2026-11-27) | 36 new Vitest (373 total) · 3 e2e ×3 · real-API 1 (+1 admin, skipped) | 373/373 + 111/111 (×3) + 5/5 (2 skipped) | ✅ | [10-Phase10-Project-Management.md](10-Phase10-Project-Management.md) |
| 11 | Task management | **Verified** (2026-11-28) | 56 new Vitest (429 total) · 3 e2e ×3 · real-API 1 (+1 admin, skipped) | 429/429 + 120/120 (×2) + 6/6 (3 skipped) | ✅ | [11-Phase11-Task-Management.md](11-Phase11-Task-Management.md) |
| 12 | Kanban board and comments | **Verified** (2026-11-28) | 25 new Vitest (454 total) · 4 e2e ×3 · real-API 1 (+1 admin, skipped) | 454/454 + 130/130 (×2, 2 skipped) + 7/7 (4 skipped) | ✅ | [12-Phase12-Kanban-Board-and-Comments.md](12-Phase12-Kanban-Board-and-Comments.md) |
| 13 | Team and user management | **Verified** (2026-11-28) | 21 new Vitest (475 total) · 3 e2e ×3 · real-API 1 (+1 admin, skipped) | 475/475 (×3) + 139/139 (×2, 2 skipped) + 8/8 (5 skipped) | ✅ | [13-Phase13-Team-and-User-Management.md](13-Phase13-Team-and-User-Management.md) |
| 14 | Settings and responsiveness | **Verified** (2026-11-28) | 12 new Vitest (487 total) · responsive sweep (22 pages × 3) · real-API 1 | 487/487 + 142/142 (×2, 2 skipped) + 9/9 (5 skipped) | ✅ | [14-Phase14-Settings-and-Responsiveness.md](14-Phase14-Settings-and-Responsiveness.md) |
| 15 | Complete testing and QA | **Verified** (2026-11-28) | 10 new Vitest (497 total) · real-API journey (+1, admin) | 497/497 (5 stable runs) + 142/142 (×2) + 9/9 (6 skipped) | ✅ | [15-Phase15-Complete-Testing-and-QA.md](15-Phase15-Complete-Testing-and-QA.md) |
| 16 | Performance and security review | **Verified** (2026-11-28) | 1 new Vitest (498 total) · CSP e2e (2) | 498/498 + 144/144 (×2, 2 skipped) + 9/9 (6 skipped) | ✅ | [16-Phase16-Performance-and-Security-Review.md](16-Phase16-Performance-and-Security-Review.md) · refresh token storage: **option A kept** (no change chosen yet, 16 §3.4) |
| 17 | Deployment and GitHub | Testing complete (awaiting approval) | 6 new Vitest (507 total) · Docker/nginx/sub-path verified in containers and browsers | 507/507 + 144/144 + Docker checks | ✅ | [17-Phase17-Deployment-and-GitHub.md](17-Phase17-Deployment-and-GitHub.md) · CI first runs on GitHub after the push |

## Phase 1 — Requirements and UI/UX design

- **Tasks completed**
  - Inspected the backend contract: 8 controllers, 41 endpoints, DTOs, validators, authorization handlers,
    task status workflow, CORS, ProblemDetails error format, email-link URLs.
  - Reviewed the 4 reference designs (dashboard, projects, tasks board, profile/settings).
  - Produced the page inventory, user journeys, navigation diagram, wireframes, design system, layouts for
    dashboard / projects / tasks / Kanban / auth / admin, the responsive strategy, the role visibility matrix,
    the API integration plan and the testing strategy.
  - All 7 decisions approved (§16 of the design doc).
- **Backend changes made for this phase** (backend repo, `docs/16-Frontend-Support-Endpoints.md`)
  - G1: `GET /api/users/lookup` (Admin/Manager, verified): find active users for the member picker.
  - G2: `openTaskCount`, `doneTaskCount`, `completionPercent` on `GET /api/projects` items.
  - +21 backend tests; backend total 151 unit + 37 integration, all passing.
- **Files created:** `README.md`, `.gitignore`, `docs/00-Progress-Tracker.md`, `docs/01-Phase1-Requirements-and-UI-Design.md`
- **Pending issues:** none.
- **Final verification status:** ✅ Verified, approved by the project owner on 2026-11-26.

## Phase 2 — Frontend architecture

- **Tasks completed:** React and component architecture explained; feature-first folder structure with the
  responsibility of every folder and important file; dependency rules; routing strategy (route tree, guards,
  lazy loading, URL state, safe `returnUrl`); state management (5 kinds of state, decision flow); authentication
  architecture (status machine, single-flight + cross-tab refresh); API layer (generated types, query keys,
  mutation patterns, `ApiError`); reusable component, forms, error handling, testing and convention rules.
- **Decisions approved:** D1 generated OpenAPI types · D2 Radix UI primitives · D3 extra packages ·
  D4 feature-first + ESLint boundaries · D5 TanStack Query as the only data cache · D6 `tests/unit|integration|e2e`.
- **Files created/modified:** `docs/02-Phase2-Frontend-Architecture.md`, `docs/00-Progress-Tracker.md`, `README.md`
- **Pending issues:** none.
- **Final verification status:** ✅ Verified, approved by the project owner on 2026-11-26.

## Phase 3 — Project setup

- **Tasks completed:** Vite 8 + React 19 + TypeScript 5.9 project; Tailwind CSS 4; ESLint 10 (strict type-aware,
  React hooks, jsx-a11y, no-console, architecture boundaries) and Prettier; all approved dependencies installed
  (0 vulnerabilities); validated environment configuration; dev/preview server on port 3000; Vitest + Testing Library
  + MSW setup; Playwright with desktop/tablet/mobile projects; API types generated from the backend OpenAPI document.
- **Files created:** see [03-Phase3-Project-Setup.md §3](03-Phase3-Project-Setup.md#3-every-file-created-in-this-phase).
- **Tests written:** `tests/unit/constants/env.test.ts` (8), `tests/integration/app.test.tsx` (1), `tests/e2e/smoke.spec.ts` (1 × 3 viewports).
- **Tests passed:** Vitest 9/9 · Playwright 3/3.
- **Build status:** ✅ `npm run build` (JS 91.6 kB gzip); typecheck, lint, format all clean.
- **Decision D7 (A):** backend switched to `JsonNumberHandling.Strict` (+2 backend tests, 190/190 passing); API types regenerated, now 0 `number | string` fields.
- **Pending issues:** none.
- **Final verification status:** ✅ Verified, approved by the project owner on 2026-11-26.

## Phase 4 — Design system and common components

- **Tasks completed:** design tokens for light/dark (WCAG AA verified by axe); Tailwind v4 theme mapping; no-flash
  theme script + ThemeProvider (light/dark/system, live OS changes); 17 primitives, 2 form helpers, 6 feedback
  components, DataTable + Pagination; Theme and Toast contexts; task status/priority metadata and badges;
  design system showcase page.
- **Files created/modified:** see [04 §4](04-Phase4-Design-System-and-Common-Components.md#4-component-catalogue).
- **Tests written:** 15 Vitest files (102 tests), `e2e/design-system.spec.ts` (5 tests × 3 viewports).
- **Tests passed:** Vitest 102/102 (≈ 91 % line coverage) · Playwright 18/18.
- **Build status:** ✅ `npm run verify` passes.
- **Defects found and fixed:** Modal focus return, 2 contrast failures, nullish-vs-OR logic, autoFocus, toggle ARIA
  (details in 04 §5).
- **Decision recorded:** Radix Select removed in favour of a styled native `<select>`.
- **Pending issues:** none.
- **Final verification status:** ✅ Verified, approved by the project owner on 2026-11-26.

## Phase 5 — Application layout and navigation

- **Tasks completed:** full route tree with lazy pages (one chunk per page); RequireAuth / RequireGuest /
  RequireRole guards; open-redirect-safe returnUrl; responsive shell (drawer / rail / collapsible sidebar);
  top bar, breadcrumbs, page titles, skip link, user menu, verify-email banner; 404/403/route-error pages;
  placeholders for every page in the Phase 1 inventory; AuthProvider with its final interface plus a
  TEMPORARY development-only preview sign-in (removed in Phase 7).
- **Files created/modified:** see [05 §3](05-Phase5-Layout-and-Navigation.md#3-files).
- **Tests written:** 52 Vitest tests (navigation 24, returnUrl 13, permissions 9, routes 3, useMediaQuery 2, app 1); 7 new e2e tests.
- **Tests passed:** Vitest 154/154 (stable over 5 runs) · Playwright 39/39.
- **Build status:** ✅ `npm run verify`; production bundle verified free of dev-only code.
- **Defects found and fixed:** shared route objects, duplicate 404 heading, Label-in-Name, dev code in prod, a Phase 4 report file committed by mistake (details in 05 §4).
- **Known follow-up:** main bundle 183.5 kB gzip, to be measured and reduced in Phase 16.
- **Pending issues:** none.
- **Final verification status:** ✅ Verified, approved by the project owner on 2026-11-26.

## Phase 6 — Authentication UI

- **Tasks completed:** login, register, check-your-email (resend + cooldown), forgot password, reset password,
  confirm email (exactly-once), change password (Settings › Security), sign out with server-side revocation;
  React Hook Form + Zod with rules mirrored from the backend; live password checklist; Axios client with a single
  `ApiError` model; server errors mapped onto fields; TanStack Query; tokens in memory (persistence/refresh: Phase 7).
- **Files created/modified:** see [06 §3](06-Phase6-Authentication-UI.md#3-files).
- **Tests written:** 89 Vitest tests (56 unit, 33 integration); `e2e/auth.spec.ts` (10 × 3); real-API flow
  `e2e/backend/auth-flow.backend.spec.ts`.
- **Tests passed:** Vitest 243/243 (stable ×3, ≈ 92 % lines) · Playwright UI 69/69 · real API 1/1.
- **Build status:** ✅ `npm run verify`.
- **Defects found and fixed:** sign-out navigation race, enabled-for-one-render resend button, asterisk inside
  label, jsdom CORS (fetch adapter), invalid `<ul>` in `<p>` (details in 06 §4).
- **Known follow-up:** main bundle 229.7 kB gzip (Phase 16). Real-API e2e adds one test user per run to the dev database.
- **Pending issues:** none.
- **Final verification status:** ✅ Verified, approved by the project owner on 2026-11-26.

## Phase 7 — Authentication and API integration

- **Tasks completed:** persistent sessions (refresh token in localStorage, access token in memory); silent
  startup restore; 401 → refresh → retry once (single-flight); proactive refresh before expiry; cross-tab
  Web Lock with re-read (no reuse revocation); cross-tab sign-out/sign-in; session-expired handling with
  returnUrl; offline startup with retry; email verification takes effect via token refresh; sign out of all
  devices; preview accounts removed.
- **Files created/modified:** see [07 §4](07-Phase7-Sessions-and-API-Integration.md#4-files).
- **Tests written:** 38 Vitest tests (25 unit, 13 integration); `e2e/session.spec.ts` (3 × 3); UI e2e migrated
  off preview accounts; real-API `e2e/backend/session.backend.spec.ts`.
- **Tests passed:** Vitest 281/281 (stable ×3) · Playwright UI 78/78 · real API 2/2.
- **Build status:** ✅ `npm run verify`.
- **Defects found and fixed:** `setTimeout` overflow causing immediate refresh, E2E fill race on lazy pages,
  Web Locks typing, navigator stub (details in 07 §5).
- **Design correction:** Phase 1's "adopt rotated tokens" → "serialize and re-read" (07 §3.2).
- **Pending issues:** none. Real-API e2e adds test users to the dev database; it ran against the owner's
  Visual Studio debug session.
- **Final verification status:** ✅ Verified, approved by the project owner on 2026-11-26.

## Phase 8 — Dashboard

- **Tasks completed:** KPI row, tasks by status / priority (single-hue horizontal bars, validated color, table view,
  keyboard tooltips), project progress meter list, upcoming deadlines, my overdue tasks, recently updated; loading,
  empty (per role), error and partial-error states; refresh; first TanStack Query reads (dashboard + tasks) with
  key factories; `Intl` date/number utilities; charts lazy-loaded.
- **Files created/modified:** see [08 §5](08-Phase8-Dashboard.md#5-files).
- **Tests written:** 37 Vitest tests (26 unit, 11 integration); `e2e/dashboard.spec.ts` (5 × 3); real-API dashboard spec.
- **Tests passed:** Vitest 318/318 (stable ×3, ≈ 93 % lines) · Playwright UI 93/93 · real API 3/3.
- **Build status:** ✅ `npm run verify`; dashboard chunk 8 kB, charts chunk 116 kB (lazy), main bundle unchanged (232 kB).
- **Defects found and fixed:** Recharts downloaded before the auth redirect, labels hidden for 1.5 s, KPI tiles
  wrapping at 1280 px, shadowed `window` (details in 08 §6).
- **Design change:** status donut → ordered horizontal bars (dataviz guidance, 08 §3).
- **Pending issues:** none. Known limitation: upcoming deadlines previews 20 tasks (single-status API filter).
- **Final verification status:** ✅ Verified, approved by the project owner on 2026-11-27.

## Phase 9 — Category management

- **Tasks completed:** category list (client-side search and sort kept in the URL), create/edit modal (Zod rules
  mirrored from the backend, 409 on the name field), delete confirmation with task count, admin-only controls with a
  visible reason for unverified admins, cache updates + invalidation (incl. task queries), atomic URL state hook.
- **Files created/modified:** see [09 §4](09-Phase9-Category-Management.md#4-files).
- **Tests written:** 19 Vitest tests (5 unit, 14 integration); `e2e/categories.spec.ts` (3 × 3, stateful fake API);
  real-API `e2e/backend/categories.backend.spec.ts` (regular user + optional admin flow).
- **Tests passed:** Vitest 337/337 (stable ×4, ≈ 94 % lines) · Playwright UI 102/102 · real API 4 passed, 1 skipped
  (admin flow needs `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`; option B).
- **Build status:** ✅ `npm run verify`; categories page chunk 4.8 kB gzip.
- **Defects found and fixed:** lost URL update (two setters), tooltip-on-span a11y issue, Phase 8 skeleton
  `aria-label` without role, UI e2e depending on a running backend (details in 09 §5).
- **Pending issues:** none.
- **Final verification status:** ✅ Verified, approved by the project owner on 2026-11-27.

## Phase 10 — Project management

- **Tasks completed:** paged project list (cards/table; server-side search, owned-by-me, sort, paging; all in the
  URL; debounced search), create/edit with date rules, delete with cascade warning, project page with tabs
  (overview with counts by status, members with an accessible user picker), breadcrumb/title show the project
  name, permissions for owner/Admin/member.
- **Files created/modified:** see [10 §4](10-Phase10-Project-Management.md#4-files).
- **Tests written:** 36 Vitest tests (15 unit, 21 integration); `e2e/projects.spec.ts` (3 × 3); real-API
  `e2e/backend/projects.backend.spec.ts` (regular user + optional admin flow).
- **Tests passed:** Vitest 373/373 (stable ×3) · Playwright UI 111/111 on 3 consecutive runs · real API 5 passed,
  2 skipped (admin flows need `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`).
- **Build status:** ✅ `npm run verify`.
- **Defects found and fixed:** breadcrumb-label render loop; progress formula (cancelled); contrast of the view
  toggle; deleted project flashing from cache; timing assumption in a Phase 7 test; E2E infrastructure (bundled
  build, 6 workers, axe waits for colour transitions). Details in 10 §5.
- **Pending issues:** none in the frontend. Backend observation (not changed): user lookup can't match a full name.
- **Final verification status:** ✅ Verified, approved by the project owner on 2026-11-27.

## Phase 11 — Task management

- **Tasks completed:** task lists (All, My tasks, project tab) with server-side search/filters/sort/paging in the
  URL; create/edit with local due dates converted to UTC and the API's date rules checked first; task page with
  workflow-based status moves, assignment, edit, delete; per-user actions mirroring the API (incl. verified email).
- **Files created/modified:** see [11 §4](11-Phase11-Task-Management.md#4-files).
- **Tests written:** 56 Vitest tests (36 unit, 20 integration); `e2e/tasks.spec.ts` (3 × 3); real-API
  `e2e/backend/tasks.backend.spec.ts` (regular user in two layers + optional admin flow).
- **Tests passed:** Vitest 429/429 · Playwright UI 120/120 on 2 consecutive runs · real API 6 passed, 3 skipped
  (admin flows need `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`).
- **Build status:** ✅ `npm run verify`.
- **Defects found and fixed:** missed verified-email rule for task writes; lost URL updates on quick successive
  changes (`useUrlState`); unnatural first sort direction; unchanged due date counted as changed; filters crowding
  phones. Details in 11 §5.
- **Pending issues:** none.
- **Final verification status:** ✅ Verified, approved by the project owner on 2026-11-28.

## Phase 12 — Kanban board and comments

- **Tasks completed:** project picker + per-project Kanban (one query per column, URL filters, Show cancelled,
  Load more); optimistic moves with rollback; pointer, touch (long-press) and keyboard dragging with
  announcements, plus a "Move to…" menu; "Not allowed" targets; focus follows the moved card. Comments: oldest
  first with Show more, add (Ctrl+Enter), author-only edit, delete by author/owner/Admin, verified email.
- **Files created/modified:** see [12 §4](12-Phase12-Kanban-Board-and-Comments.md#4-files).
- **Tests written:** 25 Vitest tests (9 unit, 16 integration); `e2e/board.spec.ts` (4 × 3); real-API
  `e2e/backend/board-comments.backend.spec.ts` (regular user + optional admin/member flow).
- **Tests passed:** Vitest 454/454 · Playwright UI 130/130 on 2 consecutive runs (2 skipped by design) · real API
  7 passed, 4 skipped (admin flows need `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`).
- **Build status:** ✅ `npm run verify`; the board (dnd-kit) is a lazy chunk of 17.8 kB gzip.
- **Defects found and fixed:** focus lost after a move; pickup announcement overwritten; page-wide sideways
  scrolling on the board (grid sizing + sr-only escaping overflow). Details in 12 §5.
- **Pending issues:** none.
- **Final verification status:** ✅ Verified, approved by the project owner on 2026-11-28.

## Phase 13 — Team and user management

- **Tasks completed:** profile (view + edit name/job title, header follows); Team from project memberships (G5)
  with member pages; Admin overview counts; Admin › Users directory (server-side filters/sort/paging in the URL);
  per-account roles editor and activate/deactivate, with self-protection and visible reasons.
- **Files created/modified:** see [13 §4](13-Phase13-Team-and-User-Management.md#4-files).
- **Tests written:** 21 Vitest tests (6 unit, 15 integration); `e2e/users.spec.ts` (3 × 3); real-API
  `e2e/backend/users.backend.spec.ts` (regular user + optional admin flow).
- **Tests passed:** Vitest 475/475 (×3) · Playwright UI 139/139 on 2 consecutive runs (2 skipped by design) ·
  real API 8 passed, 5 skipped (admin flows need `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`).
- **Build status:** ✅ `npm run verify`.
- **Defects found and fixed:** run-together accessible name on team cards (stretched link); a racy test. Details in 13 §5.
- **Pending issues:** none.
- **Final verification status:** ✅ Verified, approved by the project owner on 2026-11-28.

## Phase 14 — Settings and responsiveness

- **Tasks completed:** Settings with four tabs: Account (verification + resend with cooldown, single resend
  path via the banner), Security (from Phases 6–7), Appearance (theme, reduce motion), Preferences (rows per page,
  notification duration; device-only, validated per field, synced across tabs); responsiveness sweep of 22 pages ×
  3 viewports plus screenshot review and fixes.
- **Files created/modified:** see [14 §4](14-Phase14-Settings-and-Responsiveness.md#4-files).
- **Tests written:** 12 Vitest tests (6 unit, 6 integration); `e2e/responsive.spec.ts` (1 × 3, 22 pages each);
  real-API `e2e/backend/settings.backend.spec.ts`.
- **Tests passed:** Vitest 487/487 · Playwright UI 142/142 on 2 consecutive runs (2 skipped by design) · real API
  9 passed, 5 skipped (admin flows need `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`).
- **Build status:** ✅ `npm run verify` (twice after the Vitest worker cap).
- **Defects found and fixed:** account status invisible on phones; task details below the discussion on phones;
  double resend paths; Vitest worker oversubscription (measured). Details in 14 §5.
- **Pending issues:** none.
- **Final verification status:** ✅ Verified, approved by the project owner on 2026-11-28.

## Phase 15 — Complete testing and QA

- **Tasks completed:** coverage measured and gaps closed where behaviour was unproven (board drag rules extracted
  and unit-tested, task-list menu and paging); cross-cutting resilience tests through real pages (parallel 401s →
  one refresh, network failure + retry, slow response); stability runs; full two-person journey against the real
  API (Admin-gated); QA report with how-to-run, proven/unproven matrix and known limitations.
- **Files created/modified:** `src/api/interceptors.ts` (fix), `src/features/board/boardDnd.ts` (new) + `KanbanBoard`,
  tests (`resilience`, `boardDnd`, `tasks`, `interceptors`), `e2e/backend/journey.backend.spec.ts`, docs/15.
- **Tests written:** 10 Vitest tests; 1 real-API journey (Admin-gated).
- **Tests passed:** Vitest 497/497, stable 5 of 5 runs · Playwright UI 142/142 on 2 runs · real API 9/9 (6 skipped).
- **Build status:** ✅ `npm run verify`.
- **Defects found and fixed:** a late 401 triggered a SECOND token refresh (Phase 7 race, found through a real
  page; deterministic unit test added). Details in 15 §4.
- **Pending issues:** the 6 Admin-gated real-API tests have never run (no Admin credentials provided).
- **Final verification status:** ✅ Verified, approved by the project owner on 2026-11-28.

## Phase 16 — Performance and security review

- **Tasks completed:** bundle measured and attributed; Zod/React Hook Form removed from the entry (−41 KB gzip);
  throttled before/after load measurements; duplicate-request check; static security scans; dependency audit;
  recommended security headers with a CSP tested against a real build; token-leak regression test; refresh-token
  storage analysis.
- **Files created/modified:** see [16 §4](16-Phase16-Performance-and-Security-Review.md#4-files).
- **Tests written:** 1 Vitest test (token leak); 2 Playwright tests (CSP hash, pages under the policy).
- **Tests passed:** Vitest 498/498 · Playwright UI 144/144 on 2 runs (2 skipped by design) · real API 9/9 (6 skipped).
- **Build status:** ✅ `npm run verify`; entry 605 KB / 195 KB gzip (was 742 / 236).
- **Defects found and fixed:** startup modules and the auth index pulled form code into every page; Zod's eval
  probe violated a strict CSP (`jitless`). Details in 16 §2–3.
- **Pending issues:** refresh-token storage stays on option A (localStorage) until the owner chooses otherwise (16 §3.4).
- **Final verification status:** ✅ Verified, approved by the project owner on 2026-11-28.

## Phase 17 — Deployment and GitHub

- **Tasks completed:** runtime configuration (`config.js`); CI workflow; Docker image (non-root nginx, runtime API
  address + CSP, health check, read-only support, GHCR publishing on tags); nginx site for VMs/EC2; generated
  configs for IIS/App Service, Azure Static Web Apps, Netlify/Cloudflare Pages and Vercel from the one headers file;
  GitHub Pages workflow with sub-path support; deployment guide. Seven commits (17.1–17.7), one per option.
- **Files created/modified:** see [17 §2](17-Phase17-Deployment-and-GitHub.md#2-commits-of-this-phase).
- **Tests written:** 6 Vitest tests for the generator + 3 for runtime configuration (507 total).
- **Tests passed:** Vitest 507/507 · Playwright UI 144/144 · Docker image, read-only Compose and VM nginx verified
  in containers; Docker and sub-path builds verified in a real browser; CI quality steps run in a fresh clone.
- **Not verified here:** Azure SWA / Netlify / Vercel / IIS on the real services (files unit-tested only); the
  GitHub workflows' first run (after the push).
- **Build status:** ✅
- **Defects found and fixed:** config.js values lost by shell escaping (caught by container test); read-only
  Compose hiding the headers template (caught by running it); Windows CRLF risk for the container script
  (`.gitattributes`); a jsdom/node URL incompatibility in the generator's tests.
- **Final verification status:** all checks pass, awaiting your approval.

