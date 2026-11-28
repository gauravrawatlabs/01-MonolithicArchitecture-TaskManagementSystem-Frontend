import { ArrowRight, Ellipsis, Pencil, Trash2 } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/common/DropdownMenu';
import { IconButton } from '@/components/common/IconButton';
import { type Task } from '@/types/api';

import { useStatusChange } from '../hooks/useStatusChange';
import { useTaskPermissions } from '../hooks/useTaskPermissions';
import { allowedMoves, moveLabel } from '../taskRules';

/**
 * Per-row menu: the status moves this user may make (from the workflow), Edit and Delete. Renders nothing
 * when the user can do nothing with the task, so no empty menus.
 */
export function TaskRowActions({
  task,
  onEdit,
  onDelete,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const permissions = useTaskPermissions(task);
  const { move, isPending } = useStatusChange();
  const moves = allowedMoves(task.status, permissions);
  if (moves.length === 0 && !permissions.canEdit && !permissions.canDelete) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          label={`Actions for ${task.title}`}
          icon={<Ellipsis />}
          size="sm"
          disabled={isPending}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {moves.length > 0 ? <DropdownMenuLabel>Status</DropdownMenuLabel> : null}
        {moves.map((status) => (
          <DropdownMenuItem
            key={status}
            onSelect={() => {
              move(task, status);
            }}
          >
            <ArrowRight aria-hidden="true" /> {moveLabel(task.status, status)}
          </DropdownMenuItem>
        ))}
        {moves.length > 0 && (permissions.canEdit || permissions.canDelete) ? (
          <DropdownMenuSeparator />
        ) : null}
        {permissions.canEdit ? (
          <DropdownMenuItem
            onSelect={() => {
              onEdit(task);
            }}
          >
            <Pencil aria-hidden="true" /> Edit
          </DropdownMenuItem>
        ) : null}
        {permissions.canDelete ? (
          <DropdownMenuItem
            variant="danger"
            onSelect={() => {
              onDelete(task);
            }}
          >
            <Trash2 aria-hidden="true" /> Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
