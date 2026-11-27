# Phase 9 — Category Management

> Status: **✅ Verified — approved 2026-11-27**. Builds on [Phase 8 — Dashboard](08-Phase8-Dashboard.md).
> Try it: **Manage › Categories**. Everyone can read; an Admin with a verified email can create, edit and delete.

## 1. What this phase does, in simple words

Categories ("Bug", "Feature"…) label tasks across all projects. This is the first **complete CRUD feature**:
list, search, sort, create, edit and delete, with validation, permissions, errors and tests. The pattern it sets
(API module → query keys → query/mutation hooks → page + modal + confirm dialog) is what projects (Phase 10) and
tasks (Phase 11) will follow.

## 2. The backend contract (read from the code)

| Endpoint | Who | Notes |
|---|---|---|
| `GET /api/categories` | any signed-in user | **all** categories, ordered by name, **not paged** |
| `POST /api/categories` | Admin + verified email (`CanManageCategories`) | 201 · 400 · 403 · **409 duplicate name** |
| `PUT /api/categories/{id}` | same | 200 · 400 · 403 · 404 · 409 |
| `DELETE /api/categories/{id}` | same | 204 · 403 · 404 |

| Rule | Backend | Frontend |
|---|---|---|
| Name | required (not blank), ≤ 100, trimmed | same Zod rules; `maxLength` on the input |
| Description | optional, ≤ 500, trimmed, empty → `null` | same; empty sent as `null` |
| Unique name | **case-insensitive** (SQL Server collation + unique index; race-safe) | 409 shown **under the name field** |
| Delete | tasks are **kept**, their category becomes `NULL` (FK `ON DELETE SET NULL`) | the confirm dialog says so, with the number of tasks affected |

## 3. How it works

### 3.1 Reading: search and sort in the browser, state in the URL
The list is small and unpaged, so the page filters (name **or** description) and sorts (name or created date) in the
browser, with no extra requests. The search text and sort live in the URL
(`/categories?search=bug&sort=CreatedAt&dir=Desc`): links and refresh keep them, and the default values are not
written (short URLs).

**New hook: `useUrlState(defaults)`** returns the current values **and one updater for several keys at once**.

> **Bug found by a test:** the first version used one hook per parameter. Sorting changes `sort` *and* `dir` in the
> same click, and React Router computes each `setSearchParams` from the URL **as it was when the component
> rendered**. The second call overwrote the first, so the sort was lost. One atomic update fixes it; Phase 10/11
> filters need exactly this.

### 3.2 Writing: mutations and the cache
```
CategoryFormModal ─► useCreateCategory().mutateAsync(body) ─► POST /api/categories
                         onSuccess: setQueryData(['categories'], list + created, sorted)  ← instant UI, no extra GET
                                    invalidateQueries(['categories'])                     ← confirm with the server
DeleteCategoryDialog ─► useDeleteCategory() ─► DELETE …
                         onSuccess: remove from cache · invalidate ['categories'] and ['tasks'] (tasks lost their category)
```
- **Update and delete also invalidate the task queries**: task rows show the category name, and after a delete
  those tasks have none.
- Errors are not swallowed: forms map them with `applyServerErrors` (`409 → name`); the delete dialog shows a
  toast and **stays open** so the user can retry or cancel.

### 3.3 The delete dialog tells the truth
Before deleting, the dialog asks `GET /api/tasks?CategoryId={id}&PageSize=1` and reads `totalCount`:
*"5 tasks use it; they keep existing without a category. This can't be undone."* Only Admins can delete, and Admins see
every task, so the number is complete.

### 3.4 Permissions in the UI (the API still decides)
| User | Sees |
|---|---|
| Admin, verified | **New category** button, row actions (Edit, Delete) |
| Admin, **not** verified | the button **disabled**, plus visible text: "Verify your email address to manage categories." |
| Manager / User | the list only, and "Categories are managed by administrators." |

The real-API test proves the boundary is the server: a regular user's direct `POST /api/categories` gets **403**.

> **Accessibility fix during the phase:** the first version put a tooltip on a focusable `<span>` around the disabled
> button. jsx-a11y flagged it (a focusable element that does nothing), and tooltips must never carry essential
> information (touch users can't hover). The reason is now **visible text**.

### 3.5 The form modal
- Mounted only while open, so every opening starts with fresh values (create: empty; edit: the current values).
- Focus goes to **Name** (`initialFocusRef`); live counter for the description (`19 / 500`).
- Can't be dismissed while saving; the submit button sits in the modal footer and submits the form through `form={id}`.

## 4. Files

| File | Responsibility |
|---|---|
| `src/features/categories/api/categoriesApi.ts` | `getAll`, `create`, `update`, `remove`, `categoryKeys` |
| `src/features/categories/hooks/useCategories.ts` | `useCategories` (10-min staleTime) + create/update/delete mutations with cache updates and invalidation |
| `src/features/categories/schemas/categorySchema.ts` | Zod rules mirroring `CategoryRules`; `toCategoryRequest` (empty description → `null`) |
| `src/features/categories/components/CategoryFormModal.tsx` | create/edit modal |
| `src/features/categories/components/DeleteCategoryDialog.tsx` | confirmation with task count |
| `src/features/categories/pages/CategoriesPage.tsx` | list, search, sort, empty/no-match/error states, permissions |
| `src/hooks/useUrlState.ts` | several URL parameters as state, atomic updates |
| `src/components/forms/SearchInput.tsx` | search box with icon and clear button |
| `src/utils/dates.ts` | + `formatDate` |
| `src/types/api.ts` | + `Category`, `CreateCategoryRequest`, `UpdateCategoryRequest` |
| `src/features/dashboard/*` | loading containers now `role="status"` (see §5) |

## 5. Problems found and fixed

| # | Found by | Problem | Fix / lesson |
|---|---|---|---|
| 1 | Integration test | Two URL setters in one click: the second overwrote the first, so sort was lost | `useUrlState` with one atomic updater |
| 2 | jsx-a11y | Focusable `<span>` used to show a tooltip on a disabled button | Visible explanatory text instead (no essential info in tooltips) |
| 3 | axe (E2E) | **From Phase 8:** loading skeletons had `aria-label` on a plain `<div>` (prohibited, so never announced) | `role="status"` on loading containers (dashboard skeleton, charts fallback, task-list loading) |
| 4 | E2E review | UI tests that land on the dashboard depended on whether a real backend happened to be running | `fakeEmptyWorkspace()` default in `beforeEach` (later fakes override it; Playwright routes are LIFO) |
| 5 | Test infrastructure | More test files → CPU contention at worker start → a 5 s wait occasionally ran out | Testing Library async limit 10 s (tests still end as soon as they pass) |

Mistakes in my own tests, corrected: test data where "o" matched two rows (Bug's description) while the test expected
one; ambiguous "Clear search" (search box and empty state both have one, so scoped to the table); toast text matched
twice because Radix duplicates it in a hidden live region for screen readers (`exact: true`).

## 6. Tests

| Level | File | Tests | Covers |
|---|---|---|---|
| Unit | `features/categories/categorySchema` | 4 | trimming, blank name, 100/500 limits, empty description → `null` |
| Unit | `components/forms/SearchInput` | 1 | named searchbox, clear button only when there is text |
| Integration | `categories.test.tsx` | 14 | name order + count; **read-only for non-admins**; **unverified admin sees why**; search name/description + URL + no-match + clear; restore from shared link; sort by date (asc → desc, URL); empty state for admin; load error + retry; **create** (focus, client validation, trimmed body, toast, new row); **409 under name**; **edit** (prefilled, PUT body, row updated); **delete with task count**; delete failure keeps dialog; 403 message |
| **Vitest total** | 45 files | **337** (+19) | ✅ stable over 4 runs · lines ≈ 94 % |
| E2E (UI) | `categories.spec.ts` | 3 × 3 | full admin CRUD against a **stateful** fake API (409, rename, delete with count); search survives reload; read-only view; **axe** on page, form with error, delete dialog, light + dark |
| **Playwright UI total** | | **102** | ✅ (dashboard/navigation specs now independent of a running backend) |
| E2E (real API) | `backend/categories.backend.spec.ts` | 1 + 1 | **regular user**: real list 200, no controls, **direct POST → 403**. **Admin flow** (create, real case-insensitive 409, rename, delete) runs when `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` are set; otherwise skipped with a reason |
| **Real API total** | | **4 passed, 1 skipped** | ✅ (admin credentials not provided, option B) |

To run the admin flow later (option A), set two environment variables for one run; nothing is stored in the repo:
```powershell
$env:E2E_ADMIN_EMAIL = "admin@…"; $env:E2E_ADMIN_PASSWORD = "…"; npm run test:e2e:backend
```

## 7. Common mistakes and best practices

| Mistake | Better |
|---|---|
| Hiding buttons and calling it security | The API decides (proved by the 403 test); the UI only explains |
| Putting the "why" in a tooltip on a disabled button | Visible text near the control |
| Several `setSearchParams` calls in one event | One atomic update |
| Refetching the whole list after every write | `setQueryData` with the server's response, then invalidate |
| Forgetting related caches | Category rename/delete also invalidates task queries |
| Vague delete confirmations | Say exactly what happens (tasks kept, count) and that it can't be undone |
| Closing the dialog on failure | Keep it open, show why, allow retry |
| Case-sensitive duplicate checks in the UI | Let the server decide (its collation is the truth); show its 409 |

## 8. Interview questions
1. When is client-side filtering better than server-side, and when not?
2. What is the difference between `setQueryData` and `invalidateQueries`? Why use both after a write?
3. Why does renaming a category invalidate task queries?
4. How do you show why an action is unavailable to keyboard, touch and screen-reader users alike?
5. Why can two `setSearchParams` calls in one click lose an update?
6. How does the UI learn about a duplicate name, and why isn't a client-side check enough?
7. What does `ON DELETE SET NULL` mean for the user, and how should the UI communicate it?
8. Why mount a form modal only while it's open?
9. Why must role-based UI still handle 403 responses?
10. What is a Playwright route's priority when several match, and how did that shape `fakeEmptyWorkspace`?

## 9. Practical exercises
1. Add a "Tasks" column showing how many tasks use each category. Which endpoint would you call, and how many requests
   would it cost? Is it worth it?
2. Sort by name descending, copy the URL, open it in a new tab. Explain what restored the order.
3. As a regular user, try `fetch('http://localhost:5075/api/categories', { method: 'POST' … })` from the browser console
   with your token. What status do you get, and where is it enforced?
4. Make the delete confirmation require typing the category name when more than 10 tasks use it.
5. Add a test for renaming a category to a name that differs only in case from another one.
