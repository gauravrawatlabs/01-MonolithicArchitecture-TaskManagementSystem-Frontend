import * as Menu from '@radix-ui/react-dropdown-menu';
import { type ComponentProps } from 'react';

import { cn } from '@/utils/cn';

/**
 * Styled Radix dropdown menu. Radix provides the behaviour: arrow-key navigation, typeahead,
 * Escape to close, focus return, and correct menu/menuitem roles.
 *
 * <DropdownMenu>
 *   <DropdownMenuTrigger asChild><IconButton label="Task actions" icon={<Ellipsis />} /></DropdownMenuTrigger>
 *   <DropdownMenuContent>
 *     <DropdownMenuItem onSelect={edit}>Edit</DropdownMenuItem>
 *     <DropdownMenuItem variant="danger" onSelect={remove}>Delete</DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 */
export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = 'end',
  ...props
}: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-50 min-w-44 rounded-lg border bg-surface p-1 text-foreground shadow-lg',
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

export interface DropdownMenuItemProps extends ComponentProps<typeof Menu.Item> {
  variant?: 'default' | 'danger';
}

export function DropdownMenuItem({
  variant = 'default',
  className,
  ...props
}: DropdownMenuItemProps) {
  return (
    <Menu.Item
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none select-none',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4',
        variant === 'danger'
          ? 'text-danger data-[highlighted]:bg-danger-soft'
          : 'data-[highlighted]:bg-surface-muted',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return (
    <Menu.Label
      className={cn('px-2.5 py-1.5 text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn('my-1 h-px bg-border', className)} {...props} />;
}
