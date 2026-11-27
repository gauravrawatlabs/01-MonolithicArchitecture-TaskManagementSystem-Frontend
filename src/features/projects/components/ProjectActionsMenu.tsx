import { Ellipsis, Pencil, Trash2 } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/common/DropdownMenu';
import { IconButton } from '@/components/common/IconButton';

export interface ProjectActionsMenuProps {
  projectName: string;
  onEdit: () => void;
  onDelete: () => void;
}

/** Edit / Delete for owners and Admins. */
export function ProjectActionsMenu({ projectName, onEdit, onDelete }: ProjectActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label={`Actions for ${projectName}`} icon={<Ellipsis />} size="sm" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil aria-hidden="true" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem variant="danger" onSelect={onDelete}>
          <Trash2 aria-hidden="true" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
