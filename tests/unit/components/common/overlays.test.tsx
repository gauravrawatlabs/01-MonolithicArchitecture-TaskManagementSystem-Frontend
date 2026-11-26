import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/common/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/common/DropdownMenu';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/common/Tabs';

function ModalHarness({ dismissible = true }: { dismissible?: boolean }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Open
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="New project"
        description="Projects group tasks."
        initialFocusRef={inputRef}
        dismissible={dismissible}
      >
        <Input aria-label="Name" ref={inputRef} />
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('opens as a labelled, described dialog and focuses the requested field', async () => {
    render(<ModalHarness />);

    await userEvent.click(screen.getByRole('button', { name: 'Open' }));

    const dialog = await screen.findByRole('dialog', { name: 'New project' });
    expect(dialog).toHaveAccessibleDescription('Projects group tasks.');
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
  });

  it('closes on Escape and returns focus to the button that opened it', async () => {
    render(<ModalHarness />);
    const trigger = screen.getByRole('button', { name: 'Open' });

    await userEvent.click(trigger);
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    // Radix returns focus after the close completes (asynchronously), so wait for it.
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it('closes with the Close button', async () => {
    render(<ModalHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('cannot be dismissed with Escape when dismissible is false (e.g. while saving)', async () => {
    render(<ModalHarness dismissible={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await screen.findByRole('dialog');

    await userEvent.keyboard('{Escape}');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });
});

describe('DropdownMenu', () => {
  it('opens from the keyboard, moves with arrow keys and runs the selected item', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
          <DropdownMenuItem variant="danger" onSelect={onDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    screen.getByRole('button', { name: 'Actions' }).focus();
    await userEvent.keyboard('{Enter}');
    await screen.findByRole('menu');
    await userEvent.keyboard('{ArrowDown}{Enter}');

    expect(onDelete).toHaveBeenCalledOnce();
    expect(onEdit).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });
});

describe('Tabs', () => {
  it('switches panels with the arrow keys', async () => {
    render(
      <Tabs defaultValue="overview">
        <TabsList aria-label="Sections">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Overview panel</TabsContent>
        <TabsContent value="members">Members panel</TabsContent>
      </Tabs>,
    );

    screen.getByRole('tab', { name: 'Overview' }).focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Members' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Members panel');
  });
});
