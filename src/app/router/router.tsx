import { createBrowserRouter } from 'react-router';

import { createAppRoutes } from './routes';

/**
 * The browser router (HTML5 history). Tests use createMemoryRouter(createAppRoutes()) instead.
 * basename = Vite's base (VITE_BASE_PATH, default "/"), so the app also works under a sub-path such as a
 * GitHub Pages project site (https://user.github.io/repo/). Route paths stay "/projects", "/tasks"….
 */
export const router = createBrowserRouter(createAppRoutes(), {
  basename: import.meta.env.BASE_URL,
});
