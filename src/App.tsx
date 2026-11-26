import { env } from '@/constants/env';

/**
 * Root component. For now it only proves that React, TypeScript, Tailwind and the environment
 * configuration work together. Phase 5 replaces this with <AppProviders> + <RouterProvider>.
 */
export function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 font-sans text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-violet-700">Phase 3 · Project setup</p>
        <h1 className="mt-2 text-2xl font-semibold">{env.appName}</h1>
        <p className="mt-3 text-sm text-slate-600">
          The frontend is running. API base URL:{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800">
            {env.apiBaseUrl}
          </code>
        </p>
      </section>
    </main>
  );
}
