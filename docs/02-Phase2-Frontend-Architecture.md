# Phase 2 — Frontend Architecture

> Status: **✅ Verified — approved 2026-11-26** (decisions D1–D6 in §18 approved). This phase is design only; no application code is written.
> Builds on: [Phase 1 — Requirements and UI/UX Design](01-Phase1-Requirements-and-UI-Design.md) (approved).
> The short code fragments below only illustrate **shapes** (types, signatures). Full implementations come in later phases.

---

## 1. React architecture in simple words

### 1.1 What we are building
A **Single-Page Application (SPA)**. The browser downloads one HTML page plus JavaScript once. After that,
moving between "pages" doesn't reload anything: React swaps components on screen and fetches **only data**
(JSON) from the ASP.NET Core API.

```
 Browser                                                     Server
┌──────────────────────────────────────────────┐
│ index.html + JS bundle (downloaded once)     │  static files (any web server / CDN)
│                                              │
│  React Router: URL → which page component    │
│  Components: render UI from data              │      JSON over HTTPS
│  TanStack Query: fetch + cache server data ───┼──────────────────────►  ASP.NET Core Web API
│  Axios: HTTP, Bearer token, refresh, errors   │ ◄──────────────────────  (the monolith)
└──────────────────────────────────────────────┘
```

### 1.2 Four ideas everything else is built on

| Idea | Simple explanation | Why it matters to us |
|---|---|---|
| **Components** | A UI is a tree of small functions. Each takes inputs (*props*) and returns what to show. | We build `Button`, `TaskCard`, `TaskTable` once and reuse them everywhere. |
| **One-way data flow** | Data goes **down** through props; events go **up** through callbacks (`onSave`). | When something looks wrong you know where to look: whoever owns the data. |
| **State → UI** | You never edit the screen directly. You change *state*, and React re-renders. `UI = f(state)`. | No manual DOM code and no "screen out of sync with data" bugs. |
| **Hooks** | Functions starting with `use` that give a component memory (`useState`), side effects (`useEffect`) or shared logic (`useTasks`). | Logic like "load tasks with filters" lives in one custom hook that many components can use. |

### 1.3 Where things happen at runtime
```
main.tsx ─► <App> ─► <AppProviders>            (QueryClient, Theme, Auth, Toasts: app-wide services)
                       └─► <RouterProvider>     (URL decides the page)
                             └─► <AppLayout>    (sidebar + topbar + <Outlet/>)
                                   └─► <TasksPage>                 (page = composition, reads URL)
                                         ├─► useTasks(filters)    (hook = data)
                                         └─► <TaskTable tasks />  (component = presentation)
```

---

## 2. Component-based architecture

### 2.1 Four layers of components
```
┌────────────────────────────────────────────────────────────────────────────┐
│ 4. PAGES          features/*/pages        TasksPage, ProjectDetailsPage     │  route targets; read URL; compose
├────────────────────────────────────────────────────────────────────────────┤
│ 3. FEATURE UI     features/*/components   TaskTable, TaskForm, KanbanBoard  │  know the domain (Task, Project)
├────────────────────────────────────────────────────────────────────────────┤
│ 2. COMPOSITES     components/{forms,tables,feedback,charts,layout}          │  generic but bigger: DataTable,
│                                           FormField, ConfirmDialog, AppShell│  Pagination, EmptyState
├────────────────────────────────────────────────────────────────────────────┤
│ 1. PRIMITIVES     components/common       Button, Input, Badge, Modal       │  no domain knowledge at all
└────────────────────────────────────────────────────────────────────────────┘
        A layer may use layers BELOW it, never above. A Button never knows what a Task is.
```

### 2.2 Container vs presentational (the "data vs. look" split)

| | Container (page / hook) | Presentational component |
|---|---|---|
| Knows about | URL, TanStack Query, permissions, navigation | Only its props |
| Example | `TasksPage` uses `useTasks()` and `useTaskFilters()` | `TaskTable({ tasks, onSort, sort })` |
| Testing | Integration test with MSW | Simple render test with props |

This is **not** a strict rule to obey everywhere. It's a habit: keep data fetching out of reusable UI so the UI
can be reused and tested easily.

### 2.3 Composition over configuration
Prefer `children` and small parts over components with 25 boolean props:
```tsx
<Card>
  <Card.Header title="Upcoming deadlines" action={<Button variant="ghost">View all</Button>} />
  <Card.Body>…</Card.Body>
</Card>
```

---

## 3. Folder structure

### 3.1 Principle: **feature-first, shared second**
Code that belongs to **one** feature lives **inside that feature**. Only code used by **two or more** features
moves to the shared top-level folders. This keeps related files together, so deleting or changing a feature
touches one folder, and it stops `components/` from turning into a 200-file junk drawer.

### 3.2 The tree

```
01-MonolithicArchitecture-TaskManagementSystem-Frontend/
├── index.html                    HTML shell; tiny inline script applies the saved theme before React loads (no flash)
├── package.json                  scripts + dependencies
├── vite.config.ts                Vite: React plugin, @ alias, dev server port 3000, Vitest config
├── tsconfig*.json                strict TypeScript settings (app / node / tests)
├── eslint.config.js              ESLint flat config (TS, React hooks, a11y, import boundaries)
├── .prettierrc                   formatting rules
├── playwright.config.ts          E2E: browsers, base URL, mobile/tablet/desktop projects
├── .env.example                  documented env variables (committed); real .env files are git-ignored
├── public/                       files served as-is (favicon, robots.txt)
├── docs/                         phase documents (this file)
│
├── src/
│   ├── main.tsx                  entry point: mounts <App/> into #root, imports global CSS
│   ├── App.tsx                   <AppProviders> + <RouterProvider>; nothing else
│   │
│   ├── app/                      APPLICATION WIRING (no business logic)
│   │   ├── providers/
│   │   │   ├── AppProviders.tsx  composes all providers in the correct order
│   │   │   └── queryClient.ts    TanStack QueryClient: defaults for retry, staleTime, global error hooks
│   │   └── router/
│   │       ├── router.tsx        the route tree (createBrowserRouter), lazy-loaded pages
│   │       ├── paths.ts          route path constants + builders: paths.project(12) → "/projects/12"
│   │       └── guards/           RequireAuth, RequireGuest, RequireRole (layout routes)
│   │
│   ├── api/                      HTTP INFRASTRUCTURE (shared by all features)
│   │   ├── client.ts             the single Axios instance (baseURL, timeout, JSON)
│   │   ├── interceptors.ts       request: Bearer token · response: 401 → refresh → retry, error normalisation
│   │   ├── apiError.ts           ApiError class + parseProblemDetails(): one error shape for the whole app
│   │   ├── generated/schema.ts   types GENERATED from the backend's /openapi/v1.json (never edited by hand)
│   │   └── queryKeys.ts          root query-key helpers shared across features
│   │
│   ├── services/                 BROWSER-SIDE INFRASTRUCTURE (no HTTP, no React)
│   │   ├── tokenStorage.ts       access token in memory, refresh token in localStorage (Phase 1, decision A1)
│   │   ├── sessionSync.ts        cross-tab: Web Lock for refresh, BroadcastChannel for login/logout events
│   │   └── preferencesStorage.ts theme + device preferences in localStorage (versioned keys)
│   │
│   ├── contexts/                 APP-WIDE REACT CONTEXTS that are not a feature
│   │   ├── ThemeContext.tsx      theme: 'light' | 'dark' | 'system' + resolved theme
│   │   └── ToastContext.tsx      toast queue: toast.success(), toast.error(apiError)
│   │
│   ├── features/                 ONE FOLDER PER BUSINESS AREA (see §3.3 for the inside of one)
│   │   ├── auth/                 login, register, reset, confirm email, AuthProvider, useAuth, session logic
│   │   ├── dashboard/            stat cards, charts, upcoming/overdue/recent widgets
│   │   ├── projects/             list, details, members, create/edit
│   │   ├── categories/           list + CRUD (Admin)
│   │   ├── tasks/                list, details, create/edit, assign, status, filters
│   │   ├── board/                Kanban (dnd-kit), status transition rules
│   │   ├── comments/             comment thread used inside task details
│   │   ├── team/                 team page + member profile (from project members)
│   │   ├── users/                profile (me) + admin user management
│   │   ├── admin/                admin hub page
│   │   └── settings/             account, security, appearance, preferences tabs
│   │
│   ├── components/               SHARED UI (no feature knowledge)
│   │   ├── common/               primitives: Button, IconButton, Input, Select, Badge, Avatar, Card, Modal, Tabs, Spinner, Skeleton…
│   │   ├── layout/               AppShell, Sidebar, Topbar, Breadcrumbs, PageHeader, AuthLayout, MobileDrawer
│   │   ├── forms/                FormField, TextField, PasswordField, DateTimeField, FormErrorSummary, SubmitButton
│   │   ├── tables/               DataTable, Pagination, SortableHeader, TableSkeleton, ResponsiveList
│   │   ├── charts/               ChartCard, DonutChart, BarChart, ProgressBar (Recharts wrappers + a11y fallback)
│   │   └── feedback/             EmptyState, ErrorState, ErrorBoundary, ConfirmDialog, Banner, Toaster, PageLoader
│   │
│   ├── hooks/                    SHARED HOOKS: useDebounce, useMediaQuery, useDisclosure, useUrlState, useDocumentTitle
│   ├── types/                    SHARED TYPES: friendly aliases over generated DTOs (Task, Project, PagedResult<T>…)
│   ├── schemas/                  SHARED ZOD PIECES: email, password, requiredString(max), futureDateTime, guid
│   ├── utils/                    PURE FUNCTIONS: dates (UTC ↔ local), format, cn(), initials, searchParams helpers
│   ├── constants/                enums as arrays + labels/colours: TASK_STATUSES, PRIORITY_META, ROLES, PAGE_SIZES
│   ├── assets/                   images/illustrations imported by code (empty-state SVGs, logo)
│   └── styles/
│       ├── index.css             Tailwind import + @theme tokens (colours, fonts, radius) + base styles
│       └── themes.css            CSS variables for light and dark (the design tokens from Phase 1 §5)
│
└── tests/
    ├── setup/                    Vitest setup: jest-dom matchers, MSW server start/reset/close, browser API polyfills
    ├── mocks/
    │   ├── handlers/             MSW handlers per API area (auth.ts, tasks.ts…), typed with the generated DTOs
    │   ├── factories/            test-data builders: buildTask({ status: 'Done' }), buildUser({ roles: ['Admin'] })
    │   └── server.ts             setupServer(...handlers)
    ├── utils/renderWithProviders.tsx   render(ui, { route, user }) with Router + QueryClient + Auth + Theme
    ├── unit/                     mirrors src/: unit/utils/dates.test.ts, unit/features/tasks/permissions.test.ts …
    ├── integration/              page/feature flows with MSW: login.test.tsx, task-crud.test.tsx …
    └── e2e/                      Playwright specs against the real API + fixtures (seeded admin, email reader)
```

### 3.3 Inside one feature (example: `features/tasks/`)
```
features/tasks/
├── api/
│   ├── tasksApi.ts          one typed function per endpoint: getTasks(params), createTask(body), changeStatus(id, status)…
│   └── taskKeys.ts          query-key factory: taskKeys.list(params), taskKeys.detail(id)
├── hooks/
│   ├── useTasks.ts          useQuery wrappers (list, detail)
│   ├── useTaskMutations.ts  useMutation wrappers + cache invalidation + toasts
│   └── useTaskFilters.ts    reads/writes filters, sort and page in the URL
├── components/              TaskTable, TaskCard, TaskForm, TaskFilters, StatusBadge, PriorityBadge, AssigneePicker…
├── pages/                   TasksPage.tsx, TaskDetailsPage.tsx (lazy-loaded by the router)
├── schemas/taskSchemas.ts   Zod schemas for create/edit forms (limits copied from backend validators)
├── permissions.ts           canEditTask, canDeleteTask, canAssignTask, allowedNextStatuses (pure functions)
├── types.ts                 feature-only types (TaskFilters, TaskFormValues)
└── index.ts                 PUBLIC API of the feature: what other features may import
```
Not every feature needs every folder. A folder appears only when there is something to put in it.

### 3.4 Dependency rules (enforced by ESLint `no-restricted-imports`)
```
 app ───────────► features ───────────► components, hooks, utils, schemas, constants, types
  │                   │                                    │
  └──► api, services, contexts ◄──────────────────────────┘ (shared layers may use api/services/contexts)

 ✔ features/tasks  → components/common/Button          shared code
 ✔ features/board  → features/tasks (via index.ts)     public API only
 ✘ features/board  → features/tasks/components/TaskCard.tsx   reaching into another feature's internals
 ✘ components/*    → features/*                        shared code must not know about features
 ✘ anything        → app/*                             wiring sits on top; nothing depends on it
```
All imports use the `@/` alias (`@/components/common/Button`), never `../../../`.

### 3.5 Why `api/` and `services/` both exist
They were both in your suggested structure, and without a rule they would overlap. The rule:
- **`api/`** = talking **HTTP** to the backend (Axios, interceptors, errors, generated DTO types).
- **`services/`** = **browser** infrastructure that is neither HTTP nor React (token storage, cross-tab sync, localStorage).
- Feature-specific endpoint functions live in **`features/*/api/`**, not in `services/`.

---

## 4. Routing strategy

### 4.1 Tools and principles
- **React Router, data router** (`createBrowserRouter`) with **nested routes**: layouts render an `<Outlet/>`.
- **Lazy routes**: each page is a separate JavaScript chunk loaded on first visit (code splitting, Phase 16).
- **TanStack Query owns data**. We do **not** use React Router loaders for fetching; two caches would fight.
- **The URL is state.** Filters, sort, page, tabs and the selected board project live in the URL, so
  Back/Forward, refresh and shared links all work.
- **Route `handle`** carries metadata: `{ breadcrumb, title }`. `Breadcrumbs` reads it with `useMatches()`.
- **`errorElement`** on layout routes: a crash inside one page shows an error panel, and the shell stays usable.

### 4.2 Route tree
```
/                                     → redirect /dashboard
├─ <RequireGuest> + <AuthLayout>      (logged-in users are redirected to /dashboard)
│   ├─ /login
│   ├─ /register
│   ├─ /register/success
│   ├─ /forgot-password
│   └─ /reset-password                ?email&token      (path fixed by backend email)
├─ <AuthLayout>   /confirm-email      ?userId&token     (works logged in OR out; path fixed by backend email)
├─ <RequireAuth> + <AppLayout>        (not logged in → /login?returnUrl=<current url>)
│   ├─ /dashboard
│   ├─ /tasks                          ?assignedToMe&projectId&status&priority&categoryId&assignedToId
│   │                                   &dueFrom&dueTo&overdue&search&sortBy&sortDirection&page&pageSize
│   ├─ /tasks/:taskId
│   ├─ /board                          → last used project, or a project picker
│   ├─ /projects                       ?search&ownedByMe&sortBy&sortDirection&page&pageSize&view=grid|table
│   ├─ /projects/:projectId            → index = Overview
│   │   ├─ tasks · board · members
│   ├─ /categories
│   ├─ /team · /team/:userId
│   ├─ /profile
│   ├─ /settings/:tab                  account | security | appearance | preferences
│   ├─ <RequireRole roles={['Admin']}> (otherwise → /forbidden)
│   │   ├─ /admin
│   │   └─ /admin/users · /admin/users/:userId
│   └─ /forbidden
└─ *                                   → NotFoundPage
```

### 4.3 Guards: how they work
```
RequireAuth:  status 'initializing' → full-page loader (silent refresh in progress)
              status 'anonymous'    → <Navigate to="/login?returnUrl=…" replace>
              status 'authenticated'→ <Outlet/>
RequireRole:  user.roles ∩ allowed = ∅ → <Navigate to="/forbidden" replace>
```
Guards only improve UX. If someone bypasses them, the API still answers 401/403 and we show the right screen.

### 4.4 `returnUrl` safety
After login we navigate to `returnUrl` **only if it is a relative in-app path** (starts with `/`, not `//`).
Otherwise anyone could craft `/login?returnUrl=https://evil.example` (an *open redirect*).

---

## 5. State management

### 5.1 Five kinds of state, five homes, no global store library

| Kind | Example | Home | Why there |
|---|---|---|---|
| **Server state** | tasks, projects, dashboard, current user's profile | **TanStack Query** | It's a *cache* of data owned by the server. It needs fetching, caching, refetching, invalidation, retries and loading/error flags, which TanStack Query does for us. |
| **URL state** | filters, sort, page, active tab, board project | **URL search params** (`useSearchParams` via `useUrlState`) | Shareable, bookmarkable, survives refresh, Back button works. |
| **Auth state** | `status`, `user`, `login()`, `logout()` | **AuthContext** + `services/tokenStorage` | Needed everywhere, changes rarely. Tokens live outside React so Axios can read them without hooks. |
| **App UI state** | theme, toasts, sidebar collapsed | **ThemeContext**, **ToastContext**, localStorage | App-wide, tiny, changes rarely. Context is enough. |
| **Form state** | field values, touched, errors, submitting | **React Hook Form** | Uncontrolled inputs: typing doesn't re-render the whole form. |
| **Local UI state** | modal open, dropdown open, hover | **`useState`** in the component | Nobody else needs it. Keep state as close to where it's used as possible. |

### 5.2 Decision flow for any new piece of state
```
Does the server own it?            ── yes ──► TanStack Query
        │ no
Should a link/refresh keep it?     ── yes ──► URL search params
        │ no
Is it a form field?                ── yes ──► React Hook Form
        │ no
Do distant components need it?    ── yes ──► Context (only if it changes rarely)
        │ no
                                          ──► useState / useReducer in the component
```

### 5.3 Why no Redux / Zustand
Most "global state" in typical apps is really *server state* (now handled by TanStack Query) or *URL state*.
What's left (auth, theme, toasts) is small and changes rarely, which is exactly what Context is good at.
Adding a store library would give two ways to do the same thing. We can revisit if a real need appears.

### 5.4 Context performance rule
Context re-renders all its consumers when its value changes. So: keep contexts **small and separate**
(theme ≠ auth ≠ toasts), memoize the value object, and never put fast-changing data (like form input) in context.

---

## 6. Authentication architecture

### 6.1 Pieces and responsibilities
```
┌───────────────────────── React world ─────────────────────────┐   ┌──────────── outside React ────────────┐
│ AuthProvider (features/auth)                                  │   │ services/tokenStorage                  │
│   state: status, user                                         │   │   accessToken (memory variable)        │
│   login(), logout(), logoutAll(), refreshProfile()            │──►│   refreshToken (localStorage)          │
│ useAuth()  → { status, user, isAdmin, isVerified, … }         │   │   expiresAt                            │
│ RequireAuth / RequireRole                                     │   │ services/sessionSync                   │
└───────────────────────────────────────────────────────────────┘   │   withRefreshLock() (Web Locks API)    │
                     ▲  "session-expired" / "logged-out" events      │   broadcast('logout' | 'login')        │
┌──────────────────── api/ ────────────────────────────────────┐   └────────────────────────────────────────┘
│ client.ts + interceptors.ts                                   │                 ▲
│   request:  Authorization: Bearer <accessToken>               │─────────────────┘
│   response: 401 → refreshSession() (single-flight) → retry 1× │
│   refresh fails → emit "session-expired"                      │
└───────────────────────────────────────────────────────────────┘
```

### 6.2 Auth status state machine
```
             app start
                 │
                 ▼
          ┌─────────────┐  no refresh token        ┌───────────┐
          │ initializing│ ───────────────────────► │ anonymous │ ◄──────────────┐
          └─────────────┘                          └───────────┘                │
                 │ refresh OK → GET-less: user comes  │ login OK                 │ logout / refresh 401 /
                 │ from AuthResponse.user             ▼                          │ password changed / other
                 └──────────────────────────► ┌───────────────┐                  │ tab logged out
                                              │ authenticated │ ─────────────────┘
                                              └───────────────┘
```
On app start, if a refresh token exists, we call `POST /api/auth/refresh` once. That call returns new tokens
**and** the user (`AuthResponse.user`), so a page reload costs one request and no extra `/me` call.

### 6.3 Refresh rules (from Phase 1 §14.3, now as architecture)
1. **Single-flight in the tab:** one module-level `refreshPromise`. Concurrent 401s await the same promise.
2. **Across tabs:** `navigator.locks.request('tms-auth-refresh', …)`. Inside the lock, re-read the stored refresh
   token. If it changed (another tab already rotated it), adopt the new tokens instead of calling `/refresh`.
   This matters because the backend treats a reused refresh token as theft and revokes **every** session.
3. **Proactive:** a timer refreshes about 60 s before `accessTokenExpiresAtUtc`.
4. **No loops:** requests to `/auth/login`, `/auth/refresh`, `/auth/logout` and `/auth/register` are never retried
   by the 401 interceptor. Each request is retried **at most once** (`config._retry`).
5. **Logout:** `POST /auth/logout {refreshToken}` (best effort), then always clear tokens, `queryClient.clear()`
   (so the next user never sees cached data), broadcast `logout`, and navigate to `/login`.
6. **Email verified later:** after `confirm-email` succeeds while logged in, force a refresh so the new
   `email_verified=true` claim takes effect, then update the user.
7. **Never log tokens.** No `console.log` of headers or auth responses, and the error parser strips request headers.

---

## 7. API communication strategy

### 7.1 Layers and the rule for each
```
Component ── uses ──► feature hook ── calls ──► feature api fn ── uses ──► apiClient ──► API
 (no axios)          (TanStack Query)          (typed, 1 per endpoint)   (Axios instance)
```
| Layer | May | May not |
|---|---|---|
| Component | call hooks, render | import Axios or `api/` directly |
| Feature hook | `useQuery` / `useMutation`, invalidate, toast | know URLs |
| Feature api fn | build URL + params, return typed data | use React, show toasts |
| `apiClient` | auth header, refresh, error normalisation | know any feature |

### 7.2 Types: generated from the backend, not hand-copied (**decision D1**)
- `npm run api:types` runs **openapi-typescript** against `http://localhost:5075/openapi/v1.json` and writes
  `src/api/generated/schema.ts`. This is *types only* and adds nothing to the bundle.
- `src/types/api.ts` exports friendly names: `type Task = components['schemas']['TaskResponse']`.
- If the backend contract changes, regenerating makes TypeScript **fail to compile** wherever the frontend is
  out of date. That's the "backend DTOs are the source of truth" rule, enforced by the compiler.
- Enums arrive as string unions (`'Todo' | 'InProgress' | …`) because the backend uses `JsonStringEnumConverter`.
- The generated file is committed, so building doesn't need a running backend.

### 7.3 Query-key factories
```ts
export const taskKeys = {
  all:     ['tasks'] as const,
  lists:   () => [...taskKeys.all, 'list'] as const,
  list:    (params: TaskQuery) => [...taskKeys.lists(), params] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail:  (id: number) => [...taskKeys.details(), id] as const,
};
```
Hierarchical keys allow precise invalidation: `invalidateQueries({ queryKey: taskKeys.lists() })` refreshes
every task list (any filters) but leaves task details alone.

### 7.4 Mutations: three patterns

| Pattern | When | Example |
|---|---|---|
| **Invalidate after success** (default) | Create/delete, or the change affects many lists | create task → invalidate `taskKeys.lists()`, `['dashboard']`, project detail |
| **Write the response into the cache** | API returns the updated object | edit task → `setQueryData(taskKeys.detail(id), updated)` + invalidate lists |
| **Optimistic update + rollback** | Instant feedback matters, and failure is rare | Kanban drag: `onMutate` moves the card and snapshots the cache; `onError` restores the snapshot and shows a toast; `onSettled` invalidates |

### 7.5 One error shape for the whole app
```ts
type ApiErrorKind = 'network' | 'timeout' | 'validation' | 'unauthorized' | 'forbidden'
                  | 'notFound' | 'conflict' | 'businessRule' | 'server' | 'unknown';

class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;                       // 400, 401, …
  title?: string; detail?: string;       // from ProblemDetails
  fieldErrors: Record<string, string[]>; // ProblemDetails.errors, keys already camelCase
  correlationId?: string;                // body.correlationId or X-Correlation-ID header
}
```
- Every Axios error goes through `parseProblemDetails()` in the response interceptor, so hooks and components
  only ever see `ApiError` and never raw Axios errors.
- Field keys like `roles[0]` are converted to React Hook Form paths (`roles.0`) by `applyServerErrors(form, error)`.
- 409/422 responses have no `errors` object, only `detail`. Each form says which field they belong to,
  e.g. category create: `{ 409: 'name' }`.

### 7.6 TanStack Query defaults (`app/providers/queryClient.ts`)
| Setting | Value | Why |
|---|---|---|
| `staleTime` | 30 s (per-query overrides from Phase 1 §14.2) | Avoids refetching on every mount |
| `retry` | up to 2× for `network`/`timeout`/`server` only | Never retry 4xx: it won't succeed |
| `refetchOnWindowFocus` | true | Fresh data when the user comes back |
| mutations `retry` | 0 | Never repeat a write automatically |
| global `onError` (QueryCache) | toast for background-refetch failures only | Pages show their own error states for first loads |

---

## 8. Reusable component strategy

### 8.1 Rules
1. **Accessible by default.** Correct roles, labels, focus management and keyboard support are built into the
   primitive, so feature code can't forget them.
2. **Variants, not one-offs.** `Button` has `variant` (primary/secondary/ghost/danger) and `size` (sm/md). A new
   look means a new variant, not a `className` override in a page.
3. **Forward the basics.** Primitives accept `className` (merged with `cn()`), forward `ref`, and pass native props
   through (`...rest`), so `<Button type="submit" disabled>` just works.
4. **Controlled or uncontrolled**, consistently: inputs work with React Hook Form's `register` *and* `Controller`.
5. **No data fetching in shared components.** `AssigneePicker` receives `options`; the feature hook fetches them.
6. **Promote, don't predict.** A component moves to `components/` the second time a feature needs it, not before.

### 8.2 Behaviour primitives: Radix UI (**decision D2**)
Dialogs, dropdown menus, tooltips, popovers, tabs and selects are hard to make fully accessible: focus trapping,
Escape, `aria-*`, typeahead, collision-aware positioning. **Radix UI primitives** are unstyled, so we style them
with Tailwind and keep full control of the look. They give us that behaviour already tested.
Alternative: build everything by hand, which means more code, more bugs and more tests for an already-solved problem.

### 8.3 Styling approach
- **Tailwind CSS v4** with design tokens from Phase 1 §5 as CSS variables in `styles/themes.css`, exposed to
  Tailwind via `@theme` (`bg-surface`, `text-muted`, `bg-primary`).
- **Dark mode** = `class="dark"` on `<html>`. Because every component uses tokens, both themes come from one set of classes.
- `cn()` = `clsx` + `tailwind-merge`, so `className` overrides resolve conflicts correctly (`px-2` vs `px-4`).
- Status/priority colours live in `constants/taskMeta.ts` (one map: label + icon + classes), never repeated in components.

---

## 9. Forms architecture
```
Zod schema (features/*/schemas) ──► zodResolver ──► useForm<FormValues>
     │ limits copied from backend validators          │ register / Controller
     │ (title ≤ 200, description ≤ 4000, …)           ▼
     │                                   <FormField label error hint> + <TextField …>
     ▼                                                │ submit
 shared pieces (schemas/): email, password,           ▼
 requiredString(max), futureDateTime            useMutation ──► ApiError ──► applyServerErrors(form, err)
```
- **Client validation is for speed and UX. Server validation is the authority.** Both always run.
- Password rules mirror the backend exactly: 8–128 characters, upper, lower, digit, special character.
- **Dates:** forms hold *local* date-time values. Conversion to UTC ISO (`dueDateUtc`) happens in **one** utility
  when building the request. Project `startDate`/`endDate` are plain `yyyy-MM-dd` strings with **no** time zone conversion.
- The due-date "in the future" rule applies on create, and on edit **only if the date changed** (same as backend).
- Submit button shows a spinner and is disabled while submitting. Double submits are impossible.

---

## 10. Error handling architecture (layers, from smallest to largest)

| Layer | Handles | UI |
|---|---|---|
| Field | Zod errors, server `errors[field]` | red text under the field, `aria-invalid`, focus first invalid field |
| Form | server errors without a field (409/422 `detail`) | `FormErrorSummary` at the top of the form |
| Mutation | failed write not tied to a form (delete, drag) | toast with message + correlation id |
| Query (first load) | page/widget data failed | `ErrorState` with **Retry** in place of the content |
| Query (background) | refetch failed while old data is shown | small toast, old data stays visible |
| 401 | session | handled centrally by the interceptor (refresh or log out) |
| 403 / 404 | access / existence | page-level `ForbiddenState` / `NotFoundState` |
| Render crash | bug in a component | route `errorElement` / `ErrorBoundary`: "Something went wrong" + Reload, shell keeps working |

---

## 11. Testing architecture

| Concern | Decision |
|---|---|
| Runner | **Vitest** (shares Vite config and aliases), environment **jsdom** |
| Component tests | **React Testing Library** + **user-event**. Query by role/label/text, as a user would |
| HTTP mocking | **MSW** at the network level, so the real Axios client and interceptors run in tests |
| Shared render | `renderWithProviders(ui, { route, user, queryClient })`: fresh QueryClient per test (retry off) |
| Test data | factories in `tests/mocks/factories`, typed with generated DTOs (a contract change breaks them too) |
| Layout | your structure: `tests/unit` (mirrors `src/`), `tests/integration`, `tests/e2e` |
| E2E | **Playwright** against the real API + test database. Email links read from the backend's pickup folder. `@axe-core/playwright` for a11y. Mobile, tablet and desktop projects |
| Coverage | Vitest v8 coverage, reported from Phase 15 (target ≥ 80 % lines on `src/`, excluding generated code) |

---

## 12. Code conventions

| Topic | Convention |
|---|---|
| TypeScript | `strict: true`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes: false` (works better with React Hook Form); no `any` (ESLint error) |
| Components | `PascalCase.tsx`, one exported component per file, **named exports** (better refactoring and search) |
| Hooks | `useCamelCase.ts`, always start with `use` |
| Other files | `camelCase.ts` (`tasksApi.ts`, `dates.ts`) |
| Types | `type` for unions and aliases, `interface` for component props and object shapes |
| Imports | `@/` alias; order enforced by ESLint |
| Booleans | `is/has/can` prefixes: `isOverdue`, `canAssign` |
| Event props | `onX` for props, `handleX` for the handler inside the component |
| Comments | explain **why**, not what |

---

## 13. Dependencies (installed in Phase 3, versions pinned after checking npm)

**From your stack:** react, react-dom, typescript, vite, @vitejs/plugin-react, tailwindcss (+ @tailwindcss/vite),
react-router, axios, @tanstack/react-query, react-hook-form, zod, @hookform/resolvers, recharts, lucide-react,
@dnd-kit/core, @dnd-kit/sortable, vitest, @testing-library/react, @testing-library/jest-dom, msw, @playwright/test,
eslint, prettier.

**Additions that need your approval (decision D3):**

| Package | Type | Why |
|---|---|---|
| `@radix-ui/react-dialog`, `-dropdown-menu`, `-tooltip`, `-popover`, `-tabs`, `-select`, `-toast` | runtime | accessible behaviour primitives (D2) |
| `clsx`, `tailwind-merge` | runtime, tiny | `cn()` class merging |
| `@fontsource-variable/inter` | runtime | self-hosted font (no external CDN) |
| `openapi-typescript` | dev | generate DTO types (D1) |
| `@testing-library/user-event`, `jsdom`, `@vitest/coverage-v8` | dev | realistic interaction, DOM, coverage |
| `@tanstack/react-query-devtools` | dev only | inspect the cache while learning (not in the production bundle) |
| `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-plugin-jsx-a11y`, `typescript-eslint`, `eslint-config-prettier` | dev | lint rules |
| `@axe-core/playwright` | dev | automated accessibility checks |

**Deliberately not added:** Redux/Zustand (§5.3), date-fns/dayjs (native `Intl` is enough), a CSS-in-JS
library, a full component kit (MUI/AntD: heavy, and harder to match the Phase 1 design), class-variance-authority
(a small variant map per component is enough).

---

## 14. Data flow walkthrough: "change a task's status on the board"
```
1. User drops card "Fix login bug" from In Progress onto In Review.
2. KanbanBoard checks allowedNextStatuses(task, user, project) → 'InReview' allowed ✔
3. useChangeTaskStatus().mutate({ id: 142, status: 'InReview' })
4.   onMutate: cancel board queries · snapshot cache · move card in cache → UI updates instantly
5.   tasksApi.changeStatus → apiClient PATCH /api/tasks/142/status { "status": "InReview" }
6.     request interceptor adds "Authorization: Bearer …"
7.     ── access token expired → 401 → refresh (lock) → new tokens → retry PATCH ──
8.   200 TaskResponse → onSuccess: write task into detail cache
     409 / 403 / network → onError: restore snapshot (card jumps back) · toast "Can't move to In Review: …"
9.   onSettled: invalidate board columns + dashboard → background refetch confirms server truth
```

---

## 15. Common mistakes and best practices

| Mistake | Better |
|---|---|
| Copying server data into `useState` and syncing it with `useEffect` | Read it from TanStack Query; derive values while rendering |
| `useEffect` + `fetch` in components | Query hooks: caching, dedupe, race conditions, loading/error all handled |
| One huge `AppContext` with everything | Small separate contexts; server data never in context |
| Filters in `useState` (lost on refresh, Back breaks) | Filters in the URL |
| Treating hidden buttons as security | The backend enforces. UI hiding is UX only, and 403 is still handled |
| Storing the access token in `localStorage` | Access token in memory. Only the refresh token persists (documented trade-off) |
| Two tabs refreshing at once | Web Lock + re-read token (rotation-reuse would revoke all sessions) |
| Retrying 4xx errors | Retry only network/5xx; mutations never auto-retry |
| `../../../` imports, features reaching into each other | `@/` alias + feature `index.ts` + ESLint boundaries |
| Converting dates in many places | One `utils/dates.ts`; UTC on the wire, local on screen |
| Testing implementation details (state, class names) | Test what the user sees and does |

---

## 16. Interview questions
1. What is the difference between server state and client state? Why does it matter for tool choice?
2. Why might keeping filters in the URL be better than keeping them in component state?
3. When is React Context a bad choice for state?
4. Explain optimistic updates. What must you do if the request fails?
5. Why keep the access token in memory but the refresh token in storage? What are the risks?
6. How do you prevent ten simultaneous 401 responses from triggering ten refresh calls? And across tabs?
7. What is an open redirect, and how can a `returnUrl` parameter cause one?
8. Why generate TypeScript types from OpenAPI instead of writing them by hand?
9. What does "feature-first" folder structure mean, and what problem does it solve?
10. What is code splitting, and how do lazy routes achieve it?

## 17. Practical exercises
1. Using §5.2, decide where each of these belongs: (a) the comment draft being typed, (b) the selected Kanban
   project, (c) the list of categories, (d) whether the sidebar is collapsed, (e) the logged-in user's roles.
2. Write (on paper) the query keys that must be invalidated after **assigning** a task. Check your answer against Phase 1 §14.2.
3. Draw the sequence for: access token expired **and** refresh token revoked (password changed in another browser).
4. Which folder would `formatRelativeTime()`, `ProjectCard`, `useDebounce` and `canAssignTask` go into, and why?

---

## 18. Decisions — all approved (2026-11-26)

| # | Decision | Outcome |
|---|---|---|
| D1 | Generate DTO types from `/openapi/v1.json` with openapi-typescript (committed output) instead of hand-written interfaces | ✅ Approved |
| D2 | Use unstyled **Radix UI** primitives for dialog, dropdown, tooltip, popover, tabs, select, toast | ✅ Approved |
| D3 | Approve the additional packages in §13 | ✅ Approved |
| D4 | Feature-first folder structure (§3) with ESLint-enforced boundaries | ✅ Approved |
| D5 | No React Router loaders; TanStack Query is the only data cache | ✅ Approved |
| D6 | Tests in `tests/unit` (mirrors `src/`), `tests/integration`, `tests/e2e`, as in your suggested structure | ✅ Approved |
