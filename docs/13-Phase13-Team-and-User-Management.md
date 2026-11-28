# Phase 13 — Team and User Management

> Status: **✅ Verified — approved 2026-11-28**. Builds on [Phase 12 — Kanban board and comments](12-Phase12-Kanban-Board-and-Comments.md).
> Try it: **Profile** (account menu), **Team**, and as an Admin **Admin › Users**.

## 1. What this phase does, in simple words

- **Profile:** see your account and change your name and job title.
- **Team:** everyone in your projects, and a page per person showing your shared projects and their tasks.
- **Admin:** account counts, a user directory, and per-user **roles** and **activation**.

## 2. The backend contract (read from the code)

| Endpoint | Who | Notes |
|---|---|---|
| `GET /api/users` | **Admin + verified** | paged; `Search` (email, first or last name), `Role`, `IsActive`, `SortBy` Email (default) · Name · CreatedAt · LastLogin; direction Asc for Email/Name, Desc otherwise |
| `GET /api/users/{id}` | **Admin, or yourself** | anyone else → 403 (`UserAuthorizationHandler`) |
| `PUT /api/users/me` | verified | first/last name 1–50, job title ≤ 100 (empty → null) |
| `PUT /api/users/{id}/roles` | Admin + verified | ≥ 1 known role, no duplicates; **removing your OWN Admin role → 422** |
| `PATCH /api/users/{id}/status` | Admin + verified | **deactivating yourself → 422**; deactivation **revokes all sessions** |

- **There is no "team" endpoint, and other people's accounts are Admin-only.** Phase 1 (gap G5, option A)
  decided that Team = the members of my projects, taken from each project's details.
- **Role changes reach existing sessions within 15 minutes.** Roles are read from the database whenever a token
  is issued (sign-in or refresh), and access tokens live 15 minutes. The UI says so.
- There is no "last Admin" rule. Because nobody can remove their own Admin role, at least one Admin always
  remains.

## 3. How it works

### 3.1 Profile
- The account card shows name, job title, roles, email (and whether it's verified), member since, last sign-in.
- The form mirrors the validator. **Save** is only enabled once something has changed, and **Discard** resets.
- After saving, the app **reloads the signed-in user** (`refreshProfile` → `GET /api/auth/me`), so the header,
  menus and "(you)" labels change at once. Lists that show names (projects, tasks, comments) are refetched.
- Unverified accounts see the form disabled, with the reason as text (the API needs a verified email).
- The email can't be changed (no endpoint), and the page says so. Password changes link to Settings › Security.

### 3.2 Admin › Users
- Server-side search, role and status filters, sorting and paging, all kept in the URL (the same pattern as
  projects and tasks). "Last sign-in" and "Joined" sort newest first on the first click.
- Each row shows avatar, name ("(you)" on your own row), email, role badges, Active/Deactivated and Unverified.
- For an Admin whose email isn't verified, the page explains and **doesn't call** the API, which would answer 403.

### 3.3 One account: roles and status
- **Roles editor:** three checkboxes with descriptions.
  - At least one role must stay selected; the form says so before sending.
  - **Your own Admin role is locked**, with the reason shown next to it.
  - A note says changes reach open sessions within 15 minutes.
- **Status:**
  - Deactivating asks first: "*Maya Manager will be signed out on every device and can't sign in until
    reactivated. Their projects, tasks and comments stay.*"
  - On your own account the button is replaced by "You can't deactivate your own account."
- After a change, the account's cached details, the user lists and the member-picker lookups are refreshed,
  so deactivated people disappear from pickers.

### 3.4 Admin overview
Four figures (all users, active, deactivated, admins), each a tiny request (`PageSize=1`, read
`totalCount`) and each a link to the filtered directory. There are also links to the places an Admin manages
(all projects, all tasks, categories), because Admins already see everything in the normal pages.

### 3.5 Team
- `useTeam` reads my projects (up to 100, the API's page limit), loads each project's details in parallel
  (cached under the same keys as the project pages), and merges the members per person, with their projects
  and roles.
- If some projects fail to load, the page says the list may be incomplete and offers a retry. If there are more
  than 100 projects, it says which ones are covered.
- **Member page:** email (mailto), shared projects with role and join date, and their assigned tasks that I can
  see (`GET /api/tasks?AssignedToId=`). Admins also get "Manage account". Someone outside my projects gets
  "Not in your projects".

## 4. Files

| File | Responsibility |
|---|---|
| `src/features/users/api/usersApi.ts` | + directory, details, `/me`, roles, status; `userKeys` hierarchy |
| `src/features/users/hooks/useUsers.ts` | queries + mutations with cache updates; profile save reloads the signed-in user |
| `src/features/users/userRules.ts` | `canAdministerUsers`, role lock, status rule, role ordering, limits |
| `src/features/users/schemas/profileSchema.ts` | mirror of `UpdateProfileRequestValidator` |
| `src/features/users/components/*` | `RoleBadges`, `RolesEditor`, `AccountStatusControl`, `VerifyToAdminister` |
| `src/features/users/pages/*` | `ProfilePage`, `AdminUsersPage`, `AdminUserDetailsPage` |
| `src/features/admin/pages/AdminPage.tsx` | counts + links |
| `src/features/team/hooks/useTeam.ts`, `pages/*` | team aggregation, `TeamPage`, `TeamMemberPage` |

## 5. Problems found and fixed

| # | Found by | Problem | Fix / lesson |
|---|---|---|---|
| 1 | Integration test (accessible names) | A card that was one big link was announced as "Carla Diazcarla@example.testMobileWebsite · Owner" | **Stretched link:** the link holds only the name; `::after` makes the card clickable; projects are a separate labelled list |
| 2 | Full-suite run | Admin-overview test read the second count without waiting (passed alone, failed under load) | Wait for each independent request; stable over 3 runs |
| 3 | Reading the backend first | Role changes don't reach existing sessions at once | Told the admin: "within 15 minutes" |

## 6. Tests

| Level | File | Tests | Covers |
|---|---|---|---|
| Unit | `features/users/userRules` | 6 | Admin + verified; own Admin role locked; no self-deactivation; role ordering; profile limits; trimming and null job title |
| Integration | `users.test.tsx` | 11 | profile save (body, header follows), validation, unverified; directory order and exact query, role/status filters + URL, newest-first sort; unverified admin (no request); overview counts; roles change (≥ 1 role); own account protected; deactivate with confirmation; unknown id |
| Integration | `team.test.tsx` | 4 | merge and de-duplicate across projects with roles; search + URL; member page (shared projects, tasks by `AssignedToId`); outsider |
| **Vitest total** | 62 files | **475** (+21) | ✅ stable over 3 runs |
| E2E (UI) | `users.spec.ts` | 3 × 3 | admin: roles + deactivate (confirmation), own account locked, **axe** list/dialog/dark; profile save → header; Team list + member page + **axe** |
| **Playwright UI total** | | **139** (+2 skipped by design) | ✅ 2 consecutive runs |
| E2E (real API) | `backend/users.backend.spec.ts` | 1 + 1 | regular user: **own account 200, someone else's 403, directory 403, unverified PUT /me 403** + UI notice; after the real email link: profile saved, header follows, survives reload. Admin flow (self-demotion **422**, roles, **deactivate → their login 401**, reactivate → 200) with `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` |
| **Real API total** | | **8 passed, 5 skipped** | ✅ |

## 7. Common mistakes and best practices

| Mistake | Better |
|---|---|
| Building a "team directory" the API doesn't allow | Use what members legitimately share: project memberships |
| Making a whole card one link | Stretched link with a short, meaningful name |
| Letting an admin lock themselves out | Lock their own Admin role / account, and say why |
| Deactivation without saying what happens | Signed out everywhere, can't sign in, data stays |
| Pretending role changes are instant | Say when they take effect (token lifetime) |
| Calling an endpoint you know will 403 | Explain instead (unverified admin) |

## 8. Interview questions
1. Why is "Team" built from project memberships instead of a user list?
2. What is resource-based authorization, and why can't `[Authorize(Roles = …)]` express "yourself or Admin"?
3. How long can a demoted user keep their old rights, and how could the backend shorten that?
4. Why lock your own Admin role in the UI if the API refuses it anyway?
5. What does a screen reader announce for a link that wraps a whole card, and how do you avoid it?
6. Why reload the signed-in user after a profile change rather than patching local state?
7. How would you count users per status without downloading them all?

## 9. Practical exercises
1. Add a "Resend verification email" button for unverified users in Admin › Users. Which endpoint exists?
2. Show "last sign-in" as a relative time with the exact time available to all users (not only on hover).
3. Make the Team page show each person's open task count. What would it cost in requests?
4. Add a confirmation when an Admin grants the Admin role to someone.
5. Propose a backend change that ends a demoted user's rights immediately.
