# Phase 11 — Task Management

> Status: **✅ Verified — approved 2026-11-28**. Builds on [Phase 10 — Project management](10-Phase10-Project-Management.md).
> Try it: **Workspace › All tasks / My tasks**, a project's **Tasks** tab, and any task's page.

## 1. What this phase does, in simple words

Tasks are the heart of the app. This phase builds:

- **task lists**: All tasks, My tasks and a project's Tasks tab, with search, filters (status, priority,
  category, project, due date), sorting and paging, all done by the API and kept in the URL;
- **create / edit** with title, description, priority, category and a due date in **your local time**;
- the **task page**: status changes that follow the workflow, assignment, details, edit and delete;
- **per-user actions**: each person is offered only what the API will accept.

Comments on tasks are Phase 12 (the task page shows a placeholder).

## 2. The backend contract (read from the code)

| Endpoint | Rule |
|---|---|
| `GET /api/tasks` | members of the task's project (Admin: all). Filters `ProjectId, Status, Priority, CategoryId, AssignedToId, AssignedToMe, DueFrom (≥), DueTo (<), Overdue, Search (title/description)`; `SortBy` DueDate (default, **no due date last**) · Priority · Status · Title · CreatedAt · UpdatedAt; direction default **Desc** for Priority/CreatedAt/UpdatedAt, Asc otherwise |
| `GET /api/tasks/{id}` | 404 when not visible |
| `POST /api/tasks` | **verified email**; any member of the project (non-member → **404**); `priority` null → Medium; status always Todo; **no assignee** in the request |
| `PUT /api/tasks/{id}` | verified; project owner or creator |
| `PATCH /api/tasks/{id}/assignee` | verified; project owner (or Admin); only an **active project member** (422); `null` unassigns |
| `PATCH /api/tasks/{id}/status` | verified; owner, creator or assignee; invalid move → **409**; reopen/restore → owner only (403) |
| `DELETE /api/tasks/{id}` | verified; owner or creator; deletes the comments too |

**Rights matrix** (backend `TaskAuthorizationHandler`, membership checked first):

| Operation | Admin | Project owner | Creator | Assignee | Other member |
|---|---|---|---|---|---|
| Edit / Delete | ✔ | ✔ | ✔ | ✘ | ✘ |
| Assign | ✔ | ✔ | ✘ | ✘ | ✘ |
| Change status | ✔ | ✔ | ✔ | ✔ | ✘ |
| Reopen / restore | ✔ | ✔ | ✘ | ✘ | ✘ |

**Status workflow** (`TaskStatusWorkflow`):
```
Todo ⇄ InProgress ⇄ InReview → Done          any open status → Cancelled
Done → InProgress  (reopen, owner)             Cancelled → Todo  (restore, owner)
```

**Due date rules:** a new or **changed** due date must be in the future (an unchanged past date may stay); it must
not be after the project's end date, comparing the due date's **UTC calendar date** with the end date.

## 3. How it works

### 3.1 Who depends on whom (no import cycles)
Projects already use tasks (counts, invalidation, badges). Tasks now need projects (owner and members for
permissions, the project list for filters). To keep the runtime dependency one-way:

- `@/features/tasks` (its `index.ts`) exports only **leaf** modules: API, list hook, badges.
- Task pages and components that need projects are **not** exported. The router loads them directly.
- The project's **Tasks** tab route now loads `features/tasks/pages/ProjectTasksPage`. It is rendered
  inside the project layout and reads the project from its outlet context.
- Cache keys of other features (`['projects']`, `['dashboard']`) are repeated as literals in the task
  mutations, rather than importing the other features' key factories.

### 3.2 Lists: one component, three pages
`TaskList` holds the filters, table and paging. **All tasks**, **My tasks** (`?assignedToMe=true`) and the
**project tab** (fixed `ProjectId`, no project filter or column) all use it.

- Every choice is in the URL; filters reset to page 1; search is debounced (one request per pause).
- **Due-date presets** become concrete instants ("Due today" = your **local** day, sent as UTC, end
  exclusive). They are computed **once per choice** (`useMemo`). Recomputing "now" on every render would
  change the query key every time and refetch forever.
- **Sorting starts in the natural direction:** the first click on Priority shows the most urgent first,
  matching the API default. `DataTable` columns gained `firstSortDirection` for this.
- **Phones:** the five filters fold behind a **"Filters (n)"** button (`aria-expanded`, `aria-controls`) so
  the tasks are visible on the first screen. On md screens and up the filters are always shown.
- Rows show status and due date inside the title cell on phones (those columns are hidden there).

### 3.3 Offering only what the API allows
`taskPermissions(user, task, project)` mirrors the rights matrix plus the **verified-email** rule.
`useTaskPermissions` loads the task's project; that is one cached request per project, shared by every row.
`allowedMoves` combines the workflow with the rights, so the UI shows **verbs**:

| From → to | Button |
|---|---|
| Todo → InProgress | **Start** |
| InProgress → InReview | **Send to review** |
| InReview → Done | **Mark done** |
| Done → InProgress | **Reopen** (owner) |
| Cancelled → Todo | **Restore** (owner) |
| any open → Cancelled | **Cancel task** |

When nothing is allowed, the page says **why**: "Verify your email address…", "Only the project owner can
reopen this task.", or "Only the project owner, the task creator or the assignee can change the status." The
row menu disappears entirely when it would be empty.

The API stays the authority. A 409 (for example, someone else moved the task meanwhile) or a 403 is shown with
the server's message.

### 3.4 Due dates: local input, UTC on the wire
- `<input type="datetime-local">` gives `"2026-12-01T18:00"` (no zone). `localInputToUtc` turns it into
  `"2026-12-01T12:30:00.000Z"`, and `utcToLocalInput` reverses that for editing.
- **Same rule as the API, before sending:** a new or changed due date must be in the future. When editing,
  "unchanged" is compared **to the minute**, because the input has no seconds. Otherwise a stored
  `09:00:30` would always count as changed and an old past date could never be kept. The form also sends
  the **original** value back when unchanged.
- **Project end date:** compared exactly as the API does (UTC calendar date). This has a surprising effect:
  for someone west of UTC, 23:30 on the project's last day can already be the next day in UTC. The form says
  so before sending, with the API's message.

### 3.5 Create (+ assign) and edit
- The project field is preset and locked inside a project. Elsewhere it lists the projects you can see.
- **Assignee while creating:** the API's create request has no assignee, so the owner's choice is a **second
  request** (`PATCH …/assignee`). If only that part fails, the user is told **"Task created, but not
  assigned"**. The task exists, and pretending otherwise would be wrong.
- Server errors go where they belong. `applyServerErrors` gained **`fieldAliases`**, because the API validates
  `dueDateUtc` while the form field is `dueDate`. Rules without a field (422) appear in the summary at the top.

### 3.6 After a write
The saved task becomes the cached details (`setQueryData`). Task lists and the dashboard refetch. Project
lists also refetch when counts or progress change (create, status change, delete).

## 4. Files

| File | Responsibility |
|---|---|
| `src/features/tasks/api/tasksApi.ts` | all 7 endpoints + `taskKeys` |
| `src/features/tasks/hooks/useTask.ts` | details + create/update/assign/status/delete with cache updates |
| `src/features/tasks/hooks/useTasks.ts` | list (now keeps the previous page while loading) |
| `src/features/tasks/hooks/useTaskPermissions.ts`, `useStatusChange.ts` | rights for a task; status change with feedback |
| `src/features/tasks/taskRules.ts` | workflow, rights matrix, verified-email rule, verbs, `canCreateTasks` |
| `src/features/tasks/dueDates.ts` | local ⇄ UTC, project-end comparison, default due time |
| `src/features/tasks/taskFilters.ts` | URL ⇄ API query, due presets, natural sort directions |
| `src/features/tasks/schemas/taskSchema.ts` | form rules (incl. time- and project-dependent ones), request builders |
| `src/features/tasks/components/*` | `TaskList`, `TaskTable`, `TaskRowActions`, `TaskFormModal`, `DeleteTaskDialog`, `AssigneeControl`, `DueDate` |
| `src/features/tasks/pages/*` | `TasksPage`, `ProjectTasksPage` (moved from projects), `TaskDetailsPage` |
| `src/features/categories/index.ts` (new) | public API: `useCategories`, `categoryKeys` |
| `src/hooks/useUrlState.ts` | fix: quick successive updates no longer overwrite each other (§5) |
| `src/components/tables/DataTable.tsx` | `firstSortDirection` per column |
| `src/utils/formErrors.ts` | `fieldAliases` |

## 5. Problems found and fixed

| # | Found by | Problem | Fix / lesson |
|---|---|---|---|
| 1 | Real-API test | I missed that **every task write requires a verified email** (controller policy, Admins included); the UI offered actions that would end in 403 | Rule added to `taskPermissions`; visible explanation in list and page; tests per role. **Lesson:** read the controller attributes, not only the service and handler |
| 2 | E2E test | Two quick filter changes: the second **overwrote** the first (status lost) | `useUrlState` builds on the latest **pending** URL; a unit test reproduces two updates before a render |
| 3 | Integration test | Clicking "Priority" sorted least urgent first | `firstSortDirection` on columns (natural order = API default) |
| 4 | Writing the schema | An unchanged past due date would count as "changed" (seconds vs minute-precision input) | Compare to the minute; send the original back |
| 5 | Screenshot review | On phones the filters filled the whole first screen | "Filters (n)" disclosure below md |
| 6 | Real-API test (design) | Expected 404 for a foreign project, got 403 | The API checks **verification first, then membership**. The test now covers both layers (confirming the email through the real link in between) |
| 7 | Dev environment | A running dev server cached a file at the instant it was being rewritten (empty module), so a page rendered blank | Touched the file so Vite re-read it. Your server was left running |

## 6. Tests

| Level | File | Tests | Covers |
|---|---|---|---|
| Unit | `features/tasks/taskRules` | 17 | full workflow, owner-only moves, verbs, rights matrix per role, verified-email rule, ex-member, project still loading |
| Unit | `features/tasks/dueDates` | 4 | local⇄UTC round trip, invalid input, UTC-date comparison with project end, default due time |
| Unit | `features/tasks/taskSchema` | 6 | required fields and limits, future rule (new vs unchanged, seconds), project end, request builders |
| Unit | `features/tasks/taskFilters` | 4 | defaults, mapping and invalid values, fixed project, local "today" range |
| Unit | `hooks/useUrlState` (new) | 3 | read with defaults, multi-key update, **two updates before a render** |
| Unit | `components/tables` · `utils/formErrors` | +1 · +1 | first sort direction; field aliases |
| Integration | `tasks.test.tsx` | 20 | list order and exact query; My tasks; filters + URL + clear; **filters fold (phones)**; debounced search + priority sort; project tab; **row menu per role** + status change; error + retry; **create** (locked project, past date refused, exact body, opens task); **create + assign, partial failure explained**; **edit keeps an unchanged past date**, 422 in summary; **400 dueDateUtc under the field**; 404 page; **status moves per role**; reopen owner-only; read-only member; **unverified user**; 409 explained; assign/unassign; delete → project tasks |
| **Vitest total** | 55 files | **429** (+56) | ✅ stable |
| E2E (UI) | `tasks.spec.ts` | 3 × 3 | owner: create + assign → full workflow → reopen; assignee: My tasks, menu moves, no edit; filters survive reload (phones: folded panel); **axe** on list, form, details, dark |
| **Playwright UI total** | | **120** | ✅ 2 consecutive full runs |
| E2E (real API) | `backend/tasks.backend.spec.ts` | 1 + 1 | regular user: **unverified → UI explains + 403**, then **real email confirmation → foreign project 404**, foreign task "not found". Admin flow (fresh project, UI create + assign, **real 409**, workflow to Done, reopen visible, cleanup) runs with `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` |
| **Real API total** | | **6 passed, 3 skipped** | ✅ (admin flows need credentials) |

## 7. Common mistakes and best practices

| Mistake | Better |
|---|---|
| Showing every status in a dropdown | Offer only valid next moves, as verbs |
| Checking roles only | Check the **whole** rule: verification, membership, then role/ownership |
| Sending local times without a zone | Convert to UTC instants; edit in local time |
| Comparing an untouched value with second precision | Compare at the input's precision; send the original back |
| "Now" inside a query key on every render | Compute once per user choice |
| Two `setSearchParams` calls before a render | Build on the pending URL |
| Hiding why something is unavailable | Visible text: "Only the project owner can reopen this task." |
| Treating a two-step save as all-or-nothing | Say exactly which part failed |
| Feature A and B importing each other's index | Keep one public API leaf-only and compose the rest in the router |

## 8. Interview questions
1. How do you keep UI permissions and API rules from drifting apart? What still protects you if they do?
2. Why is "Done → InProgress" a separate permission from changing status?
3. What can go wrong when storing a user's local "18:00" without a time zone?
4. Why can an untouched due date be rejected on save, and how do you prevent it?
5. A due date is valid in Mumbai and rejected in New York for the same project. Why?
6. Why must a "Due today" filter not compute `new Date()` on every render?
7. When does `setSearchParams` lose updates, and how does a pending ref fix it?
8. How do you report a partial failure (task created, assignment failed)?
9. How do circular feature dependencies appear in a React app, and how do you avoid them?
10. Why does the API return 403 before 404 for an unverified user writing to a foreign project?

## 9. Practical exercises
1. Add an "Assignee" filter on a project's Tasks tab (members only). Which query parameter does it use?
2. Add a "No due date" filter. Can the API do it? If not, what would you change, and where?
3. Show `completedAtUtc` as "Completed 2 days ago" in the list for Done tasks.
4. Let the owner change the assignee from the row menu. Which component needs the project's members?
5. Write a test proving that a member who leaves the project loses the Edit button on their own task.
