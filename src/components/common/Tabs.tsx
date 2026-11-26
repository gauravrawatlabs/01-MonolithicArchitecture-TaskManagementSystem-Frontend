import * as RadixTabs from '@radix-ui/react-tabs';
import { type ComponentProps } from 'react';

import { cn } from '@/utils/cn';

/**
 * Styled Radix tabs: tablist/tab/tabpanel roles, arrow-key navigation between tabs,
 * Home/End support. For tabs that should change the URL (e.g. project details), Phase 5 uses
 * links styled the same way instead.
 */
export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn('flex items-center gap-1 overflow-x-auto border-b', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        '-mb-px inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors',
        'hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof RadixTabs.Content>) {
  return (
    <RadixTabs.Content className={cn('pt-4 focus-visible:outline-none', className)} {...props} />
  );
}
