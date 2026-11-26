import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useToast } from '@/contexts/toast';

import { renderWithProviders } from '../../utils/renderWithProviders';

function ToastButtons() {
  const toast = useToast();
  return (
    <>
      <button
        onClick={() => {
          toast.success('Task created', 'Added to Website Redesign.');
        }}
      >
        Success
      </button>
      <button
        onClick={() => {
          toast.error('Could not save', 'Conflict.', 'CORR-1');
        }}
      >
        Error
      </button>
    </>
  );
}

describe('ToastProvider', () => {
  it('shows a success toast with title and description', async () => {
    const { user } = renderWithProviders(<ToastButtons />);

    await user.click(screen.getByRole('button', { name: 'Success' }));

    const region = screen.getByRole('region', { name: /notifications/i });
    expect(region).toHaveTextContent('Task created');
    expect(region).toHaveTextContent('Added to Website Redesign.');
  });

  it('shows the correlation id on error toasts and can be dismissed', async () => {
    const { user } = renderWithProviders(<ToastButtons />);

    await user.click(screen.getByRole('button', { name: 'Error' }));
    expect(screen.getByText('CORR-1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    await waitFor(() => {
      expect(screen.queryByText('Could not save')).not.toBeInTheDocument();
    });
  });

  it('keeps at most 4 toasts on screen', async () => {
    const { user } = renderWithProviders(<ToastButtons />);

    for (let i = 0; i < 6; i++) {
      await user.click(screen.getByRole('button', { name: 'Success' }));
    }

    expect(screen.getAllByText('Task created')).toHaveLength(4);
  });
});
