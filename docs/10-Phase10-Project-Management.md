# Phase 10 — Project Management

> Status: **✅ Verified — approved 2026-11-27**. Builds on [Phase 9 — Category management](09-Phase9-Category-Management.md).
> Try it: **Workspace › Projects**. Verified Admins and Managers create projects; the owner (or an Admin) edits,
> deletes and manages members; members read.

## 1. What this phase does, in simple words

Projects are the containers for tasks. This phase builds:

- a **project list** (cards or table) with search, "only mine", sort and **paging on the server**;
- **create / edit** with dates and validation, **delete** with an honest warning;
- a **project page** with tabs: **Overview** (progress, task counts by status) and **Members** (search for users,
  add, remove). Tasks and Board tabs stay placeholders until Phases 11–12.

Compared with categories (Phase 9), three things are new: data that is **paged on the server**, a **details page
shared by several tabs**, and a **search-as-you-type picker** that talks to the API.

## 2. The backend contract (read from the code)

| Endpoint | Who | Notes |
|---|---|---|
| `GET /api/projects` | signed in | **paged**. `Search` (name/description), `OwnedByMe`, `SortBy` = CreatedAt · Name · StartDate · EndDate, `SortDirection` (default **Desc for CreatedAt**, Asc otherwise), `Page`, `PageSize` ≤ 100. Visible = owner or member (Admin: all) |
| `GET /api/projects/{id}` | owner/member/Admin | details + members (owner first). **404 also when you are not a member** (existence isn't revealed) |
| `POST /api/projects` | Admin or Manager **+ verified email** (`CanCreateProjects`) | 201 · 400 · 403 · **409** "The owner already has a project named 'X'." |
| `PUT /api/projects/{id}` | **owner or Admin** | 200 · 400 · 403 · 404 · 409 |
| `DELETE /api/projects/{id}` | owner or Admin | 204. **Cascades: the project's tasks and their comments are deleted** |
| `POST /api/projects/{id}/members` `{userId}` | owner or Admin | 200 (updated project) · 409 already a member · 422 user unknown/inactive |
| `DELETE /api/projects/{id}/members/{userId}` | owner or Admin | 204 · 422 **the owner can't be removed** · their tasks in the project become **unassigned** |
| `GET /api/users/lookup?Search=&Limit=` | Admin or Manager **+ verified** (`CanLookupUsers`) | active users only, **Search ≥ 2 characters** |

| Rule | Backend | Frontend |
|---|---|---|
| Name | required, ≤ 150, trimmed, **unique per owner, case-insensitive** | Zod + `maxLength`; 409 shown under the name |
| Description | ≤ 2000, empty → `null` | same, live counter |
| Dates | `DateOnly` (no time zone), end ≥ start | `<input type="date">` → `"yyyy-MM-dd"`; same rule, error on **End date** |
| Progress | `completionPercent` = done ÷ (total − **cancelled**), 1 decimal | the overview uses **the same formula** (`completionPercent()`) |

## 3. How it works

### 3.1 Server-side list: everything in the URL
```
/projects?search=web&mine=true&sort=Name&page=2&size=24&view=table
```
- The page reads the URL (`useUrlState` from Phase 9), builds the `ProjectQuery` and calls `useProjects(query)`.
  The query **is** the cache key, so going back to a previous filter is instant.
- **Debounced search:** the box updates the URL on every keystroke (so it feels instant and survives refresh),
  but the request waits until typing pauses for 300 ms (`useDebouncedValue`). Typing "web" sends **one** request.
- **Any filter change returns to page 1** (page 3 of a different result may not exist).
- `placeholderData: keepPreviousData`: while page 2 loads, page 1 stays on screen (dimmed, `aria-busy`), with no
  flash of skeletons.
- Defaults are not written to the URL; the sort direction is only written when it differs from the backend's
  default for that field.

### 3.2 One details request, shared by all tabs
`ProjectDetailsLayout` loads `GET /api/projects/{id}` once and passes it to the tab pages through
**Outlet context** (`useProjectContext()`). It also handles the states for every tab:

| State | What the user sees |
|---|---|
| loading | skeleton (`role="status"`) |
| **404** | "Project not found: it doesn't exist, was deleted, or you are not a member of it." + Back to projects |
| other error | error with reference id and retry |
| loaded | header (name, timeline badge, owner), Edit/Delete for owner/Admin, tabs, `Members (n)` |

**Breadcrumb and tab title show the project's name.** The route only knows the URL ("Project #12"), so a small
context (`useBreadcrumbLabel`) lets a page give its crumb a label once the data has loaded; the document title
follows. When the name is edited, both update.

> **Bug found during the phase (infinite loop):** the first version of the label provider created a new
> `setLabel` function whenever the labels changed. The page's effect depended on it, so its cleanup (remove
> label) and re-run (add label) fed each other forever, and the whole test run hung. Fix: `setLabel` is stable
> (`useCallback` with no dependencies). **Lesson:** functions handed to effects through context must be stable.

### 3.3 Overview: counts the API can give
The details endpoint has no task counts. The overview asks the tasks endpoint for **totals only**
(`GET /api/tasks?ProjectId=…&Status=…&PageSize=1` → `totalCount`): one small request per status plus one for
overdue, in parallel (`useQueries` + `combine`), cached under the same keys the task pages will use.

> **Mistake caught by reading the backend:** I first computed progress as done ÷ all tasks. The backend
> excludes **cancelled** tasks (they will never be done). The overview now uses the same formula, says
> "(cancelled not counted)", and a unit test pins it (3 done + 1 cancelled of 4 = 100 %).

### 3.4 Members: an accessible search-as-you-type picker
`MemberPicker` follows the WAI-ARIA **combobox** pattern:
- focus stays in the input; ↑/↓ move a *virtual* highlight (`aria-activedescendant`), **Enter** picks,
  **Escape** closes the list (without closing anything around it);
- a live status line explains what's happening: "Type at least 2 characters", "Searching…",
  "2 users found, 1 can be added", or the server's error;
- existing members are listed but **not selectable** (`aria-disabled`, "Member" label), so the user understands
  why someone can't be added instead of thinking the search failed;
- the click handler uses `mousedown` (it fires before the input's blur closes the list).

Adding uses the response as the new member list (`setQueryData`). Removing asks first and says the consequence
with a real number: *"Their 2 assigned tasks in this project will become unassigned."* The owner row has no remove
button (the backend would answer 422).

### 3.5 Delete: say what will be lost, and don't show it again
- The dialog counts the project's tasks: *"Its 8 tasks and their comments will be deleted too. Members lose
  access. This can't be undone."*
- After deleting, the project is **removed from every cached list page immediately** (and the count adjusted),
  then the lists refetch. Without this, going back to the list briefly showed the deleted project from cache.
  An integration test with a deliberately slow server proves it (and fails without the fix).

### 3.6 Permissions in the UI (the API still decides)
| User | List | Project page |
|---|---|---|
| Admin / Manager, verified | **New project** | Edit, Delete, add/remove members **if owner** (Admin: always) |
| Admin / Manager, **not** verified | button disabled + "Verify your email address to create projects." | as above, but can't search users (text explains) |
| User | "When a manager adds you to a project, it will appear here." | read-only; members list only |

### 3.7 Dates without time-zone bugs
Project dates are calendar dates (`DateOnly`). They are never turned into instants: comparisons are done on the
`"yyyy-MM-dd"` strings (they sort correctly as text), "today" is the **local** date, and formatting uses
`timeZone: 'UTC'` on a UTC midnight, so "1 Mar" can never show as "28 Feb". The timeline badge (Upcoming / Active /
Ended / No dates) is derived from these dates; the backend has no project status.

## 4. Files

| File | Responsibility |
|---|---|
| `src/features/projects/api/projectsApi.ts` | 7 endpoints + `projectKeys` (lists/details hierarchy) |
| `src/features/projects/hooks/useProjects.ts` | list (keepPreviousData), details, create/update/delete, add/remove member; cache updates and invalidation (lists, details, dashboard, tasks) |
| `src/features/projects/hooks/useProjectTaskCounts.ts` | counts by status + overdue via parallel totals-only queries |
| `src/features/projects/schemas/projectSchema.ts` | Zod mirror of ProjectRules; `toProjectRequest` |
| `src/features/projects/projectRules.ts` | `canManageProject`, `projectTimeline`, `localToday`, `formatProjectDates`, `completionPercent` |
| `src/features/projects/projectContext.ts` | Outlet context type + `useProjectContext` |
| `src/features/projects/components/*` | `ProjectCard`, `ProjectsTable`, `ProjectActionsMenu`, `TimelineBadge`, `ProjectFormModal`, `DeleteProjectDialog`, `MemberPicker`, `RemoveMemberDialog` |
| `src/features/projects/pages/*` | `ProjectsPage`, `ProjectDetailsLayout`, `ProjectOverviewPage`, `ProjectMembersPage` |
| `src/features/users/*` (new) | `usersApi.lookup`, `userKeys`, `useUserLookup` (debounced, ≥ 2 chars) |
| `src/hooks/useDebouncedValue.ts` | value that settles after a pause |
| `src/components/layout/breadcrumbLabels.ts`, `BreadcrumbLabelsProvider.tsx` | page-provided breadcrumb labels (+ document title) |
| `src/features/auth/permissions.ts` | + `canLookupUsers` |
| `src/types/api.ts` | + project and lookup DTO aliases |
| `playwright.config.ts`, `package.json` | E2E runs against a bundled build (`e2e:serve`), 6 workers locally (see §5) |

## 5. Problems found and fixed

| # | Found by | Problem | Fix / lesson |
|---|---|---|---|
| 1 | Hanging test run | Breadcrumb label provider: unstable `setLabel` → effect cleanup/re-run loop | Stable callback; context functions used in effects must not change |
| 2 | Reading the backend | Progress counted cancelled tasks | Same formula as `ProjectProgress.CompletionPercent`, unit-tested |
| 3 | axe (E2E) | View toggle used `text-primary` on `bg-primary-soft` (contrast too low) | The design system's checked pair `text-primary-soft-foreground` |
| 4 | E2E snapshot | Deleted project flashed in the list (stale cache) | Remove from cached pages immediately; test with a slow server |
| 5 | Phase 7 test | "Checking your session" test assumed a 150 ms delay was long enough to see the loader | The fake refresh now waits until the test has seen the loader (no timing assumption) |
| 6 | E2E infrastructure | A dev server left running by an interrupted earlier test run was stuck at 100 % CPU and later served a stale module | Stopped it (it was mine); E2E now uses a bundled build (`npm run e2e:serve`) that Playwright starts and stops |
| 7 | E2E infrastructure | 11 parallel browsers + axe on a busy machine → timeouts | 6 workers locally (faster overall); `test.slow()` only on the two long CRUD flows |
| 8 | axe (E2E), intermittent | Scan right after switching theme measured colours **mid-transition** (`transition-colors`) → false contrast failure | The axe helper waits for finite CSS animations to finish (looping spinners/skeletons ignored) |

Mistakes in my own tests, corrected: the current page's breadcrumb is text (`aria-current`), not a link; picking
the header's "New project" when the empty state shows a second one.

## 6. Tests

| Level | File | Tests | Covers |
|---|---|---|---|
| Unit | `features/projects/projectSchema` | 5 | trim, limits, end ≥ start (same day OK, error on end date), invalid date, nulls |
| Unit | `features/projects/projectRules` | 9 | timeline cases, local "today", date formatting without shifting, completion formula, who may manage |
| Unit | `hooks/useDebouncedValue` | 1 | settles only after the pause; typing again restarts it |
| Integration | `projects.test.tsx` | 21 | list order + exact query sent; **debounced server search** (1 request) + URL; owned-by-me; **sort + paging on the server**; table view; actions only where allowed; regular user; unverified manager; error + retry; **create** (focus, date rule, body, opens new project); **409**; **edit** (header, breadcrumb and title follow); **delete with task count** → list; **no stale project after delete**; **404 page**; overview counts and formula; members read-only for members; **keyboard picker add**; existing members not selectable; 422 explained; **remove with unassigned count**, no remove for owner; owner without lookup permission |
| Updated | `navigation`, `session` integration tests | — | project pages now load real data (default MSW handlers return "Website Redesign") |
| **Vitest total** | 50 files | **373** (+36) | ✅ |
| E2E (UI) | `projects.spec.ts` | 3 × 3 | create (date rule) → page → member via keyboard → delete; table + overview; read-only user; **axe** on list, form error, picker open, table, overview, light + dark |
| **Playwright UI total** | | **111** | ✅ 3 consecutive runs, ≈ 2.4 min each |
| E2E (real API) | `backend/projects.backend.spec.ts` | 1 + 1 | **regular user**: real list 200 + empty state, no create button, **404 page** for a foreign project, **direct POST → 403, lookup → 403**. **Admin flow** (create, real 409, add member via real lookup, remove, delete) runs with `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`, otherwise skipped |
| **Real API total** | | **5 passed, 2 skipped** | ✅ against a normally started API (not under the debugger) |

## 7. Common mistakes and best practices

| Mistake | Better |
|---|---|
| Fetching on every keystroke | Debounce the request, not the input |
| Keeping page 3 after a filter change | Reset to page 1 on every filter change |
| Each tab fetching the project again | Load once in the layout, share via Outlet context |
| "Not authorised" for projects you can't see | Treat 404 as "not found or no access", as the API intends |
| Recomputing a backend figure differently | Use the same formula, and test it |
| Converting calendar dates to `Date` in local time | Compare `yyyy-MM-dd` strings; format at UTC midnight |
| Hiding existing members from search results | Show them as not selectable, so the result makes sense |
| Removing a member without warning | Say how many of their tasks become unassigned |
| Unstable functions in context | `useCallback`; otherwise effects that depend on them can loop |

## 8. Interview questions
1. Why keep filters in the URL rather than in component state?
2. What's the difference between debouncing the input and debouncing the request?
3. What does `keepPreviousData` change for the user, and what must the UI show meanwhile?
4. Why does the API answer 404 rather than 403 for a project you're not a member of?
5. How does the combobox pattern keep focus in the input while moving through options?
6. Why `mousedown` instead of `click` for picking an option?
7. When is `setQueryData` enough, and when do you also invalidate?
8. How can an effect and a context provider end up in an infinite loop?
9. Why compare `"yyyy-MM-dd"` strings instead of `Date` objects for calendar dates?
10. Why run E2E tests against a bundled build instead of the dev server?

## 9. Practical exercises
1. Add an "Ending soon" filter (end date within 14 days). Which backend parameter would you need? (There isn't
   one: what are your options?)
2. Make the picker show the user's job title when the lookup returns one.
3. Add "Leave project" for members. Check the backend first: is it allowed?
4. Show the five status counts as a single stacked bar. Which accessibility features must the table keep?
5. Open a project you're not a member of by URL as a regular user. Explain each layer that keeps it hidden.
6. The lookup matches the email, first name **or** last name separately, so typing a full name ("Mira Tester")
   finds nobody. Should that be fixed in the backend (match `FirstName + " " + LastName`) or worked around in the
   frontend (search the first word only)? Argue for one. (Fixing the backend is the honest fix, but it belongs to
   a backend change, not this frontend phase.)
