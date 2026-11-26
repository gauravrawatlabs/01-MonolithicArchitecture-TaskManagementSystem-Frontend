# Phase 3 — Project Setup

> Status: **✅ Verified — approved 2026-11-26**. Builds on [Phase 2 — Frontend Architecture](02-Phase2-Frontend-Architecture.md).

## 1. What this phase does, in simple words

Before writing features we need a **workshop** where every tool is installed, configured and proven to work:
a compiler that understands TypeScript, a dev server, a CSS framework, a linter that enforces our rules,
a formatter, three kinds of tests, and a safe way to configure the API URL. If any of these is wrong,
every later phase inherits the problem, so this phase ends only when **all checks pass**.

```
 npm run dev ─► Vite dev server (port 3000) ─► browser ─► React app ─► (later) ASP.NET Core API :5075
 npm run verify ─► tsc (types) ─► ESLint (rules) ─► Prettier (format) ─► Vitest (tests) ─► vite build
 npm run test:e2e ─► Playwright starts the dev server ─► real Chromium: desktop · tablet · mobile
 npm run api:types ─► backend /openapi/v1.json ─► src/api/generated/schema.ts
```

## 2. The tools: what, why, and where

| Tool | Version | What it does | Why we need it | Where it is configured |
|---|---|---|---|---|
| **Node.js** | 22 (`.nvmrc`) | Runs the tooling (not the app in production) | Vite 8 requires ≥ 22.12 | `.nvmrc`, `package.json` `engines` |
| **Vite** | 8 | Dev server with instant reload; bundles for production | Fast feedback, small optimised builds | `vite.config.ts` |
| **TypeScript** | 5.9 | Type-checks the code (`tsc -b`) | Catches mistakes before they run | `tsconfig*.json` |
| **React** | 19 | UI library | Chosen in Phase 2 | `src/` |
| **Tailwind CSS** | 4 | Utility classes generated from design tokens | Consistent design without hand-written CSS files | `src/styles/index.css` (`@theme`), Vite plugin |
| **ESLint** | 10 | Finds bugs and enforces rules (a11y, security, architecture) | Rules a human reviewer would otherwise have to remember | `eslint.config.js` |
| **Prettier** | 3 | Formats code identically for everyone | No style debates, clean diffs | `.prettierrc.json`, `.prettierignore` |
| **Vitest** | 5 | Runs unit and integration tests | Shares Vite's config and `@/` alias | `vite.config.ts` → `test` |
| **Testing Library** | 16 | Renders components and queries them like a user | Tests behaviour, not implementation | `tests/` |
| **MSW** | 3 | Fakes the backend at the network level | Real Axios client runs in tests; no live API needed | `tests/mocks`, `tests/setup` |
| **Playwright** | 1.65 | Drives a real browser | Proves the whole app works end to end | `playwright.config.ts`, `tests/e2e` |
| **openapi-typescript** | 7 | Turns the backend's OpenAPI document into TS types | Backend DTOs stay the single source of truth (decision D1) | `npm run api:types` |

All other approved packages (Radix UI, TanStack Query, Axios, React Router, React Hook Form, Zod, Recharts,
lucide-react, dnd-kit, clsx, tailwind-merge, Inter) are installed and will be used from Phase 4 on.

### 2.1 Why not simply "latest" for everything?

The newest majors at the time of setup were **TypeScript 7** and **ESLint 10**. We checked every tool's
`peerDependencies` (the versions a package declares it supports) before choosing:

| Constraint found | Consequence |
|---|---|
| `typescript-eslint` supports TypeScript `< 6.1` | TS 7 would break type-aware linting |
| `openapi-typescript` declares TypeScript `^5.x` | TS 6 would break type generation |
| `msw` requires TypeScript `≥ 5.9` | → **TypeScript 5.9.3**, the only version all tools support |
| `eslint-plugin-jsx-a11y` declares ESLint `≤ 9`, but npm marks **ESLint 9 as no longer supported** | → **ESLint 10**, plus an npm `overrides` entry that lets the a11y plugin install under it |

The override was verified, not assumed. The plugin's source uses none of the APIs ESLint 10 removed,
and a probe file with an image without `alt` and a click-only `<img>` produced the expected `jsx-a11y` errors.
**Lesson:** check peer dependencies before upgrading majors, and prove workarounds with a failing example.

## 3. Every file created in this phase

### 3.1 Project configuration (repository root)

| File | Responsibility |
|---|---|
| `package.json` | Dependencies, the npm scripts in §4, Node engine, and the `overrides` entry for the a11y plugin |
| `package-lock.json` | Exact resolved versions of all 580+ packages, so every machine installs the same tree (committed) |
| `.nvmrc` | Node major version (`22`). `nvm use` picks it up |
| `index.html` | The single HTML page: `<div id="root">`, metadata, favicon, loads `src/main.tsx` |
| `vite.config.ts` | React + Tailwind plugins, `@` → `src` alias, **port 3000 with `strictPort`**, Vitest settings, and a guard that fails the production build when `VITE_API_BASE_URL` is missing |
| `tsconfig.json` | "Solution" file: references the three projects below, so `tsc -b` checks all of them |
| `tsconfig.app.json` | Application code (`src/`): browser libs, `strict`, `noUncheckedIndexedAccess`, `@/*` path |
| `tsconfig.test.json` | Unit/integration tests + `src`: adds Node types |
| `tsconfig.node.json` | Code that runs in Node: `vite.config.ts`, `playwright.config.ts`, `tests/e2e` |
| `eslint.config.js` | Flat config: strict type-aware TypeScript, React hooks, React Refresh, jsx-a11y, `no-console`, **architecture boundaries** (docs/02 §3.4), Prettier last |
| `.prettierrc.json` / `.prettierignore` | Formatting rules (single quotes, trailing commas, 100 columns, LF). Markdown is ignored so hand-drawn diagrams survive |
| `.editorconfig` | Same basics for any editor: UTF-8, LF, 2 spaces |
| `.gitattributes` | Forces LF line endings in the repository and on checkout. Without it, Windows CRLF checkouts would fail Prettier's check |
| `.gitignore` | Ignores `node_modules`, `dist`, coverage, Playwright output, and **local/production env files** |
| `.env.example` | Documents every variable (committed) |
| `.env.development` / `.env.test` | Public, non-secret values for `npm run dev` and Vitest (committed) |
| `.env.production.local` | Your machine's production-build settings (**git-ignored**, copied from `.env.example`) |
| `playwright.config.ts` | E2E: base URL `http://localhost:3000`, desktop/tablet/mobile projects, starts the dev server automatically |
| `.vscode/extensions.json`, `.vscode/settings.json` | Recommended extensions; format on save; ESLint fixes on save; use the project's TypeScript |
| `public/favicon.svg` | Browser tab icon (served as-is) |

### 3.2 Source code (`src/`)

| File | Responsibility |
|---|---|
| `main.tsx` | Entry point. Loads the Inter font and global CSS, finds `#root` (fails loudly if missing), renders `<App/>` inside `<StrictMode>` |
| `App.tsx` | Temporary setup screen showing the app name and API URL. Replaced in Phase 5 by providers + router |
| `vite-env.d.ts` | Types for `import.meta.env` (`VITE_API_BASE_URL`, `VITE_APP_NAME`) |
| `constants/env.ts` | **Validates configuration at startup** with Zod: `parseEnv()` + the exported, frozen `env` object |
| `styles/index.css` | Imports Tailwind and defines the first token (`--font-sans` = Inter). Full design tokens come in Phase 4 |
| `api/generated/schema.ts` | 4,023 lines of types generated from the backend (never edited by hand; regenerate with `npm run api:types`) |

### 3.3 Tests (`tests/`)

| File | Responsibility |
|---|---|
| `setup/vitest.setup.ts` | Adds jest-dom matchers (`toBeInTheDocument`), starts MSW with `onUnhandledFrame: 'error'`, cleans up after each test |
| `mocks/server.ts`, `mocks/handlers/index.ts` | MSW server and the (still empty) default handlers |
| `unit/constants/env.test.ts` | 8 tests for `parseEnv`: valid, trailing slash, default name, frozen, and 4 invalid URLs |
| `integration/app.test.tsx` | Renders `<App/>` and checks the heading and API URL by accessible role and text |
| `e2e/smoke.spec.ts` | Real browser: page title and main heading, on desktop, tablet and mobile |

## 4. Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (first time, or after `package.json` changes) |
| `npm run dev` | Start the dev server at **http://localhost:3000** |
| `npm run build` | Type-check, then build the production bundle into `dist/` |
| `npm run preview` | Serve `dist/` at http://localhost:3000 to try the production build |
| `npm run typecheck` | Type-check all three TS projects |
| `npm run lint` / `lint:fix` | Lint (zero warnings allowed) / auto-fix what can be fixed |
| `npm run format` / `format:check` | Format all files / check without changing |
| `npm run test` / `test:watch` / `test:coverage` | Vitest once / watch mode / with coverage report |
| `npm run test:e2e:install` | Download Chromium for Playwright (once per machine) |
| `npm run test:e2e` | Run Playwright (starts the dev server if it isn't running) |
| `npm run api:types` | Regenerate API types (**the backend must be running** on :5075) |
| `npm run verify` | Everything a phase must pass: typecheck → lint → format check → tests → build |

## 5. Key concepts explained

### 5.1 Environment variables in a browser app
- Vite replaces `import.meta.env.VITE_*` with the actual values **at build time**. They become plain text in the
  JavaScript file anyone can download, so **they are never secret**. This is why there's no API key in the frontend:
  the backend authenticates users with JWTs instead.
- Vite loads files by **mode**: `npm run dev` → `.env.development`, Vitest → `.env.test`, `npm run build` →
  `.env.production(.local)`. `*.local` files are for your machine only and are git-ignored.
- `constants/env.ts` validates the values once. A typo (`localhost:5075` without `http://`) now produces
  *"VITE_API_BASE_URL must be an http(s) URL"* at startup, instead of mysterious failed requests on every page.
- A production build **without** `VITE_API_BASE_URL` fails immediately (verified: *"VITE_API_BASE_URL is not set
  for the production build."*), so a broken bundle can never be deployed by accident.

### 5.2 Why port 3000 with `strictPort`
The backend only allows CORS requests from `http://localhost:3000`, and its emails link to that address.
Vite's default is 5173, and if a port is busy Vite normally moves to the next one silently. `strictPort: true`
makes it **fail** instead, because running on 3001 would make every API call fail with a CORS error that is
much harder to understand.

### 5.3 TypeScript project references
Browser code, Node config files and tests need **different** type environments. Putting all of them in one
tsconfig would let browser code use Node APIs (like `process`) without error. Three small projects plus a
root that references them keep each environment honest, and `tsc -b` checks all three.

### 5.4 Strict settings worth knowing
- `strict`: enables all strict checks, including `null`/`undefined` safety.
- `noUncheckedIndexedAccess`: `items[0]` has type `Item | undefined`, which forces a check before use. This is
  exactly the kind of bug that crashes UIs on empty lists.
- `verbatimModuleSyntax`: type-only imports must say `import { type X }`, so the bundler can always remove them.

### 5.5 Architecture rules as lint errors
The boundaries approved in Phase 2 are checked automatically on every lint:

| Violation (verified with a probe file) | Error message |
|---|---|
| shared component imports a feature | "Shared code must not know about features…" |
| deep import into another feature | "Import another feature only through its public API…" |
| anything imports from `src/app` | "Nothing may depend on src/app…" |
| `../../` relative import | "Use the @/ alias…" |

**Correction to Phase 2 §3.2:** route path builders move from `app/router/paths.ts` to **`src/constants/routes.ts`**,
because features must build links but are not allowed to import from `app/`.

### 5.6 Generated API types: one finding to decide
openapi-typescript worked (4,023 lines, including the new `UserLookupResponse` and `completionPercent`),
but **62 numeric fields are typed `number | string`**, for example `id: number | string`.

**Why:** ASP.NET Core's web JSON defaults use `JsonNumberHandling.AllowReadingFromString`, which lets the API
*accept* `"12"` as well as `12`. The OpenAPI generator therefore describes every number as "integer or string".
The API always **sends** real numbers, so the type is wider than reality.

**Options:**
| | Change | Effect |
|---|---|---|
| **A (recommended)** | Backend: set `NumberHandling = JsonNumberHandling.Strict` for MVC and minimal-API JSON options, then regenerate | Accurate `number` types; the API rejects numbers sent as strings (stricter, more correct contract). Small change + tests in the backend repo |
| B | Frontend: post-process the schema in a generation script | No backend change, but the frontend "corrects" the contract, so they no longer match exactly |

**Decision: A (approved 2026-11-26).** The backend now uses `JsonNumberHandling.Strict` (backend `docs/16`, +2 tests),
and the regenerated `schema.ts` contains **0** `number | string` fields: ids, counts and `completionPercent` are plain `number`.

## 6. Verification results

| Check | Command | Result |
|---|---|---|
| Type check | `npm run typecheck` | ✅ 0 errors (3 projects) |
| Lint | `npm run lint` | ✅ 0 errors, 0 warnings |
| Lint rules really active | probe files | ✅ jsx-a11y ×3, no-explicit-any, no-console, boundaries ×4 |
| Formatting | `npm run format:check` | ✅ all files formatted |
| Unit + integration tests | `npm run test` | ✅ 9/9 passed (2 files) |
| Production build | `npm run build` | ✅ JS 91.6 kB gzip, CSS 3.6 kB gzip |
| Build guard | build without `VITE_API_BASE_URL` | ✅ fails with a clear message |
| E2E | `npm run test:e2e` | ✅ 3/3 passed (desktop, tablet, mobile); dev server on port 3000 |
| API types | `npm run api:types` | ✅ generated from the running backend; after D7: 0 `number \| string` fields |
| Security audit | `npm install` | ✅ 0 vulnerabilities |

### Problems found and fixed during setup
1. **MSW 3 renamed `onUnhandledRequest` → `onUnhandledFrame`** (it now also handles WebSocket/SSE frames).
   Found by `tsc`, not at runtime. This is a good example of why tests and config are type-checked too.
2. **Peer-dependency conflicts** with TypeScript 7 / ESLint 9 (see §2.1).

## 7. Common mistakes and best practices

| Mistake | Better |
|---|---|
| Putting secrets in `VITE_*` variables | Everything in the bundle is public. Secrets belong on the server |
| Reading `import.meta.env` all over the code | Read it once, validate it, export a typed object |
| Committing `.env.production` with real URLs/keys | Commit only `.env.example`; use CI variables / `*.local` |
| Upgrading to every new major on day one | Check peer dependencies; prove workarounds |
| Letting Vite pick another port | `strictPort`: fail loudly |
| Ignoring line endings on Windows | `.gitattributes` + Prettier `endOfLine` |
| Skipping lint/format in CI | `npm run verify` runs everything a phase must pass |

## 8. Interview questions
1. Why are `VITE_` environment variables not secret, and what does that mean for frontend security?
2. What is the difference between `dependencies` and `devDependencies` for a Vite SPA?
3. Why commit `package-lock.json`?
4. What do `peerDependencies` express, and what is an npm `overrides` entry for?
5. What does `noUncheckedIndexedAccess` protect you from?
6. Why does Vitest share Vite's configuration, and what does `environment: 'jsdom'` provide?
7. How does MSW differ from mocking Axios with `vi.mock`?
8. Why run E2E tests on several viewports?

## 9. Practical exercises
1. Change `VITE_API_BASE_URL` in `.env.development` to `localhost:5075` (no scheme), run `npm run dev`, and read
   the error in the browser console. Then restore it.
2. Add a `<button>` with only an icon and no text to `App.tsx` and run `npm run lint`. Which rule fires, and how do you fix it?
3. Start the backend, run `npm run api:types`, and find `TaskResponse` in `schema.ts`. Which fields are nullable?
4. Run `npm run test:coverage` and open `coverage/index.html`. What is not covered, and why is that fine at this stage?

## 10. Decision
| # | Decision | Outcome |
|---|---|---|
| D7 | How to fix `number \| string` in generated types (§5.6) | ✅ **A** implemented: backend `JsonNumberHandling.Strict` + 2 tests; types regenerated |
