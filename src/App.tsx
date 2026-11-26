import { RouterProvider } from 'react-router/dom';

import { AppProviders } from '@/app/providers/AppProviders';
import { router } from '@/app/router/router';

/** Root component: app-wide providers around the router. Everything else is a route. */
export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
