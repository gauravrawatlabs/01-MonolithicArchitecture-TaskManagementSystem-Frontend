import { type AnyHandler } from 'msw';

/**
 * Default MSW request handlers, one file per API area (auth.ts, tasks.ts, …) from Phase 7 onwards.
 * Tests override them per scenario with server.use(...).
 */
export const handlers: AnyHandler[] = [];
