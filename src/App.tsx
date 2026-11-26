import { AppProviders } from '@/app/providers/AppProviders';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { DesignSystemPage } from '@/features/design-system';

/**
 * Root component. Until routing arrives in Phase 5, it shows the design system showcase
 * (later available at /design-system in development builds).
 */
export function App() {
  return (
    <AppProviders>
      <ErrorBoundary>
        <DesignSystemPage />
      </ErrorBoundary>
    </AppProviders>
  );
}
