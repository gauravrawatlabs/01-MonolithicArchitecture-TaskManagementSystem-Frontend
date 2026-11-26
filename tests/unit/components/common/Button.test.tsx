import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pencil } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/common/Button';
import { buttonVariants } from '@/components/common/Button.styles';
import { IconButton } from '@/components/common/IconButton';

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    // Arrange
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Assert
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Cancel</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('is disabled, busy and unclickable while loading (prevents double submits)', async () => {
    const onClick = vi.fn();
    render(
      <Button isLoading onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Save' });
    await userEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('stays enabled when disabled={false} and not loading', () => {
    render(<Button disabled={false}>Go</Button>);
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it('merges a custom className over the variant classes', () => {
    expect(buttonVariants({ variant: 'secondary', className: 'w-full h-12' })).toContain('h-12');
    expect(buttonVariants({ className: 'h-12' })).not.toContain('h-10');
  });
});

describe('IconButton', () => {
  it('exposes its label as the accessible name (an icon alone has none)', async () => {
    const onClick = vi.fn();
    render(<IconButton label="Edit task" icon={<Pencil />} onClick={onClick} />);

    await userEvent.click(screen.getByRole('button', { name: 'Edit task' }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
