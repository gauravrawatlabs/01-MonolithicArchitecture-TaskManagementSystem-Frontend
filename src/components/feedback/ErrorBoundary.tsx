import { Component, type ErrorInfo, type ReactNode } from 'react';

import { ErrorState } from './ErrorState';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback; receives the error and a reset function. */
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches errors thrown while RENDERING its children, so one broken widget shows an error panel
 * instead of blanking the whole app. (It does not catch errors in event handlers or async code:
 * those are handled where they happen, e.g. by TanStack Query.) React still requires a class
 * component for this; there is no hook equivalent.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Development aid only; never logs user data. (A real app could report to a monitoring service.)
    console.error('Render error caught by ErrorBoundary:', error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (error) {
      return this.props.fallback ? (
        this.props.fallback({ error, reset: this.reset })
      ) : (
        <ErrorState
          title="This part of the page crashed"
          description="An unexpected error occurred while displaying this content."
          onRetry={this.reset}
        />
      );
    }
    return this.props.children;
  }
}
