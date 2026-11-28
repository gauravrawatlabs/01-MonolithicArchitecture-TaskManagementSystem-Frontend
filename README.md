# Task Management System — Frontend

A React + TypeScript single-page application for the
[Task Management System API](https://github.com/gauravrawatlabs/01-MonolithicArchitecture-TaskManagementSystem)
(ASP.NET Core 10 Web API, monolithic architecture, SQL Server, JWT + refresh tokens, role-based authorization).

> **Status: all 17 phases built.** Every feature is tested at three levels ([QA report](docs/15-Phase15-Complete-Testing-and-QA.md)),
> performance and security are reviewed ([Phase 16](docs/16-Phase16-Performance-and-Security-Review.md)), and the app
> is ready to deploy to Docker, a VM/EC2, IIS/Azure App Service, static hosts or GitHub Pages
> ([deployment guide](docs/17-Phase17-Deployment-and-GitHub.md)).
> The project is built phase by phase as a learning project; see the [progress tracker](docs/00-Progress-Tracker.md).

## Architecture at a glance

```
┌──────────────────────────────┐   HTTPS + JSON    ┌──────────────────────────────────────┐
│  React SPA (this repository) │  Bearer JWT       │  ASP.NET Core 10 Web API (monolith)  │
│  Vite · TypeScript · Tailwind│ ────────────────► │  Identity · JWT · EF Core · SQL Server│
│  TanStack Query · RHF + Zod  │ ◄──────────────── │  ProblemDetails errors               │
└──────────────────────────────┘                   └──────────────────────────────────────┘
```

- The backend stays **one monolithic API**; this frontend is a separate application.
- **Frontend authorization is only for user experience.** The API enforces every rule.

## Technology stack

React · TypeScript (strict) · Vite · Tailwind CSS · React Router · Axios · TanStack Query ·
React Hook Form · Zod · Recharts · Lucide React · dnd-kit · Vitest · React Testing Library · MSW · Playwright ·
ESLint · Prettier

## Documentation

| # | Document | Contents |
|---|---|---|
| 00 | [Progress tracker](docs/00-Progress-Tracker.md) | Status of all 17 phases |
| 01 | [Requirements and UI/UX design](docs/01-Phase1-Requirements-and-UI-Design.md) | Backend contract, page inventory, journeys, wireframes, design system, role matrix, API and testing plans |
| 02 | [Frontend architecture](docs/02-Phase2-Frontend-Architecture.md) | Component layers, folder structure, routing, state management, auth, API layer, error handling, conventions |
| 03 | [Project setup](docs/03-Phase3-Project-Setup.md) | Tools and versions, every config file, env variables, commands, verification |
| 04 | [Design system and common components](docs/04-Phase4-Design-System-and-Common-Components.md) | Tokens, dark mode, component catalogue, accessibility, defects found |
| 05 | [Layout and navigation](docs/05-Phase5-Layout-and-Navigation.md) | Routing, lazy pages, guards, open-redirect protection, responsive shell |
| 06 | [Authentication UI](docs/06-Phase6-Authentication-UI.md) | Forms with RHF + Zod, API client and errors, account flows, security decisions |
| 07 | [Sessions and API integration](docs/07-Phase7-Sessions-and-API-Integration.md) | Token storage, refresh rotation, cross-tab lock, interceptors, session expiry |
| 08 | [Dashboard](docs/08-Phase8-Dashboard.md) | TanStack Query reads, chart choice and accessibility, states, lazy charts |
| 09 | [Category management](docs/09-Phase9-Category-Management.md) | First full CRUD: mutations and cache, URL state, permissions, delete confirmation |
| 10 | [Project management](docs/10-Phase10-Project-Management.md) | Server-side paging and search, details layout with tabs, accessible member picker |
| 11 | [Task management](docs/11-Phase11-Task-Management.md) | Filters in the URL, status workflow and per-user actions, local ⇄ UTC due dates |
| 12 | [Kanban board and comments](docs/12-Phase12-Kanban-Board-and-Comments.md) | Optimistic drag-and-drop with rollback, keyboard and menu alternatives, comment rights |
| 13 | [Team and user management](docs/13-Phase13-Team-and-User-Management.md) | Profile, team from memberships, roles and activation with self-protection |
| 14 | [Settings and responsiveness](docs/14-Phase14-Settings-and-Responsiveness.md) | Device preferences, account verification, a 22-page × 3-viewport sweep |
| 15 | [Complete testing and QA](docs/15-Phase15-Complete-Testing-and-QA.md) | Coverage-guided gaps, a token-refresh race fixed, stability runs, QA report |
| 16 | [Performance and security review](docs/16-Phase16-Performance-and-Security-Review.md) | Measured bundle and load times, a tested CSP, token-storage decision |
| 17 | [Deployment and GitHub](docs/17-Phase17-Deployment-and-GitHub.md) | CI, runtime config, Docker, nginx, IIS, static hosts, GitHub Pages |

## Getting started

**Prerequisites:** Node.js 22.12+ (`nvm use` reads `.nvmrc`) and the
[backend API](https://github.com/gauravrawatlabs/01-MonolithicArchitecture-TaskManagementSystem) running at
`http://localhost:5075` (Swagger at `/swagger`).

```bash
npm install                 # install dependencies
npm run dev                 # http://localhost:3000 (the backend's CORS and email links expect this port)
```

| Command | Purpose |
|---|---|
| `npm run verify` | typecheck → lint → format check → unit/integration tests → production build |
| `npm run test` | Vitest unit + integration tests (MSW, no backend needed) |
| `deploy/security-headers.json` | Recommended HTTP security headers (CSP etc.) for the host, tested by `npm run test:e2e` |
| `npm run test:e2e:install` then `npm run test:e2e` | Playwright end-to-end tests (desktop, tablet, mobile); no backend needed. Playwright builds and serves the app itself (`npm run e2e:serve`), or reuses a server already running on :3000 |
| `npm run test:e2e:backend` | Full flows against the **running** API (register → email link → sign in …); creates `e2e-…@example.test` users in the dev database. Admin-only flows run when `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` are set |
| `npm run api:types` | Regenerate `src/api/generated/schema.ts` from the running backend |
| `npm run build` | Production build into `dist/` (needs `VITE_API_BASE_URL`, see below) |

### Environment variables

| Variable | Required | Example | Notes |
|---|---|---|---|
| `VITE_API_BASE_URL` | yes | `http://localhost:5075` | API origin, no trailing slash, no `/api` |
| `VITE_APP_NAME` | no | `Task Management System` | Display name |

`.env.development` and `.env.test` are committed (public values only). For a local production build, copy
`.env.example` to `.env.production.local`. In CI/hosting, set real environment variables.
**Everything in `VITE_*` variables is public, so never put secrets there.**

## Deployment

The same build can be deployed in several ways; pick one (details: [deployment guide](docs/17-Phase17-Deployment-and-GitHub.md)).

| Target | Command / file |
|---|---|
| Docker (VM, EC2, Azure Web App for Containers, ECS, Kubernetes) | `docker build -t tms-frontend .` then `docker run -p 80:8080 -e API_BASE_URL=https://api.example.com tms-frontend` |
| nginx on a VM / EC2 | `deploy/nginx/tms.conf` + `node scripts/host-configs.mjs nginx --api-origin <api>` |
| IIS / Azure App Service (Windows), Azure Static Web Apps, Netlify, Cloudflare Pages, Vercel | `VITE_API_BASE_URL=<api> npm run build:static` (writes each host's file into `dist/`) |
| GitHub Pages | Actions → "GitHub Pages" → Run workflow (manual) |

The API address can also be changed **after** building, in `config.js`. For every target, the backend must allow
the frontend's origin (`Cors:AllowedOrigins`) and know its URL (`Email:ClientAppBaseUrl`).
Continuous integration (`.github/workflows/ci.yml`) checks every push and pull request.

