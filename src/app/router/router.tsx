import { createBrowserRouter } from 'react-router';

import { createAppRoutes } from './routes';

/** The browser router (HTML5 history). Tests use createMemoryRouter(createAppRoutes()) instead. */
export const router = createBrowserRouter(createAppRoutes());
