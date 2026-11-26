# Task Management System — Frontend

A React + TypeScript single-page application for the
[Task Management System API](https://github.com/gauravrawatlabs/01-MonolithicArchitecture-TaskManagementSystem)
(ASP.NET Core 10 Web API, monolithic architecture, SQL Server, JWT + refresh tokens, role-based authorization).

> **Status: Phase 1 of 17 complete (requirements and UI/UX design).** No application code yet.
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

## Planned technology stack

React · TypeScript (strict) · Vite · Tailwind CSS · React Router · Axios · TanStack Query ·
React Hook Form · Zod · Recharts · Lucide React · dnd-kit · Vitest · React Testing Library · MSW · Playwright ·
ESLint · Prettier

## Documentation

| # | Document | Contents |
|---|---|---|
| 00 | [Progress tracker](docs/00-Progress-Tracker.md) | Status of all 17 phases |
| 01 | [Requirements and UI/UX design](docs/01-Phase1-Requirements-and-UI-Design.md) | Backend contract, page inventory, journeys, wireframes, design system, role matrix, API and testing plans |

## Local development (from Phase 3)

The API's CORS policy and email links expect the frontend at **`http://localhost:3000`**;
the API runs at `http://localhost:5075` (Swagger at `/swagger`). Setup commands will be added in Phase 3.
