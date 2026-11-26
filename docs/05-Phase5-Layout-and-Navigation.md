# Phase 5 — Application Layout and Navigation

> Status: **✅ Verified — approved 2026-11-26**. Builds on [Phase 4 — Design System](04-Phase4-Design-System-and-Common-Components.md).
> Try it: `npm run dev` → http://localhost:3000 → you land on **Sign in** → pick a *development preview* account
> (Admin / Manager / User / unverified) → explore the shell. The style guide is at `/design-system`.

## 1. What this phase does, in simple words

Until now the app was a single page. This phase gives it a **skeleton**: a URL for every screen from the
Phase 1 page inventory, a shared frame around them (sidebar, top bar, breadcrumbs), and **doormen** (guards)
that decide who may enter which page. Each feature phase from here on only fills in a page's content. The
address, layout, permissions, title and breadcrumb of every page already exist and are tested.

```
URL ─► React Router matches the route tree ─► layout routes wrap the page
          /projects/12/board
             RootLayout      title "Board · Task Management System", scroll restoration
             RequireAuth     signed in?  no → /login?returnUrl=%2Fprojects%2F12%2Fboard
             AppLayout       sidebar + top bar + breadcrumbs (Projects › Project #12 › Board)
             (errorElement)  a crash below shows an error panel; the shell keeps working
             ProjectDetailsLayout → tabs (Overview · Tasks · Board · Members)
             ProjectBoardPage     ← downloaded on first visit (lazy chunk)
```

## 2. Concepts

### 2.1 Client-side routing
The browser doesn't ask the server for a new HTML page when you click a link. React Router intercepts the
click, updates the address bar with the History API, and renders the matching component. Back/Forward,
bookmarks and refresh still work because **every screen has a real URL**.

### 2.2 Nested and layout routes
Routes form a **tree**. A parent renders an `<Outlet/>` where its matched child appears. A route with an
`element` but **no `path`** is a *layout route*: it wraps children without adding to the URL. That's how
guards and layouts are expressed: `RequireAuth` and `AppLayout` are just components that render `<Outlet/>`
(or a redirect).

### 2.3 Code splitting with lazy routes
```ts
lazy: { Component: async () => (await import('@/features/tasks/pages/TasksPage')).TasksPage }
```
`import()` tells Vite to put that page into its **own file**. The browser downloads it the first time the route
is visited, so the initial download contains only the shell. The production build now has **one chunk per page**
(≈ 0.2–1 kB each at this stage). While a chunk downloads, the old page stays on screen and a thin progress bar
appears at the top (`useNavigation().state === 'loading'`).

**Rule introduced (and enforced by ESLint):** only `src/app/router` may import page files directly. Feature
`index.ts` files export what *other features* need (badges, hooks, permissions), never pages. Otherwise an
eager import of a feature (`AppLayout` → `@/features/auth` for `useAuth`) would pull all its pages into the main
bundle and code splitting would silently stop working.

### 2.4 Route metadata (`handle`)
Each route can carry data. We use `{ breadcrumb, title }`:
```ts
{ path: ':projectId', handle: { breadcrumb: (p) => `Project #${p.projectId}` }, … }
```
`useMatches()` returns every matched route from root to leaf. **Breadcrumbs** turn each `breadcrumb` into a
link, and **RootLayout** sets `document.title` from the deepest one. Screen readers announce the new title on
navigation, so blind users know the page changed.

### 2.5 Guards: UX, not security
| Guard | Rule | Redirect |
|---|---|---|
| `RequireAuth` | must be signed in | `/login?returnUrl=<path+query+hash>` |
| `RequireGuest` | must be signed **out** (login, register…) | safe `returnUrl` or `/dashboard` |
| `RequireRole roles={['Admin']}` | must have one of the roles | `/forbidden` (Access denied) |

They only decide what to *show*. Someone can always edit the JavaScript in their browser, so the ASP.NET Core
API checks every request again (401/403). This is why later phases still handle 401/403 responses.

### 2.6 Open-redirect protection
`/login?returnUrl=https://evil.example` must not send a freshly signed-in user to an attacker's look-alike
site. `utils/returnUrl.ts` accepts only **in-app paths**: it must start with `/`, must not start with `//`
(protocol-relative URL) and must not start with `/\` (some browsers treat it as `//`). 13 unit tests plus
3 integration tests cover it.

### 2.7 Temporary authentication (until Phase 7)
`AuthProvider` already has its **final interface**: `status` (`initializing | authenticated | anonymous`),
`user` (the backend's `UserProfileResponse` type) and `signOut()`. Guards and the layout depend only on that, so
Phase 7 can add real login, tokens and refresh *behind* it without touching them.

The only temporary part is `previewSignIn(account)`, used by the **Development preview** panel on the login page:
- It exists **only in development builds**. `import.meta.env.DEV` is a build-time constant, so the bundler
  removes the panel, the function and the sample accounts from production. This was **verified**: the production
  bundle contains no "Continue as" text and no preview e-mail addresses.
- It's held in memory only (a reload signs you out), and it never calls the API.
- It will be deleted in Phase 7.

### 2.8 Responsive shell (Phase 1 §12)
| Width | Sidebar | How it's done |
|---|---|---|
| < 768 px | hidden; ☰ opens a **drawer** (Radix Dialog: focus trap, Escape, closes after navigating) | `useMediaQuery(TABLET_QUERY)` |
| 768–1023 px | **icon rail**, labels as tooltips + `aria-label` | `useMediaQuery(DESKTOP_QUERY)` false |
| ≥ 1024 px | full; **Collapse** button switches to the rail, remembered in `localStorage` (`tms.sidebar`) | `readSidebarCollapsed()` |

`useMediaQuery` uses React's `useSyncExternalStore` to subscribe to the browser's `MediaQueryList`. The component
re-renders exactly when the answer changes (resize, rotation), with no resize listeners or stale values.

### 2.9 Accessibility built into the shell
- **Skip link** ("Skip to main content") is the first Tab stop on every signed-in page.
- Landmarks: `nav "Main"`, `nav "Breadcrumb"`, `header`, `main#main-content`, one `h1` per page.
- Current page: `aria-current="page"` on the active nav link, breadcrumb and tab (not colour alone).
- "My tasks" and "All tasks" share `/tasks`, so each nav item can define its own `isActive` rule
  (`?assignedToMe=true`), and exactly one is marked current.
- Tabs that change the URL are **links** (`TabNav`), not ARIA tabs: `role="tab"` would promise arrow-key behaviour.
- The account menu is named by visually hidden **text**, not `aria-label`. axe flagged the `aria-label`
  version under WCAG 2.5.3 "Label in Name", because the visible initials weren't part of the name. The `Avatar`
  gained a `decorative` mode for places where the name is already visible next to it (no double announcement).

## 3. Files

### 3.1 Routing and app wiring (`src/app/`)
| File | Responsibility |
|---|---|
| `router/routes.tsx` | `createAppRoutes()`: the whole route tree, lazy pages, breadcrumbs/titles, guards, error elements, dev-only routes |
| `router/router.tsx` | the browser router instance |
| `router/guards/RequireAuth.tsx`, `RequireGuest.tsx`, `RequireRole.tsx` | the three guards (§2.5) |
| `router/pages/NotFoundPage.tsx`, `ForbiddenPage.tsx`, `RouteErrorPage.tsx` | 404 (standalone), 403 (in shell), route error panel (in shell) |
| `layouts/RootLayout.tsx` | document title from route handles; `<ScrollRestoration/>` |
| `layouts/AppLayout.tsx` | the signed-in shell: role-filtered navigation, sidebar/rail/drawer, top bar, user menu, verify-email banner, loading bar |
| `providers/AppProviders.tsx` | now also wraps `AuthProvider` (`initialUser` is a test seam) |
| `src/App.tsx` | providers + `RouterProvider`, nothing else |

**Why `createAppRoutes()` is a function, not a constant:** React Router writes the resolved lazy component onto the
route objects it receives. When all tests shared one array, the second router started from objects the first
had already modified, and every route failed with "No route matches". A factory gives each router fresh objects.

### 3.2 Layout components (`src/components/layout/`): presentational, no feature imports
| Component | Responsibility |
|---|---|
| `Sidebar` | sections, items, active state, rail mode, collapse button, user slot |
| `MobileNavDrawer` | the sidebar as a modal drawer on phones |
| `Topbar` | ☰ button (phones), breadcrumbs, right-side actions |
| `Breadcrumbs` + `useBreadcrumbs` | trail from route handles |
| `UserMenu` | profile, settings, (dev) design system, sign out |
| `PageHeader` | the page's h1, description and actions |
| `TabNav` | URL-based tabs (project details, settings) |
| `SkipLink` | skip to `#main-content` |
| `AuthLayout` | logged-out pages: form column + brand panel (desktop) |
| `PagePlaceholder` | "Coming in Phase N" content for pages built later |

### 3.3 Shared definitions
| File | Responsibility |
|---|---|
| `constants/routes.ts` | `paths.*` builders for every URL; `loginWithReturnUrl()`; `SETTINGS_TABS` |
| `constants/navigation.ts` | sidebar sections/items, icons, role visibility, custom active rules |
| `constants/roles.ts` | `ROLES` = Admin, Manager, User (as named by the backend) |
| `types/routing.ts` | `RouteHandle` type + helpers |
| `types/api.ts` | + `UserProfile` alias over the generated `UserProfileResponse` |
| `hooks/useMediaQuery.ts` | live media queries + breakpoint constants |
| `utils/returnUrl.ts` | open-redirect-safe `returnUrl` |
| `services/preferencesStorage.ts` | + sidebar collapsed preference |

### 3.4 Features
| Feature | What exists now |
|---|---|
| `auth/` | `AuthProvider`, `useAuth`, `authContext` (final interface), `permissions.ts` (`hasRole`, `isAdmin`, `isEmailVerified`, `canCreateProjects`, `canManageCategories`, mirroring backend policies), **temporary** `previewUsers.ts`, 6 page placeholders (login has the dev preview) |
| `dashboard`, `tasks`, `board`, `projects`, `categories`, `team`, `users`, `admin`, `settings` | page placeholders for every route in the Phase 1 inventory; project details has its tab layout; settings validates `:tab` |

## 4. Problems found and fixed

| # | Found by | Problem | Fix / lesson |
|---|---|---|---|
| 1 | Integration tests | Shared route objects were mutated by React Router; later routers matched nothing | `createAppRoutes()` factory. Never share mutable config between router instances |
| 2 | Integration test | 404 page had a visible h3 **and** a hidden h1 with the same text (announced twice) | One visible h1 |
| 3 | axe (E2E) | Account menu `aria-label` didn't contain its visible text (WCAG 2.5.3) | Visually hidden text + decorative avatar |
| 4 | Bundle inspection | Dev-preview panel text shipped in the production login chunk (never rendered, but dead code) | Guard with `import.meta.env.DEV` directly so it's removed at build time (chunk 1.22 kB → 0.49 kB) |
| 5 | ESLint (react-refresh) | `Breadcrumbs.tsx` exported a component and a hook | `useBreadcrumbs.ts` split out |
| 6 | Design | Eager feature imports would defeat code splitting | Router-only page imports; feature indexes export no pages |
| 7 | `verify` | A Vitest JSON report from Phase 4 (`.vitest/json/output.json`) was **committed by mistake** in Phase 4 and failed the format check | Deleted in this phase's commit; `.vitest/` added to `.gitignore` and `.prettierignore`. (The file only holds test names/results, nothing secret, but it remains in Git history.) |

Mistakes in my own tests, corrected:
- A tab test asserted right after the router's URL changed. React renders the lazy tab a moment later (flaky 1 in 3). It now waits for the visible content.
- An E2E helper used `isVisible()`, which doesn't wait, before the page had loaded. It now waits for the signed-in shell.
- A stale dev server from an earlier manual check was reused by Playwright and served old modules. I stopped it and re-ran.

## 5. Tests

| Level | File | Tests | Covers |
|---|---|---|---|
| Integration | `navigation.test.tsx` | 24 | guards + returnUrl (incl. 3 open-redirect attempts), admin-only pages, 404, settings tab redirect, role-based nav, My/All tasks active state, verify banner, breadcrumbs + document title, URL tabs, skip link, collapse persistence, tablet rail, phone drawer, live resize, sign-out, **crash contained by route error boundary** |
| Integration | `app.test.tsx` | 1 | real `App` + browser router: `/` → sign-in |
| Integration | `design-system.test.tsx` | 5 | (moved from Phase 4) |
| Unit | `utils/returnUrl` | 13 | allowed/blocked return URLs |
| Unit | `features/auth/permissions` | 9 | role helpers; CanCreateProjects / CanManageCategories truth tables |
| Unit | `constants/routes` | 3 | backend-fixed email paths, builders, encoding |
| Unit | `hooks/useMediaQuery` | 2 | live updates, independent breakpoints |
| **Vitest total** | 21 files | **154** (+52) | ✅ passing; 5 consecutive runs stable |
| E2E | `navigation.spec.ts` | 7 × 3 viewports | redirect + return, role nav, admin nav, sign-out, **axe on sign-in, shell light, shell dark + banner** |
| E2E | `smoke.spec.ts`, `design-system.spec.ts` | 6 × 3 | updated for routing |
| **Playwright total** | | **39** | ✅ passing (desktop, tablet, mobile) |

New test helpers: `tests/utils/renderRoute.tsx` (real route tree in a memory router, optionally signed in; returns
the router to assert the URL), `tests/mocks/factories/users.ts` (`buildUser()` typed with the backend DTO),
`setViewportWidth()` in the `matchMedia` mock.

## 6. Verification

| Check | Result |
|---|---|
| `npm run verify` (typecheck, lint, format, tests, build) | ✅ |
| `npm run test:e2e` | ✅ 39/39 |
| Production bundle | ✅ one chunk per page; no design-system route, no preview accounts or preview UI |
| Main bundle | ⚠️ 183.5 kB gzip: React, React Router, Radix and the shell. **Measured and reduced in Phase 16** (performance), not blocking |

## 7. Common mistakes and best practices

| Mistake | Better |
|---|---|
| Treating route guards as security | The API authorizes every request; guards are UX |
| `navigate(returnUrl)` with any value | Allow only in-app paths (open redirect) |
| Fetching in route loaders *and* TanStack Query | One cache (decision D5); routes only render |
| Importing pages through feature barrels | Router imports pages directly, or code splitting breaks |
| Sharing route objects between routers | Build them with a factory |
| Filters/tabs in component state | In the URL (`/settings/security`, `?assignedToMe=true`) |
| Asserting on the URL right after a click | Wait for what the user sees |
| `aria-label` that differs from visible text | Keep the visible text in the accessible name (2.5.3) |
| Shipping dev-only code | Gate with `import.meta.env.DEV` so the bundler removes it, then verify the bundle |

## 8. Interview questions
1. What is a layout route, and how do guards use it?
2. How does `React.lazy`/route `lazy` reduce the initial bundle? What happens while a chunk loads?
3. Why is client-side route protection not security? What actually protects the data?
4. What is an open redirect? Show a `returnUrl` that would exploit one and how you prevent it.
5. How do breadcrumbs and document titles get built from the route tree?
6. Why can `useSyncExternalStore` be better than `useEffect` + `resize` listeners for media queries?
7. Why should tabs that change the URL be links rather than ARIA tabs?
8. What does `import.meta.env.DEV` compile to in production, and why does that remove code?
9. What is WCAG 2.5.3 "Label in Name", and who benefits from it?
10. Why might sharing a mutable configuration object between two router instances cause bugs?

## 9. Practical exercises
1. Add a `/reports` placeholder page visible only to Admin and Manager: route + `RequireRole` + nav item. Write
   one integration test for each role.
2. Sign in as the unverified preview user and find every place where the UI tells you about verification.
3. With DevTools → Network, open `/categories` and watch its chunk download. Then go back and forth. Why is it
   downloaded only once?
4. Try `/login?returnUrl=//evil.example` while signed in. Where do you end up, and which function decided that?
5. Collapse the sidebar, reload, resize to 800 px and to 400 px. Explain each behaviour from §2.8.
