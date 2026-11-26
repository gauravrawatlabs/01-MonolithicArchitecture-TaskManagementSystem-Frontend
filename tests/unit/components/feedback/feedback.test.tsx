import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Banner } from '@/components/feedback/Banner';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { ErrorState } from '@/components/feedback/ErrorState';

function ConfirmHarness({ onConfirm }: { onConfirm: () => void | Promise<void> }) {
  const [open, setOpen] = useState(true);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="Delete project?"
      description="This cannot be undone."
      confirmLabel="Delete"
      onConfirm={onConfirm}
    />
  );
}

describe('ConfirmDialog', () => {
  it('is an alertdialog with the question and its consequence', () => {
    render(<ConfirmHarness onConfirm={vi.fn()} />);

    const dialog = screen.getByRole('alertdialog', { name: 'Delete project?' });
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
  });

  it('cancels without calling onConfirm', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmHarness onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('shows a busy state while the async action runs, then closes on success', async () => {
    let finish: () => void = () => undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(<ConfirmHarness onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    finish();
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('stays open after a failed action so the user can retry or cancel', async () => {
    const onConfirm = vi.fn(() => Promise.reject(new Error('409 Conflict')));
    render(<ConfirmHarness onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
    });
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});

describe('EmptyState, ErrorState and Banner', () => {
  it('EmptyState explains the situation and offers the next step', () => {
    render(
      <EmptyState
        title="No projects yet"
        description="Create one."
        action={<button>Create</button>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'No projects yet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('ErrorState is announced, shows the reference id and retries', async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} correlationId="ABC123" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByText('ABC123')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('Banner uses role="alert" for danger and role="status" otherwise, and can be dismissed', async () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<Banner variant="danger" title="Session expired" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Session expired');

    rerender(<Banner variant="warning" title="Verify your email" onDismiss={onDismiss} />);
    expect(screen.getByRole('status')).toHaveTextContent('Verify your email');
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function Bomb({ explode }: { explode: boolean }): ReactNode {
    if (explode) throw new Error('boom');
    return <p>Widget works</p>;
  }

  it('shows a fallback instead of crashing, and recovers after a reset', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // React logs caught errors

    // A reset only helps if the CAUSE changes through state: otherwise the boundary re-renders
    // the same failing children and immediately shows the fallback again.
    function Harness() {
      const [explode, setExplode] = useState(true);
      return (
        <ErrorBoundary
          fallback={({ reset }) => (
            <button
              onClick={() => {
                setExplode(false);
                reset();
              }}
            >
              Reset widget
            </button>
          )}
        >
          <Bomb explode={explode} />
        </ErrorBoundary>
      );
    }
    render(
      <>
        <Harness />
        <p>Rest of the page</p>
      </>,
    );

    expect(screen.getByText('Rest of the page')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reset widget' }));
    expect(screen.getByText('Widget works')).toBeInTheDocument();
  });

  it('uses the default ErrorState fallback when none is given', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Bomb explode />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('This part of the page crashed');
  });
});
