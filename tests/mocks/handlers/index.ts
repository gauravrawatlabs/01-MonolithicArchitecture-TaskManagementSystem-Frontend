import { type AnyHandler } from 'msw';

import { authHandlers } from './auth';
import { workspaceHandlers } from './workspace';

/**
 * Default MSW request handlers, one file per API area. Tests override them per scenario with
 * server.use(...); unmatched requests fail the test (onUnhandledFrame: 'error').
 */
export const handlers: AnyHandler[] = [...authHandlers, ...workspaceHandlers];
