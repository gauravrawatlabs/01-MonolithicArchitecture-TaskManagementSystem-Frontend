# Phase 8 — Dashboard

> Status: **✅ Verified — approved 2026-11-27**. Builds on [Phase 7 — Sessions](07-Phase7-Sessions-and-API-Integration.md).
> Try it: sign in → **Dashboard**. A new account sees the empty state; data appears once you belong to projects with tasks.

## 1. What this phase does, in simple words

The dashboard answers "how are my projects doing, and what needs my attention?" on one screen:

```
┌ Key figures ── Projects · Total tasks · Completed · Open · Overdue · Assigned to me ┐
├ Tasks by status (bars)            ├ Tasks by priority (bars)                         ┤
├ Project progress (meter list)     ├ Upcoming deadlines (next 7 days)                 ┤
├ My overdue tasks                  ├ Recently updated                                 ┤
```

It is also the first page that **reads data with TanStack Query** (Phases 6–7 only wrote data), so this phase
sets the pattern every list page will follow: an API function, a query-key factory, a hook, and explicit
loading / empty / error states.

## 2. Where every figure comes from

| On screen | Source (real backend fields) |
|---|---|
| Projects | `GET /api/dashboard` → `projectCount` |
| Total tasks | `tasks.total` |
| Completed (+ last 7 days) | `tasksByStatus.Done` (+ `tasks.completedInLast7Days`) |
| Open (+ due in 7 days) | `tasks.open` (+ `tasks.dueInNext7Days`) |
| Overdue | `tasks.overdue` |
| Assigned to me | `myWork.assignedOpen` (+ `assignedOverdue`, `assignedDueInNext7Days`) |
| Tasks by status / priority | `tasksByStatus`, `tasksByPriority` |
| Project progress | `projects[]` (top 10 by open tasks; completion = Done ÷ (Total − Cancelled)) |
| Upcoming deadlines | `GET /api/tasks?DueFrom=now&DueTo=now+7d&Overdue=false&SortBy=DueDate&PageSize=20`, then Done/Cancelled removed |
| My overdue tasks | `GET /api/tasks?AssignedToMe=true&Overdue=true&SortBy=DueDate&PageSize=6` |
| Recently updated | `GET /api/tasks?SortBy=UpdatedAt&SortDirection=Desc&PageSize=6` (gap G3: the backend has no activity log) |
| Scope line | `scope`: `AllProjects` (Admin) → "across all projects"; otherwise "the projects you belong to" |

**Verified against the real API** (a new user): the dictionaries are keyed by enum **name** (`"Todo"`, `"InProgress"`…),
every key is present (zeros included), and an empty workspace returns `projectCount: 0, projects: []`.

**Known limitation:** the API filters by one status at a time, so "open tasks due this week" asks for 20 tasks in the
window and removes Done/Cancelled in the browser. If a week has more than ~20 due tasks, some open ones may not
appear; the list is a preview, and the full filter UI comes in Phase 11.

## 3. Choosing the charts (dataviz guidance)

Before any chart code, the `dataviz` method was applied: **pick the form first, color last, validate color with a script.**

| Data | Phase 1 plan | Chosen form | Why |
|---|---|---|---|
| Tasks by status | donut | **horizontal bars, one hue, workflow order** | Comparing parts is read more accurately from bars on one baseline than from arcs; the order (To do → Cancelled) carries meaning |
| Tasks by priority | bars | **horizontal bars, one hue, most urgent first** | Same job (amounts of ordered parts) |
| Project progress | progress bars | **meter list** (name · bar · figure per row) | One ratio per named row |
| Headline numbers | stat cards | **KPI row of stat tiles** | A single number is not a chart |

**Color:** one series → one hue → the existing `--primary` violet, used through the CSS token (dark mode is
automatic). The validator script passed it on both surfaces:

```
light #6d4aff on #ffffff → lightness band, chroma floor, contrast ≥ 3:1: ALL PASS
dark  #6d4aff on #171923 → ALL PASS
```

**Mark rules applied:** bars ≤ 24 px (20 px), 4 px rounded data-end and square baseline, value at the tip in a text
color (never the bar color), no gridlines (every bar is labelled), **no legend** (one series: the card title names it),
proportional digits on stat values (`normal-nums`), meter track = lighter step of the same hue (`primary-soft`, also
applied to the shared `ProgressBar`).

**Accessibility of charts:**
- **Tooltip on hover *and* keyboard focus:** Recharts 3's accessibility layer (on by default) makes the chart focusable;
  arrow keys move between bars.
- **Table view:** every chart card has a *Chart / Table* switch (`ChartCard`), so no value depends on hover or sight.
- Animation is short (400 ms) and **off** under `prefers-reduced-motion`.

## 4. Data fetching with TanStack Query

```
DashboardPage
 ├─ useDashboard()            key ['dashboard']                         staleTime 30 s
 └─ useTasks(query) ×3        key ['tasks','list', query]               staleTime 15 s   (enabled only when there are projects)
        └─ tasksApi.getTasks(query, signal) ─► apiClient (Bearer, refresh, ApiError) ─► GET /api/tasks
```

- **Query-key factories** (`dashboardKeys`, `taskKeys`) make keys consistent and allow precise invalidation later
  (Phase 9+ mutations will invalidate `['dashboard']` and `taskKeys.lists()`).
- **`signal`** is passed to Axios: leaving the page cancels requests in flight.
- **Stable keys:** the "next 7 days" window is computed **once per page visit** (`useState(() => …)`). Computing
  `new Date()` on every render would change the query key on every render and cause an endless refetch loop.
- **Normalization at the edge:** `toDashboard()` turns the loosely typed dictionaries (`{ [key: string]: number }`
  in OpenAPI) into complete `Record<TaskItemStatus, number>` / `Record<TaskPriority, number>`. Components never see
  a missing or unknown key.
- **Generated query types:** `TaskQuery` is the backend's own parameter list from OpenAPI (`SortBy`, `PageSize`…),
  so a typo or an invented filter is a compile error.

### States
| Situation | What the user sees |
|---|---|
| First load | a skeleton shaped like the dashboard (no layout jump) |
| Dashboard request fails | error card with the server's safe message, **correlation id**, *Try again* |
| One task list fails | only that card shows an error + *Try again*; the rest of the page works |
| No projects (Manager/Admin) | "No projects yet" + **Go to projects** |
| No projects (User) | "Ask a project owner or manager to add you" (no button they can't use) |
| Refresh | header button refetches all four queries; "Updated … ago" (announced politely) |

## 5. Files

| File | Responsibility |
|---|---|
| `src/features/dashboard/api/dashboardApi.ts` | `getDashboard`, `toDashboard` (normalization, Admin scope), `dashboardKeys` |
| `src/features/dashboard/hooks/useDashboard.ts` | the dashboard query |
| `src/features/dashboard/pages/DashboardPage.tsx` | composition, states, stable date window, refresh, **lazy charts** |
| `src/features/dashboard/components/` | `DashboardStats` (KPI row), `TaskBreakdownCharts`, `ProjectProgressCard` (meter list), `TaskListCard` (compact list with its own states), `DashboardSkeleton` |
| `src/features/tasks/api/tasksApi.ts`, `hooks/useTasks.ts` | first task query + `taskKeys` (exported from `@/features/tasks`, reused in Phase 11) |
| `src/components/common/StatCard.tsx` | KPI tile (label · value · hint, optional link) |
| `src/components/charts/HorizontalBarChart.tsx` | single-hue Recharts bars following the mark specs |
| `src/components/charts/ChartCard.tsx` | card with Chart / Table switch |
| `src/components/common/ProgressBar.tsx` | track now `primary-soft` (same-hue meter track) |
| `src/utils/dates.ts`, `src/utils/numbers.ts` | `Intl`-based relative days, time-ago, date-time; exact/compact counts, percent |
| `src/types/api.ts` | + `Task`, `TaskQuery` (generated), `PagedTasks`, `DashboardResponse`, `ProjectProgress` |

## 6. Problems found and fixed

| # | Found by | Problem | Fix / lesson |
|---|---|---|---|
| 1 | Test timeouts → investigation | React Router downloads a route's lazy code **before** guards run, so a signed-out visitor to `/dashboard` downloaded Recharts on the way to sign-in | Charts are lazy-loaded inside the page: dashboard chunk **8 kB**, Recharts in its own **116 kB** chunk, loaded only when charts are drawn |
| 2 | Looking at screenshots | Bar values appeared only after Recharts' **1.5 s** default animation | `animationDuration={400}` (none under reduced motion) |
| 3 | Looking at screenshots | Six KPI tiles per row at 1280 px wrapped labels and misaligned values | Six per row only at `2xl`; three per row below |
| 4 | Design review (dataviz) | Phase 1 planned a donut for status | Ordered horizontal bars, one hue |
| 5 | Code review | A variable named `window` shadowed the global | Renamed `dueWindow` |
| 6 | Test infrastructure | First import of a heavy library is slow when many test workers start at once | Testing Library waits up to 5 s; Vitest per-test limit 15 s (tests still end as soon as they pass) |

Mistakes in my own tests, corrected: a drawer test that checked the URL before the lazy page had loaded (now waits for
the page), and a `toHaveAttribute` with a bare regex (now `expect.stringMatching`).

**Visual check (dataviz step 7):** screenshots of desktop light/dark and mobile were reviewed for label collisions,
clipping and overflow; issues 2 and 3 above came from that review. Mobile has no horizontal scrolling (also asserted in E2E).

## 7. Tests

| Level | File | Tests | Covers |
|---|---|---|---|
| Unit | `utils/dates` | 12 | calendar days in local time (not 24-h blocks), relative days, time-ago, addDays |
| Unit | `utils/numbers` | 8 | exact below 10,000, compact above, percent |
| Unit | `features/dashboard/dashboardApi` | 3 | dictionary normalization (missing → 0, unknown dropped), Admin scope |
| Unit | `components/charts/charts` | 3 | Chart/Table switch with accessible table; StatCard link and formatting |
| Integration | `dashboard.test.tsx` | 11 | KPI figures + links; Admin scope text; status table in workflow order; priority order; meter list; **the exact task queries sent** (incl. 7-day window); Done filtered from upcoming; one failing list isolated; dashboard error + correlation id + retry; empty state per role (and **no task requests** without projects); refresh refetches all |
| **Vitest total** | 42 files | **318** (+37) | ✅ stable over 3 runs · lines ≈ 93 % |
| E2E (UI) | `dashboard.spec.ts` | 5 × 3 | 5 bars rendered with labels, table view, **hover tooltip**, **no horizontal scroll on phones**, axe light + dark, empty state |
| **Playwright UI total** | | **93** | ✅ |
| E2E (real API) | `backend/dashboard.backend.spec.ts` | 1 | new user → real `GET /api/dashboard` 200, enum-name keys in order, empty-state message |
| **Real API total** | | **3** | ✅ (ran against a backend started for this phase, no debugger) |

## 8. Common mistakes and best practices

| Mistake | Better |
|---|---|
| Donut/pie to compare parts | Bars on one baseline (keep natural order) |
| A rainbow for one series | One hue; identity comes from the row label |
| Coloring values with the bar color | Text tokens for all text |
| Charts only reachable by mouse | Keyboard focus + tooltip, and a table view |
| `new Date()` inside a query key | Compute the window once (state) |
| Trusting `{ [key: string]: number }` | Normalize at the API edge into complete typed records |
| One failing widget blanks the page | Each widget owns its loading/error state |
| Eager-importing a chart library on a guarded page | Lazy-load it where it's drawn |
| "Looks fine" without looking | Screenshot and review; tests don't see layout |

## 9. Interview questions
1. Why are bars usually better than a donut for comparing categories?
2. What is a query key, and what happens if it changes on every render?
3. How would you invalidate the dashboard after a task is created? Which keys?
4. Why pass an `AbortSignal` to the API call in a query function?
5. How do you make a chart accessible to keyboard and screen-reader users?
6. Why is the dashboard's status dictionary normalized instead of used directly?
7. What does `enabled: false` do in TanStack Query, and why is it used here?
8. Why can a route guard not prevent the route's lazy code from being downloaded?
9. What is `staleTime`, and why do the dashboard and task lists use different values?
10. Why do stat values use proportional digits while tables use tabular ones?

## 10. Practical exercises
1. Add a "Due today" figure computed from the upcoming-deadlines list. Where should the computation live?
2. Switch the theme while the dashboard is open. Why does the chart color change without any chart code?
3. Throttle the network in DevTools and watch the skeleton, then the charts chunk load separately.
4. Make `TaskListCard` show "View all" for "Recently updated" linking to `/tasks?sortBy=UpdatedAt`.
5. Run the validator from the dataviz skill on a second color you'd like for a two-series chart. Does it pass in dark mode?
